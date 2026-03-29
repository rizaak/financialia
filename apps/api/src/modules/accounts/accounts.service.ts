import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  AccountType,
  InstallmentPlanStatus,
  Prisma,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { CreateAccountDto } from './dto/create-account.dto';
import { addUtcDays, getPreviousClosingEnd, startOfUtcDay } from './credit-card-period.utils';
import { FinancialService } from './financial.service';

/** Cliente de transacción Prisma con delegados de modelo (para $transaction). */
export type PrismaTx = Pick<
  PrismaService,
  | 'account'
  | 'user'
  | 'transaction'
  | 'tieredInvestment'
  | 'investmentTransaction'
  | 'category'
  | 'installmentPlan'
>;

/** Resumen para estados de cuenta proyectados (MSI / diferidos). */
export type StatementPaymentBreakdown = {
  /** Gastos sin plan desde el último corte hasta el fin del periodo analizado. */
  consumosDelMes: string;
  /** Suma de `monthlyAmount` de planes ACTIVE en esa tarjeta. */
  mensualidadesActivas: string;
  /** (1) + (2): pago para no generar intereses. */
  pagoParaNoGenerarIntereses: string;
  currency: string;
  periodFrom: string;
  periodThrough: string;
};

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financial: FinancialService,
  ) {}

  /**
   * Garantiza al menos una cuenta por usuario (nuevos registros).
   * Usa bloqueo en `users` para evitar carreras: varias peticiones en paralelo al
   * primer login podían leer count=0 y crear varias "Cuenta principal".
   */
  async ensurePrimaryAccount(userId: string, currency = 'MXN'): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SELECT 1 FROM users WHERE id = $1::uuid FOR UPDATE',
        userId,
      );
      const n = await tx.account.count({ where: { userId } });
      if (n > 0) {
        return;
      }
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { defaultCurrency: true },
      });
      const cur = (user?.defaultCurrency ?? currency).toUpperCase().slice(0, 3);
      await tx.account.create({
        data: {
          userId,
          name: 'Cuenta principal',
          type: AccountType.CASH,
          status: AccountStatus.ACTIVE,
          currency: cur,
          balance: new Prisma.Decimal(0),
        },
      });
    });
  }

  async listAccounts(userId: string, includeArchived = false) {
    return this.prisma.account.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { status: AccountStatus.ACTIVE }),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { creditCard: true },
    });
  }

  /**
   * Desglose por tipo (solo cuentas en la moneda preferida del usuario) + total invertido en tramos.
   */
  async getSummary(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const cur = user.defaultCurrency.toUpperCase().slice(0, 3);

    const accounts = await this.prisma.account.findMany({
      where: { userId, currency: cur, status: AccountStatus.ACTIVE },
      include: { creditCard: true },
    });

    let totalBanks = new Prisma.Decimal(0);
    let totalWallets = new Prisma.Decimal(0);
    let totalCash = new Prisma.Decimal(0);
    let totalCreditDebt = new Prisma.Decimal(0);

    for (const a of accounts) {
      const b = new Prisma.Decimal(a.balance);
      if (a.type === AccountType.BANK) {
        totalBanks = totalBanks.plus(b);
      } else if (a.type === AccountType.WALLET) {
        totalWallets = totalWallets.plus(b);
      } else if (a.type === AccountType.CASH) {
        totalCash = totalCash.plus(b);
      } else if (a.type === AccountType.CREDIT_CARD) {
        totalCreditDebt = totalCreditDebt.plus(b);
      }
    }

    const totalLiquid = totalBanks.plus(totalWallets).plus(totalCash);

    const invAgg = await this.prisma.tieredInvestment.aggregate({
      where: { userId, currency: cur },
      _sum: { principal: true },
    });
    const totalInvestedTiered = invAgg._sum.principal ?? new Prisma.Decimal(0);

    const totalNetBalance = totalLiquid.plus(totalInvestedTiered).minus(totalCreditDebt);

    const banksBreakdown = accounts
      .filter((a) => a.type === AccountType.BANK)
      .map((a) => ({
        id: a.id,
        name: a.name,
        balance: new Prisma.Decimal(a.balance).toString(),
      }));

    const [fcf, realLiquidityRecurring] = await Promise.all([
      this.financial.getFreeCashFlow(userId),
      this.financial.getRealLiquidityRecurringKpi(userId),
    ]);

    return {
      defaultCurrency: cur,
      totalBanks: totalBanks.toString(),
      totalWallets: totalWallets.toString(),
      totalCash: totalCash.toString(),
      totalLiquid: totalLiquid.toString(),
      totalInvestedTiered: totalInvestedTiered.toString(),
      totalCreditDebt: totalCreditDebt.toString(),
      totalNetBalance: totalNetBalance.toString(),
      banksBreakdown,
      accounts,
      freeCashFlow: fcf.freeCashFlow,
      freeCashFlowBreakdown: {
        bankBalance: fcf.bankBalance,
        msiThisMonth: fcf.msiThisMonth,
        subscriptionsRemaining: fcf.subscriptionsRemaining,
        housingUtilitiesPending: fcf.housingUtilitiesPending,
        recurringEventsExpensePending: fcf.recurringEventsExpensePending,
      },
      /** Saldo BANK − gastos `RecurringEvent` pendientes del mes (liquidez real recurrente). */
      realLiquidityRecurring,
    };
  }

  async createAccount(userId: string, dto: CreateAccountDto) {
    const cur = (dto.currency ?? 'MXN').toUpperCase().slice(0, 3);

    if (dto.type === AccountType.CREDIT_CARD) {
      if (dto.creditLimit == null) {
        throw new BadRequestException(
          'Las tarjetas de crédito requieren creditLimit (límite de crédito).',
        );
      }
      if (
        dto.closingDay == null ||
        dto.paymentDueDaysAfterClosing == null ||
        dto.annualInterestRatePct == null
      ) {
        throw new BadRequestException(
          'Las tarjetas de crédito requieren closingDay, paymentDueDaysAfterClosing y annualInterestRatePct.',
        );
      }
      return this.prisma.account.create({
        data: {
          userId,
          name: dto.name.trim(),
          type: AccountType.CREDIT_CARD,
          status: AccountStatus.ACTIVE,
          currency: cur,
          balance: new Prisma.Decimal(0),
          creditLimit: new Prisma.Decimal(dto.creditLimit),
          creditCard: {
            create: {
              closingDay: dto.closingDay,
              paymentDueDaysAfterClosing: dto.paymentDueDaysAfterClosing,
              annualInterestRatePct: new Prisma.Decimal(dto.annualInterestRatePct),
            },
          },
        },
        include: { creditCard: true },
      });
    }

    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        status: AccountStatus.ACTIVE,
        currency: cur,
        balance: new Prisma.Decimal(0),
      },
    });
  }

  async assertAccountForUser(accountId: string, userId: string) {
    const a = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!a) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return a;
  }

  /** Cuentas activas para movimientos, transferencias e inversiones. */
  async assertActiveAccountForUser(accountId: string, userId: string) {
    const a = await this.assertAccountForUser(accountId, userId);
    if (a.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('La cuenta está archivada.');
    }
    return a;
  }

  async updateStatus(userId: string, accountId: string, status: AccountStatus) {
    await this.assertAccountForUser(accountId, userId);
    return this.prisma.account.update({
      where: { id: accountId },
      data: { status },
      include: { creditCard: true },
    });
  }

  /**
   * Categoría interna para ajustes de saldo (creación perezosa si el usuario es antiguo).
   */
  async ensureAdjustmentCategoryId(userId: string): Promise<string> {
    const slug = 'ajuste-saldo';
    const found = await this.prisma.category.findFirst({
      where: { userId, slug, kind: TransactionType.ADJUSTMENT },
    });
    if (found) {
      return found.id;
    }
    const c = await this.prisma.category.create({
      data: {
        userId,
        slug,
        name: 'Ajuste de saldo',
        kind: TransactionType.ADJUSTMENT,
        color: '#64748b',
      },
    });
    return c.id;
  }

  /**
   * Reconcilia el saldo de la cuenta con el valor real (banco/cartera).
   * `diferencia = actualBalance - currentBalance`; si ≠ 0, crea ADJUSTMENT y actualiza el saldo.
   * Tarjeta: `balance` es la deuda; indica la deuda real que ves en el banco.
   */
  async reconcileAccount(userId: string, accountId: string, actualBalance: number) {
    const account = await this.assertActiveAccountForUser(accountId, userId);
    const currentBalance = new Prisma.Decimal(account.balance);
    const actual = new Prisma.Decimal(actualBalance);
    const difference = actual.minus(currentBalance);
    if (difference.eq(0)) {
      return { skipped: true as const, transaction: null };
    }

    const categoryId = await this.ensureAdjustmentCategoryId(userId);
    const currency = account.currency.toUpperCase().slice(0, 3);
    const occurredAt = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      await this.applyAdjustmentBalanceInTx(tx, accountId, userId, difference);

      return tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId,
          type: TransactionType.ADJUSTMENT,
          amount: difference.abs(),
          currency,
          concept: 'Ajuste de sincronización manual',
          notes: `Saldo registrado ${currentBalance.toString()} → ${actual.toString()}`,
          occurredAt,
          source: TransactionSource.MANUAL,
          metadata: { signedDelta: difference.toString() },
        },
        include: {
          category: { select: { id: true, name: true, slug: true, color: true, kind: true } },
          account: { select: { id: true, name: true, currency: true } },
        },
      });
    });

    return { skipped: false as const, transaction: created };
  }

  /** @deprecated Usa `reconcileAccount`; se mantiene por compatibilidad con clientes que llaman `/sync-balance`. */
  async syncBalance(userId: string, accountId: string, actualBalance: number) {
    return this.reconcileAccount(userId, accountId, actualBalance);
  }

  /**
   * Aplica un delta firmado al saldo (activos: + sube saldo; TC: + sube deuda).
   */
  async applyAdjustmentBalanceInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    signedDelta: Prisma.Decimal,
  ): Promise<void> {
    if (signedDelta.eq(0)) {
      throw new BadRequestException('El ajuste no puede ser cero.');
    }
    const acc = await tx.account.findFirst({
      where: { id: accountId, userId, status: AccountStatus.ACTIVE },
    });
    if (!acc) {
      throw new BadRequestException('Cuenta no válida o archivada.');
    }

    if (acc.type === AccountType.CREDIT_CARD) {
      if (signedDelta.gt(0)) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: signedDelta } },
        });
        return;
      }
      const abs = signedDelta.abs();
      const r = await tx.account.updateMany({
        where: { id: accountId, userId, balance: { gte: abs } },
        data: { balance: { decrement: abs } },
      });
      if (r.count === 0) {
        throw new BadRequestException('El ajuste no puede dejar la deuda por debajo de cero.');
      }
      return;
    }

    if (signedDelta.gt(0)) {
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: signedDelta } },
      });
      return;
    }
    const abs = signedDelta.abs();
    const r = await tx.account.updateMany({
      where: { id: accountId, userId, balance: { gte: abs } },
      data: { balance: { decrement: abs } },
    });
    if (r.count === 0) {
      throw new BadRequestException('El ajuste no puede dejar el saldo negativo.');
    }
  }

  /** Deshace el efecto en saldo de una transacción existente (previo a editar o borrar). */
  async reverseTransactionBalanceInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    type: TransactionType,
    amount: Prisma.Decimal,
    metadata: Prisma.JsonValue | null,
  ): Promise<void> {
    if (type === TransactionType.ADJUSTMENT) {
      let signed = new Prisma.Decimal(0);
      if (metadata && typeof metadata === 'object' && metadata !== null && 'signedDelta' in metadata) {
        const raw = (metadata as Record<string, unknown>).signedDelta;
        signed = new Prisma.Decimal(String(raw));
      }
      await this.applyAdjustmentBalanceInTx(tx, accountId, userId, signed.negated());
      return;
    }
    const opposite =
      type === TransactionType.EXPENSE ? TransactionType.INCOME : TransactionType.EXPENSE;
    await this.applyTransactionBalanceInTx(tx, accountId, userId, opposite, amount);
  }

  /**
   * Compra en tarjeta: la deuda proyectada no puede superar el `creditLimit` (si existe).
   * `purchaseAmount` es el cargo que se va a sumar al saldo deudor.
   */
  assertCreditPurchaseWithinLimit(
    account: { type: AccountType; balance: Prisma.Decimal; creditLimit: Prisma.Decimal | null },
    purchaseAmount: Prisma.Decimal,
  ): void {
    if (account.type !== AccountType.CREDIT_CARD) {
      return;
    }
    if (account.creditLimit == null) {
      return;
    }
    const limit = new Prisma.Decimal(account.creditLimit);
    const debt = new Prisma.Decimal(account.balance);
    if (debt.plus(purchaseAmount).gt(limit)) {
      throw new BadRequestException(
        'El cargo excede el límite de crédito disponible en la tarjeta.',
      );
    }
  }

  /**
   * Consumos del mes (sin MSI) + mensualidades activas = pago para no generar intereses.
   * Sin `range`, el periodo va desde el día siguiente al último corte hasta `through` (por defecto hoy).
   */
  async getStatementSummary(
    userId: string,
    accountId: string,
    range?: { periodStart: Date; through: Date },
  ): Promise<StatementPaymentBreakdown> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, type: AccountType.CREDIT_CARD },
      include: { creditCard: true },
    });
    if (!account) {
      this.logger.warn(
        `[getStatementSummary] Cuenta no encontrada o no es CREDIT_CARD (userId=${userId}, accountId=${accountId})`,
      );
      throw new NotFoundException('Tarjeta de crédito no encontrada o sin perfil.');
    }
    if (!account.creditCard) {
      this.logger.warn(
        `[getStatementSummary] Cuenta sin fila CreditCard (userId=${userId}, accountId=${accountId})`,
      );
      throw new NotFoundException('Tarjeta de crédito no encontrada o sin perfil.');
    }

    const cc = account.creditCard;
    const now = new Date();
    let periodStart: Date;
    let through: Date;
    if (range?.periodStart != null && range?.through != null) {
      periodStart = range.periodStart;
      through = range.through;
    } else {
      const ref = range?.through ?? now;
      const prevClosing = getPreviousClosingEnd(cc, ref);
      periodStart = startOfUtcDay(addUtcDays(prevClosing, 1));
      through = ref;
    }

    const [directAgg, plansAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          accountId,
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: { gte: periodStart, lte: through },
          installmentPlan: { is: null },
        },
        _sum: { amount: true },
      }),
      this.prisma.installmentPlan.aggregate({
        where: {
          accountId,
          status: InstallmentPlanStatus.ACTIVE,
        },
        _sum: { monthlyAmount: true },
      }),
    ]);
    const direct = directAgg._sum.amount ?? new Prisma.Decimal(0);
    const installments = plansAgg._sum.monthlyAmount ?? new Prisma.Decimal(0);

    const total = direct.plus(installments);
    const cur = account.currency.toUpperCase().slice(0, 3);

    return {
      consumosDelMes: direct.toString(),
      mensualidadesActivas: installments.toString(),
      pagoParaNoGenerarIntereses: total.toString(),
      currency: cur,
      periodFrom: periodStart.toISOString(),
      periodThrough: through.toISOString(),
    };
  }

  /** Alias retrocompatible con integraciones que usan `calculateStatement`. */
  calculateStatement(
    userId: string,
    accountId: string,
    range?: { periodStart: Date; through: Date },
  ): Promise<StatementPaymentBreakdown> {
    return this.getStatementSummary(userId, accountId, range);
  }

  async debitInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    const r = await tx.account.updateMany({
      where: { id: accountId, userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (r.count === 0) {
      throw new BadRequestException('Saldo insuficiente en la cuenta seleccionada.');
    }
  }

  async creditInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    const r = await tx.account.updateMany({
      where: { id: accountId, userId },
      data: { balance: { increment: amount } },
    });
    if (r.count === 0) {
      throw new BadRequestException('Cuenta destino no válida.');
    }
  }

  /**
   * Tarjeta de crédito: `balance` es la deuda. Gasto incrementa deuda; ingreso (abono) la reduce.
   * Resto de cuentas: gasto decrementa saldo; ingreso incrementa.
   */
  async applyTransactionBalanceInTx(
    tx: PrismaTx,
    accountId: string,
    userId: string,
    movementType: TransactionType,
    amount: Prisma.Decimal,
  ): Promise<void> {
    if (movementType === TransactionType.ADJUSTMENT) {
      throw new BadRequestException('Los ajustes usan otro flujo interno.');
    }
    const acc = await tx.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!acc) {
      throw new BadRequestException('Cuenta no válida.');
    }

    if (acc.type === AccountType.CREDIT_CARD) {
      if (movementType === TransactionType.EXPENSE) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: amount } },
        });
        return;
      }
      const r = await tx.account.updateMany({
        where: { id: accountId, userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (r.count === 0) {
        throw new BadRequestException(
          'El abono no puede ser mayor que la deuda registrada en la tarjeta.',
        );
      }
      return;
    }

    if (movementType === TransactionType.EXPENSE) {
      await this.debitInTx(tx, accountId, userId, amount);
    } else {
      await this.creditInTx(tx, accountId, userId, amount);
    }
  }
}
