import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountType,
  Prisma,
  TransactionSource,
  TransactionType,
  type Transaction,
} from '@prisma/client';
import { TransactionCreatedEvent } from '@common/events/transaction-created.event';
import { AccountsService } from '../accounts/accounts.service';
import { InstallmentPlansService } from '../accounts/installment-plans.service';
import { DashboardService, type DashboardSummaryResponse } from '../dashboard/dashboard.service';
import type { DashboardSummaryQueryDto } from '../dashboard/dto/dashboard-summary-query.dto';
import { AuditLogService } from '../users/audit-log.service';
import { PrismaService } from '@common/prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InterestRiskAlertService } from './interest-risk-alert.service';
import { SpendingPatternService, type SpendingInsightPayload } from './spending-pattern.service';

export type CreateTransactionResult = {
  transaction: Transaction;
  spendingInsight: SpendingInsightPayload | null;
  interestRiskMessage: string | null;
};

export type TransactionAuditContext = {
  auth0Sub?: string | null;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly installmentPlans: InstallmentPlansService,
    private readonly dashboard: DashboardService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLog: AuditLogService,
    private readonly spendingPattern: SpendingPatternService,
    private readonly interestRiskAlert: InterestRiskAlertService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
    audit?: TransactionAuditContext,
  ): Promise<CreateTransactionResult> {
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId, isArchived: false },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.kind !== dto.type) {
      throw new BadRequestException(
        'La categoría no corresponde al tipo de movimiento (usa una categoría de gasto o de ingreso según corresponda).',
      );
    }

    if (dto.type === TransactionType.ADJUSTMENT) {
      throw new BadRequestException(
        'Los ajustes de saldo se registran con POST /accounts/:accountId/reconcile.',
      );
    }

    const account = await this.accounts.assertActiveAccountForUser(dto.accountId, userId);
    const currency = (dto.currency ?? account.currency).toUpperCase().slice(0, 3);
    if (account.currency !== currency) {
      throw new BadRequestException('La moneda del movimiento debe coincidir con la de la cuenta.');
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const amountDec = new Prisma.Decimal(dto.amount);

    const isInstallmentCharge =
      dto.type === TransactionType.EXPENSE &&
      account.type === AccountType.CREDIT_CARD &&
      dto.isInstallment === true;

    if (dto.isInstallment && account.type !== AccountType.CREDIT_CARD) {
      throw new BadRequestException('Las compras a meses solo aplican a tarjetas de crédito.');
    }
    if (isInstallmentCharge) {
      if (dto.totalInstallments == null || dto.totalInstallments < 2) {
        throw new BadRequestException('Para MSI indica totalInstallments (entre 2 y 60).');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (isInstallmentCharge) {
        this.accounts.assertCreditPurchaseWithinLimit(account, amountDec);
      }

      await this.accounts.applyTransactionBalanceInTx(
        tx,
        dto.accountId,
        userId,
        dto.type,
        amountDec,
      );

      const monthly = isInstallmentCharge
        ? amountDec.dividedBy(dto.totalInstallments!)
        : null;

      const tr = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: amountDec,
          currency,
          concept: dto.concept,
          notes: dto.notes,
          occurredAt,
          source: dto.source ?? TransactionSource.MANUAL,
          metadata:
            isInstallmentCharge && monthly
              ? { monthlyExpenseImpact: monthly.toString() }
              : undefined,
        },
      });

      if (isInstallmentCharge && monthly) {
        const interestRate =
          dto.installmentInterestFree !== false
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(dto.planInterestRate ?? 0);
        const plan = await this.installmentPlans.createPlanForPurchaseInTx(tx, {
          accountId: dto.accountId,
          transactionId: tr.id,
          description: dto.concept.trim().slice(0, 500),
          totalAmount: amountDec,
          totalInstallments: dto.totalInstallments!,
          monthlyAmount: monthly,
          startDate: occurredAt,
          interestRate,
        });
        await tx.transaction.update({
          where: { id: tr.id },
          data: {
            metadata: {
              installmentPlanId: plan.id,
              monthlyExpenseImpact: monthly.toString(),
            },
          },
        });
      }

      return tr;
    });
    this.eventEmitter.emit(
      'transaction.created',
      new TransactionCreatedEvent(
        userId,
        created.id,
        created.accountId,
        created.type,
        created.amount.toString(),
      ),
    );
    void this.auditLog.recordMoneyMovement({
      userId,
      auth0Sub: audit?.auth0Sub,
      action: 'transaction.create',
      resource: `transaction:${created.id}`,
      metadata: {
        accountId: created.accountId,
        type: created.type,
        amount: created.amount.toString(),
        currency: created.currency,
      },
      ip: audit?.ip,
      userAgent: audit?.userAgent,
    });

    let spendingInsight: SpendingInsightPayload | null = null;
    let interestRiskMessage: string | null = null;
    if (dto.type === TransactionType.EXPENSE) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { defaultCurrency: true, timezone: true },
      });
      if (user) {
        spendingInsight = await this.spendingPattern.buildInsightAfterExpense(
          userId,
          user.defaultCurrency,
          user.timezone,
          category,
          category.id,
          created,
        );
      }
      interestRiskMessage = await this.interestRiskAlert.buildMessageIfRisk(userId);
    }

    return { transaction: created, spendingInsight, interestRiskMessage };
  }

  async list(userId: string, query: ListTransactionsQueryDto): Promise<Transaction[]> {
    const limit = query.limit ?? 50;
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) {
        where.occurredAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.occurredAt.lte = new Date(query.to);
      }
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true, color: true, kind: true } },
        account: { select: { id: true, name: true, currency: true } },
        installmentPlan: {
          select: {
            id: true,
            totalAmount: true,
            totalInstallments: true,
            monthlyAmount: true,
            currentInstallment: true,
            status: true,
          },
        },
      },
    });
  }

  async getOne(userId: string, transactionId: string): Promise<Transaction> {
    const row = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        category: { select: { id: true, name: true, slug: true, color: true, kind: true } },
        account: { select: { id: true, name: true, currency: true } },
        installmentPlan: {
          select: {
            id: true,
            totalAmount: true,
            totalInstallments: true,
            monthlyAmount: true,
            currentInstallment: true,
            status: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Transacción no encontrada');
    }
    return row;
  }

  /** Misma estructura que GET /dashboard/summary (ingresos, gastos y categorías del periodo). */
  getStats(userId: string, query: DashboardSummaryQueryDto): Promise<DashboardSummaryResponse> {
    return this.dashboard.getSummary(userId, query);
  }

  async update(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
    audit?: TransactionAuditContext,
  ): Promise<Transaction> {
    if (
      dto.categoryId == null &&
      dto.type == null &&
      dto.amount == null &&
      dto.concept == null &&
      dto.notes === undefined &&
      dto.occurredAt == null &&
      dto.accountId == null &&
      dto.totalInstallments == null
    ) {
      throw new BadRequestException('Indica al menos un campo a actualizar.');
    }

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        installmentPlan: true,
        transferBankFee: true,
        interestPayoutLink: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Transacción no encontrada');
    }
    if (existing.transferBankFee) {
      throw new BadRequestException('No se puede editar una comisión de transferencia.');
    }
    if (existing.interestPayoutLink) {
      throw new BadRequestException('No se puede editar un movimiento vinculado a inversión.');
    }

    const hasPlan = Boolean(existing.installmentPlan);
    const nextAccountId = dto.accountId ?? existing.accountId;
    const nextType = dto.type ?? existing.type;

    if (hasPlan) {
      if (dto.type != null && dto.type !== TransactionType.EXPENSE) {
        throw new BadRequestException('Una compra a meses no puede cambiar de tipo.');
      }
      if (nextType !== TransactionType.EXPENSE) {
        throw new BadRequestException('Una compra a meses debe seguir siendo un gasto.');
      }
      const nextAcc = await this.accounts.assertActiveAccountForUser(nextAccountId, userId);
      if (nextAcc.type !== AccountType.CREDIT_CARD) {
        throw new BadRequestException('Las compras a meses solo pueden asociarse a una tarjeta de crédito.');
      }
    }

    const categoryId = dto.categoryId ?? existing.categoryId;
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, isArchived: false },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.kind !== nextType) {
      throw new BadRequestException(
        'La categoría no corresponde al tipo de movimiento (gasto, ingreso o ajuste).',
      );
    }

    await this.accounts.assertActiveAccountForUser(existing.accountId, userId);
    await this.accounts.assertActiveAccountForUser(nextAccountId, userId);

    if (existing.accountId !== nextAccountId) {
      const [a, b] = await Promise.all([
        this.prisma.account.findFirst({ where: { id: existing.accountId, userId } }),
        this.prisma.account.findFirst({ where: { id: nextAccountId, userId } }),
      ]);
      if (!a || !b || a.currency !== b.currency) {
        throw new BadRequestException('Solo puedes mover el movimiento a una cuenta en la misma moneda.');
      }
    }

    const amountDec =
      dto.amount != null ? new Prisma.Decimal(dto.amount) : new Prisma.Decimal(existing.amount);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : existing.occurredAt;
    const concept = dto.concept?.trim() ?? existing.concept;
    const notes = dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes;

    let planMonths = 0;
    if (hasPlan && existing.installmentPlan) {
      planMonths = dto.totalInstallments ?? existing.installmentPlan.totalInstallments;
      if (planMonths < 2 || planMonths > 60) {
        throw new BadRequestException('El plan debe tener entre 2 y 60 meses.');
      }
    }

    const monthly =
      hasPlan && existing.installmentPlan ? amountDec.dividedBy(planMonths) : null;

    const oldSignedDelta = this.parseSignedDeltaFromMetadata(existing.metadata);
    const sign = oldSignedDelta.gt(0)
      ? new Prisma.Decimal(1)
      : oldSignedDelta.lt(0)
        ? new Prisma.Decimal(-1)
        : new Prisma.Decimal(1);
    const nextSignedDelta =
      nextType === TransactionType.ADJUSTMENT
        ? dto.amount != null
          ? sign.mul(amountDec)
          : oldSignedDelta
        : new Prisma.Decimal(0);

    const storedAmount =
      nextType === TransactionType.ADJUSTMENT ? nextSignedDelta.abs() : amountDec;

    const nextMetadata: Prisma.InputJsonValue | undefined =
      nextType === TransactionType.ADJUSTMENT
        ? ({
            ...(typeof existing.metadata === 'object' && existing.metadata !== null
              ? existing.metadata
              : {}),
            signedDelta: nextSignedDelta.toString(),
          } as Prisma.InputJsonValue)
        : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.accounts.reverseTransactionBalanceInTx(
        tx,
        existing.accountId,
        userId,
        existing.type,
        new Prisma.Decimal(existing.amount),
        existing.metadata,
      );

      const nextAccRow = await tx.account.findFirst({
        where: { id: nextAccountId, userId },
      });
      if (!nextAccRow) {
        throw new BadRequestException('Cuenta no válida.');
      }
      if (nextType === TransactionType.EXPENSE && nextAccRow.type === AccountType.CREDIT_CARD) {
        this.accounts.assertCreditPurchaseWithinLimit(nextAccRow, amountDec);
      }

      if (nextType === TransactionType.ADJUSTMENT) {
        await this.accounts.applyAdjustmentBalanceInTx(tx, nextAccountId, userId, nextSignedDelta);
      } else {
        await this.accounts.applyTransactionBalanceInTx(
          tx,
          nextAccountId,
          userId,
          nextType,
          amountDec,
        );
      }

      const dataPatch: Prisma.TransactionUpdateInput = {
        account: { connect: { id: nextAccountId } },
        category: { connect: { id: categoryId } },
        type: nextType,
        amount: storedAmount,
        concept,
        notes,
        occurredAt,
      };

      if (nextType === TransactionType.ADJUSTMENT && nextMetadata) {
        dataPatch.metadata = nextMetadata;
      } else if (existing.type === TransactionType.ADJUSTMENT && nextType !== TransactionType.ADJUSTMENT) {
        dataPatch.metadata = Prisma.JsonNull;
      } else if (hasPlan && monthly && existing.installmentPlan) {
        dataPatch.metadata = {
          installmentPlanId: existing.installmentPlan.id,
          monthlyExpenseImpact: monthly.toString(),
        };
      }

      const row = await tx.transaction.update({
        where: { id: transactionId },
        data: dataPatch,
        include: {
          category: { select: { id: true, name: true, slug: true, color: true, kind: true } },
          account: { select: { id: true, name: true, currency: true } },
          installmentPlan: {
            select: {
              id: true,
              totalAmount: true,
              totalInstallments: true,
              monthlyAmount: true,
              currentInstallment: true,
              status: true,
            },
          },
        },
      });

      if (hasPlan && existing.installmentPlan) {
        const clamped = Math.min(existing.installmentPlan.currentInstallment, planMonths);
        await tx.installmentPlan.update({
          where: { id: existing.installmentPlan.id },
          data: {
            accountId: nextAccountId,
            totalAmount: amountDec,
            totalInstallments: planMonths,
            monthlyAmount: monthly!,
            description: concept.slice(0, 500),
            currentInstallment: clamped,
          },
        });
      }

      return row;
    });

    void this.auditLog.recordMoneyMovement({
      userId,
      auth0Sub: audit?.auth0Sub,
      action: 'transaction.update',
      resource: `transaction:${transactionId}`,
      metadata: {
        accountId: nextAccountId,
        type: nextType,
        amount: storedAmount.toString(),
      },
      ip: audit?.ip,
      userAgent: audit?.userAgent,
    });

    return updated;
  }

  async remove(userId: string, transactionId: string, audit?: TransactionAuditContext): Promise<void> {
    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        transferBankFee: true,
        interestPayoutLink: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Transacción no encontrada');
    }
    if (existing.transferBankFee) {
      throw new BadRequestException('No se puede eliminar una comisión de transferencia.');
    }
    if (existing.interestPayoutLink) {
      throw new BadRequestException('No se puede eliminar un movimiento vinculado a inversión.');
    }

    await this.accounts.assertActiveAccountForUser(existing.accountId, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.accounts.reverseTransactionBalanceInTx(
        tx,
        existing.accountId,
        userId,
        existing.type,
        new Prisma.Decimal(existing.amount),
        existing.metadata,
      );
      await tx.transaction.delete({ where: { id: transactionId } });
    });

    void this.auditLog.recordMoneyMovement({
      userId,
      auth0Sub: audit?.auth0Sub,
      action: 'transaction.delete',
      resource: `transaction:${transactionId}`,
      metadata: {
        accountId: existing.accountId,
        type: existing.type,
        amount: existing.amount.toString(),
      },
      ip: audit?.ip,
      userAgent: audit?.userAgent,
    });
  }

  private parseSignedDeltaFromMetadata(metadata: Prisma.JsonValue | null): Prisma.Decimal {
    if (metadata && typeof metadata === 'object' && metadata !== null && 'signedDelta' in metadata) {
      return new Prisma.Decimal(String((metadata as Record<string, unknown>).signedDelta));
    }
    return new Prisma.Decimal(0);
  }
}
