import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountStatus,
  AccountType,
  InstallmentPlanStatus,
  Prisma,
  type Transaction,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { TransactionCreatedEvent } from '@common/events/transaction-created.event';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService } from './accounts.service';
import type { CreateCashAdvanceInstallmentDto } from './dto/create-cash-advance-installment.dto';
import {
  CashAdvanceOperationKindDto,
  CashAdvanceRegistrationModeDto,
} from './dto/create-cash-advance-installment.dto';
import type { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import type { PatchInstallmentPlanDto } from './dto/patch-installment-plan.dto';

/** Cuota nivelada (capital + interés) con tasa anual nominal y pagos mensuales. */
export function computeAmortizingMonthlyPayment(
  principal: number,
  annualPercent: number,
  numPayments: number,
): number {
  if (principal <= 0 || numPayments < 1) return 0;
  const r = annualPercent / 100 / 12;
  if (r < 1e-15) return principal / numPayments;
  const pow = Math.pow(1 + r, numPayments);
  return (principal * r * pow) / (pow - 1);
}

type CashAdvanceMetaOut = {
  kind: CashAdvanceOperationKindDto;
  withdrawnAmount: string;
  dispositionFee: string;
  dailyRatePct: string | null;
  cashIncomeTransactionId: string | null;
  annualPctUsedForPayment: string;
  debtOnly: boolean;
};

function readCashAdvanceFromMetadata(metadata: unknown): CashAdvanceMetaOut | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  const ca = m.cashAdvance;
  if (!ca || typeof ca !== 'object' || Array.isArray(ca)) return null;
  const c = ca as Record<string, unknown>;
  const kind = c.kind;
  if (kind !== CashAdvanceOperationKindDto.IMMEDIATE_CASH_FIXED && kind !== CashAdvanceOperationKindDto.ATM_WITHDRAWAL) {
    return null;
  }
  const withdrawnAmount = c.withdrawnAmount;
  const dispositionFee = c.dispositionFee;
  const cashIncomeTransactionId = c.cashIncomeTransactionId;
  const annualPctUsedForPayment = c.annualPctUsedForPayment;
  const debtOnly = c.debtOnly === true;
  if (typeof withdrawnAmount !== 'string') return null;
  if (!debtOnly) {
    if (typeof cashIncomeTransactionId !== 'string' || cashIncomeTransactionId.length === 0) return null;
  }
  return {
    kind,
    withdrawnAmount,
    dispositionFee: typeof dispositionFee === 'string' ? dispositionFee : '0',
    dailyRatePct: typeof c.dailyRatePct === 'string' ? c.dailyRatePct : null,
    cashIncomeTransactionId:
      typeof cashIncomeTransactionId === 'string' && cashIncomeTransactionId.length > 0
        ? cashIncomeTransactionId
        : null,
    annualPctUsedForPayment: typeof annualPctUsedForPayment === 'string' ? annualPctUsedForPayment : '0',
    debtOnly,
  };
}

type PlanWithTxMeta = {
  id: string;
  accountId: string;
  totalAmount: Prisma.Decimal;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: Prisma.Decimal;
  startDate: Date;
  interestRate: Prisma.Decimal;
  status: InstallmentPlanStatus;
  transactionId: string;
  description: string;
  transaction: {
    concept: string | null;
    metadata: Prisma.JsonValue | null;
  } | null;
};

function cashAdvancePublicFields(metadata: Prisma.JsonValue | null | undefined) {
  const cashAdvance = readCashAdvanceFromMetadata(metadata ?? null);
  return {
    cashAdvanceKind: cashAdvance?.kind ?? null,
    withdrawnAmount: cashAdvance?.withdrawnAmount ?? null,
    dispositionFee: cashAdvance?.dispositionFee ?? null,
    dailyRatePct: cashAdvance?.dailyRatePct ?? null,
    cashAdvanceDebtOnly: cashAdvance?.debtOnly ?? false,
  };
}

function mapPlanListRowForAccount(p: PlanWithTxMeta, currency: string) {
  const remainingCount = p.totalInstallments - p.currentInstallment + 1;
  const remainingToPay = new Prisma.Decimal(p.monthlyAmount).times(remainingCount);
  const label = p.description?.trim() || p.transaction?.concept?.trim() || 'Compra a meses';
  const interestRateNum = Number(p.interestRate);
  const cur = currency.toUpperCase().slice(0, 3);
  return {
    id: p.id,
    label,
    totalAmount: p.totalAmount.toString(),
    totalInstallments: p.totalInstallments,
    currentInstallment: p.currentInstallment,
    monthlyAmount: p.monthlyAmount.toString(),
    remainingToPay: remainingToPay.toString(),
    startDate: p.startDate.toISOString(),
    interestRate: p.interestRate.toString(),
    isInterestFree: interestRateNum === 0,
    status: p.status,
    currency: cur,
    transactionId: p.transactionId,
    ...cashAdvancePublicFields(p.transaction?.metadata ?? null),
  };
}

function mapPlanListRowAllCards(
  p: PlanWithTxMeta & { account: { name: string; currency: string } },
) {
  const remainingCount = p.totalInstallments - p.currentInstallment + 1;
  const remainingToPay = new Prisma.Decimal(p.monthlyAmount).times(remainingCount);
  const label = p.description?.trim() || p.transaction?.concept?.trim() || 'Compra a meses';
  const interestRateNum = Number(p.interestRate);
  const cur = p.account.currency.toUpperCase().slice(0, 3);
  return {
    id: p.id,
    accountId: p.accountId,
    accountName: p.account.name,
    label,
    totalAmount: p.totalAmount.toString(),
    totalInstallments: p.totalInstallments,
    currentInstallment: p.currentInstallment,
    monthlyAmount: p.monthlyAmount.toString(),
    remainingInstallments: remainingCount,
    remainingToPay: remainingToPay.toString(),
    startDate: p.startDate.toISOString(),
    interestRate: p.interestRate.toString(),
    isInterestFree: interestRateNum === 0,
    status: p.status,
    currency: cur,
    transactionId: p.transactionId,
    ...cashAdvancePublicFields(p.transaction?.metadata ?? null),
  };
}

@Injectable()
export class InstallmentPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, accountId: string, dto: CreateInstallmentPlanDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, type: AccountType.CREDIT_CARD, status: AccountStatus.ACTIVE },
    });
    if (!account) {
      throw new NotFoundException('Tarjeta de crédito no encontrada.');
    }

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId, isArchived: false },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    if (category.kind !== TransactionType.EXPENSE) {
      throw new BadRequestException('La categoría debe ser de tipo gasto.');
    }

    const total = new Prisma.Decimal(dto.totalAmount);
    this.accounts.assertCreditPurchaseWithinLimit(account, total);

    const n = dto.totalInstallments;
    const monthly = total.dividedBy(n);
    const interestRate = dto.isInterestFree
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(dto.interestRate ?? 0);

    const currency = account.currency.toUpperCase().slice(0, 3);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const startDate = dto.startDate ? new Date(dto.startDate) : occurredAt;
    const description =
      dto.description?.trim() || dto.concept.trim() || 'Compra a meses';

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId: dto.categoryId,
          type: TransactionType.EXPENSE,
          amount: total,
          currency,
          concept: dto.concept.trim(),
          notes: dto.notes?.trim() || null,
          occurredAt,
          source: dto.source ?? TransactionSource.MANUAL,
          metadata: {
            monthlyExpenseImpact: monthly.toString(),
          },
        },
      });

      await this.accounts.applyTransactionBalanceInTx(
        tx,
        accountId,
        userId,
        TransactionType.EXPENSE,
        total,
      );

      const plan = await tx.installmentPlan.create({
        data: {
          accountId,
          transactionId: transaction.id,
          description,
          totalAmount: total,
          totalInstallments: n,
          currentInstallment: 1,
          monthlyAmount: monthly,
          interestRate,
          status: InstallmentPlanStatus.ACTIVE,
          startDate,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            installmentPlanId: plan.id,
            monthlyExpenseImpact: monthly.toString(),
          },
        },
      });

      return { plan, transaction };
    });

    this.eventEmitter.emit(
      'transaction.created',
      new TransactionCreatedEvent(
        userId,
        created.transaction.id,
        created.transaction.accountId,
        created.transaction.type,
        created.transaction.amount.toString(),
      ),
    );

    return created;
  }

  /**
   * Disposición de efectivo / retiro en cajero: carga la tarjeta (monto retirado + comisión),
   * acredita efectivo en cuenta líquida y crea plan de mensualidades con cuota nivelada.
   */
  async createCashAdvanceInstallment(userId: string, creditAccountId: string, dto: CreateCashAdvanceInstallmentDto) {
    const inject =
      (dto.registrationMode ?? CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT) ===
      CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT;

    const card = await this.prisma.account.findFirst({
      where: {
        id: creditAccountId,
        userId,
        type: AccountType.CREDIT_CARD,
        status: AccountStatus.ACTIVE,
      },
    });
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada.');
    }

    const cardCur = card.currency.toUpperCase().slice(0, 3);

    let cashAcc: { id: string; currency: string } | null = null;
    if (inject) {
      if (!dto.cashAccountId || !dto.incomeCategoryId) {
        throw new BadRequestException('Indica cuenta de efectivo y categoría de ingreso para inyectar el monto.');
      }
      const acc = await this.prisma.account.findFirst({
        where: {
          id: dto.cashAccountId,
          userId,
          status: AccountStatus.ACTIVE,
          type: { in: [AccountType.BANK, AccountType.WALLET, AccountType.CASH] },
        },
      });
      if (!acc) {
        throw new NotFoundException('Cuenta de efectivo no encontrada o no es banco/cartera/efectivo.');
      }
      const cashCur = acc.currency.toUpperCase().slice(0, 3);
      if (cardCur !== cashCur) {
        throw new BadRequestException('La tarjeta y la cuenta de efectivo deben usar la misma moneda.');
      }
      cashAcc = { id: acc.id, currency: acc.currency };
    }

    const expCat = await this.prisma.category.findFirst({
      where: { id: dto.expenseCategoryId, userId, isArchived: false },
    });
    if (!expCat || expCat.kind !== TransactionType.EXPENSE) {
      throw new NotFoundException('Categoría de gasto no válida.');
    }

    if (inject) {
      const incCat = await this.prisma.category.findFirst({
        where: { id: dto.incomeCategoryId!, userId, isArchived: false },
      });
      if (!incCat || incCat.kind !== TransactionType.INCOME) {
        throw new NotFoundException('Categoría de ingreso no válida.');
      }
    }

    let annualForPayment: number;
    if (dto.operationKind === CashAdvanceOperationKindDto.ATM_WITHDRAWAL) {
      if (dto.dailyRatePct != null && dto.dailyRatePct > 0) {
        annualForPayment = dto.dailyRatePct * 365;
      } else if (dto.interestAnnualPct != null) {
        annualForPayment = dto.interestAnnualPct;
      } else {
        throw new BadRequestException('Indica tasa diaria o tasa anual para el retiro en cajero.');
      }
    } else {
      if (dto.interestAnnualPct == null) {
        throw new BadRequestException('Indica la tasa de interés anual pactada.');
      }
      annualForPayment = dto.interestAnnualPct;
    }

    const withdrawn = new Prisma.Decimal(dto.withdrawnAmount);
    const fee = new Prisma.Decimal(dto.dispositionFee ?? 0);
    const totalCharged = withdrawn.plus(fee);
    this.accounts.assertCreditPurchaseWithinLimit(card, totalCharged);

    const n = dto.totalInstallments;
    const startInst = dto.initialInstallment ?? 1;
    if (startInst < 1 || startInst > n) {
      throw new BadRequestException('La mensualidad inicial debe estar entre 1 y el número total de meses.');
    }

    const monthlyNum = computeAmortizingMonthlyPayment(Number(totalCharged), annualForPayment, n);
    const monthly = new Prisma.Decimal(monthlyNum.toFixed(4));
    const interestRateStored = new Prisma.Decimal(annualForPayment);

    const conceptBase =
      dto.concept?.trim() ||
      (dto.operationKind === CashAdvanceOperationKindDto.ATM_WITHDRAWAL
        ? 'Retiro de cajero (tarjeta)'
        : 'Efectivo inmediato (tarjeta)');
    const occurredAt = new Date();
    const currency = cardCur;

    const cashAdvancePayloadBase = {
      kind: dto.operationKind,
      withdrawnAmount: withdrawn.toString(),
      dispositionFee: fee.toString(),
      dailyRatePct:
        dto.operationKind === CashAdvanceOperationKindDto.ATM_WITHDRAWAL && dto.dailyRatePct != null
          ? String(dto.dailyRatePct)
          : null,
      annualPctUsedForPayment: String(annualForPayment),
      debtOnly: !inject,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      const expenseTx = await tx.transaction.create({
        data: {
          userId,
          accountId: creditAccountId,
          categoryId: dto.expenseCategoryId,
          type: TransactionType.EXPENSE,
          amount: totalCharged,
          currency,
          concept: conceptBase,
          notes: dto.notes?.trim() || null,
          occurredAt,
          source: dto.source ?? TransactionSource.MANUAL,
          metadata: {
            monthlyExpenseImpact: monthly.toString(),
            cashAdvance: {
              ...cashAdvancePayloadBase,
              cashIncomeTransactionId: '',
            },
          },
        },
      });

      await this.accounts.applyTransactionBalanceInTx(
        tx,
        creditAccountId,
        userId,
        TransactionType.EXPENSE,
        totalCharged,
      );

      let incomeTx: Transaction | null = null;
      if (inject && cashAcc && dto.incomeCategoryId) {
        incomeTx = await tx.transaction.create({
          data: {
            userId,
            accountId: cashAcc.id,
            categoryId: dto.incomeCategoryId,
            type: TransactionType.INCOME,
            amount: withdrawn,
            currency,
            concept: `Efectivo recibido: ${conceptBase}`,
            notes: dto.notes?.trim() || null,
            occurredAt,
            source: dto.source ?? TransactionSource.MANUAL,
            metadata: {
              linkedCashAdvanceExpenseId: expenseTx.id,
            },
          },
        });

        await this.accounts.applyTransactionBalanceInTx(
          tx,
          cashAcc.id,
          userId,
          TransactionType.INCOME,
          withdrawn,
        );
      }

      const plan = await tx.installmentPlan.create({
        data: {
          accountId: creditAccountId,
          transactionId: expenseTx.id,
          description: conceptBase,
          totalAmount: totalCharged,
          totalInstallments: n,
          currentInstallment: startInst,
          monthlyAmount: monthly,
          interestRate: interestRateStored,
          status: InstallmentPlanStatus.ACTIVE,
          startDate: occurredAt,
        },
      });

      const metaExpense = {
        installmentPlanId: plan.id,
        monthlyExpenseImpact: monthly.toString(),
        cashAdvance: {
          ...cashAdvancePayloadBase,
          cashIncomeTransactionId: incomeTx?.id ?? '',
        },
      };

      await tx.transaction.update({
        where: { id: expenseTx.id },
        data: { metadata: metaExpense },
      });

      return { plan, expenseTx, incomeTx };
    });

    this.eventEmitter.emit(
      'transaction.created',
      new TransactionCreatedEvent(
        userId,
        created.expenseTx.id,
        created.expenseTx.accountId,
        created.expenseTx.type,
        created.expenseTx.amount.toString(),
      ),
    );
    if (created.incomeTx) {
      this.eventEmitter.emit(
        'transaction.created',
        new TransactionCreatedEvent(
          userId,
          created.incomeTx.id,
          created.incomeTx.accountId,
          created.incomeTx.type,
          created.incomeTx.amount.toString(),
        ),
      );
    }

    return {
      planId: created.plan.id,
      expenseTransactionId: created.expenseTx.id,
      incomeTransactionId: created.incomeTx?.id ?? null,
      registrationMode: inject
        ? CashAdvanceRegistrationModeDto.INJECT_TO_ACCOUNT
        : CashAdvanceRegistrationModeDto.DEBT_ONLY,
      totalCharged: totalCharged.toString(),
      withdrawnAmount: withdrawn.toString(),
      monthlyPayment: monthly.toString(),
      totalInstallments: n,
      initialInstallment: startInst,
      currency,
    };
  }

  /** Crea el plan MSI en la misma transacción Prisma que el movimiento (hook transacciones). */
  async createPlanForPurchaseInTx(
    tx: Prisma.TransactionClient,
    params: {
      accountId: string;
      transactionId: string;
      description: string;
      totalAmount: Prisma.Decimal;
      totalInstallments: number;
      monthlyAmount: Prisma.Decimal;
      startDate: Date;
      interestRate: Prisma.Decimal;
    },
  ) {
    return tx.installmentPlan.create({
      data: {
        accountId: params.accountId,
        transactionId: params.transactionId,
        description: params.description,
        totalAmount: params.totalAmount,
        totalInstallments: params.totalInstallments,
        currentInstallment: 1,
        monthlyAmount: params.monthlyAmount,
        startDate: params.startDate,
        interestRate: params.interestRate,
        status: InstallmentPlanStatus.ACTIVE,
      },
    });
  }

  /** Planes activos (MSI / diferidos) para una tarjeta. */
  async listForAccount(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, type: AccountType.CREDIT_CARD },
    });
    if (!account) {
      throw new NotFoundException('Tarjeta de crédito no encontrada.');
    }

    const plans = await this.prisma.installmentPlan.findMany({
      where: {
        accountId,
        status: InstallmentPlanStatus.ACTIVE,
        account: { userId },
      },
      include: {
        transaction: { select: { id: true, concept: true, occurredAt: true, metadata: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((p) => mapPlanListRowForAccount(p, account.currency));
  }

  /** Todos los MSI / diferidos activos del usuario (todas las tarjetas). */
  async listAllActiveForUser(userId: string) {
    const plans = await this.prisma.installmentPlan.findMany({
      where: {
        status: InstallmentPlanStatus.ACTIVE,
        account: { userId, type: AccountType.CREDIT_CARD },
      },
      include: {
        account: { select: { id: true, name: true, currency: true } },
        transaction: { select: { id: true, concept: true, occurredAt: true, metadata: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((p) => mapPlanListRowAllCards(p));
  }

  async updatePlan(userId: string, planId: string, dto: PatchInstallmentPlanDto) {
    const hasMonthly = dto.monthlyAmount !== undefined;
    const hasRemaining = dto.remainingInstallments !== undefined;
    const cancel = dto.cancel === true;
    if (!hasMonthly && !hasRemaining && !cancel) {
      throw new BadRequestException('Indica cuota mensual, mensualidades restantes o cancelar.');
    }

    const plan = await this.prisma.installmentPlan.findFirst({
      where: { id: planId, account: { userId } },
    });
    if (!plan) {
      throw new NotFoundException('Plan de meses no encontrado.');
    }
    if (plan.status !== InstallmentPlanStatus.ACTIVE) {
      throw new BadRequestException('Este plan ya no está activo.');
    }

    if (cancel) {
      return this.prisma.installmentPlan.update({
        where: { id: planId },
        data: { status: InstallmentPlanStatus.CANCELLED },
      });
    }

    const data: Prisma.InstallmentPlanUpdateInput = {};
    if (hasMonthly) {
      data.monthlyAmount = new Prisma.Decimal(dto.monthlyAmount!);
    }
    if (hasRemaining) {
      const r = dto.remainingInstallments!;
      const newTotal = plan.currentInstallment + r - 1;
      if (newTotal < plan.currentInstallment) {
        throw new BadRequestException('Las mensualidades restantes no son coherentes con el avance del plan.');
      }
      if (newTotal < 1) {
        throw new BadRequestException('El número total de meses debe ser al menos 1.');
      }
      data.totalInstallments = newTotal;
    }

    return this.prisma.installmentPlan.update({
      where: { id: planId },
      data,
    });
  }
}
