import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AccountStatus,
  AccountType,
  InstallmentPlanStatus,
  Prisma,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { TransactionCreatedEvent } from '@common/events/transaction-created.event';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService } from './accounts.service';
import type { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import type { PatchInstallmentPlanDto } from './dto/patch-installment-plan.dto';

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
        transaction: { select: { id: true, concept: true, occurredAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cur = account.currency.toUpperCase().slice(0, 3);

    return plans.map((p) => {
      const remainingCount = p.totalInstallments - p.currentInstallment + 1;
      const remainingToPay = new Prisma.Decimal(p.monthlyAmount).times(remainingCount);
      const label = p.description?.trim() || p.transaction?.concept?.trim() || 'Compra a meses';
      const interestRateNum = Number(p.interestRate);
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
      };
    });
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
        transaction: { select: { id: true, concept: true, occurredAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((p) => {
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
      };
    });
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
