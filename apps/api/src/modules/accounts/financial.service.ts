import { Injectable } from '@nestjs/common';
import { InstallmentPlanStatus, Prisma, RecurringEventType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { recurringEventExpenseRemainingInMonth } from '../recurring-events/recurring-event-commitment.utils';
import {
  HOUSING_AND_UTILITY_SLUGS,
  housingOrUtilityStillDue,
  subscriptionRemainingInMonth,
} from './real-free-money.utils';

/**
 * KPI de liquidez real solo con eventos recurrentes unificados (`RecurringEvent` EXPENSE):
 * **Saldo bancario − gastos recurrentes pendientes del mes = liquidez real** (sin MSI ni otras tablas).
 */
export type RealLiquidityRecurringKpi = {
  bankBalance: string;
  recurringExpensesPending: string;
  realLiquidity: string;
};

/**
 * Desglose del flujo de caja libre (misma moneda base del usuario).
 */
export type FreeCashFlowBreakdown = {
  /** Saldo total en cuentas tipo BANK (moneda base). */
  bankBalance: string;
  /** Suma de mensualidades MSI / planes activos en tarjetas (moneda base). */
  msiThisMonth: string;
  /** Suscripciones recurrentes (no vivienda/servicios) aún pendientes en el mes. */
  subscriptionsRemaining: string;
  /** Renta, luz y servicios del hogar pendientes en el mes. */
  housingUtilitiesPending: string;
  /** Gastos en `RecurringEvent` (tabla unificada) aún pendientes en el mes. */
  recurringEventsExpensePending: string;
  /** bankBalance − MSI − suscripciones − renta/servicios − recurringEvents (puede ser negativo). */
  freeCashFlow: string;
};

/**
 * Cálculos financieros agregados (efectivo vs compromisos recurrentes).
 */
@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Efectivo comprometido: suma de gastos `RecurringEvent` (activos) pendientes en el mes local.
   * Alias conceptual de `sumPendingExpenseRecurringEventsThisMonth`.
   */
  async getCommittedExpenseFromRecurringEvents(userId: string): Promise<string> {
    return this.sumPendingExpenseRecurringEventsThisMonth(userId);
  }

  /**
   * Flujo comprometido (frontend): saldo en cuentas BANK menos gastos recurrentes (`RecurringEvent` EXPENSE)
   * aún por ocurrir en el mes civil local.
   */
  async getRealLiquidityRecurringKpi(userId: string): Promise<RealLiquidityRecurringKpi> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const cur = user.defaultCurrency.toUpperCase().slice(0, 3);
    const [bankAgg, pendingStr] = await Promise.all([
      this.prisma.account.aggregate({
        where: { userId, type: 'BANK', currency: cur },
        _sum: { balance: true },
      }),
      this.sumPendingExpenseRecurringEventsThisMonth(userId),
    ]);
    const bankBalance = new Prisma.Decimal(bankAgg._sum.balance ?? 0);
    const recurringExpensesPending = new Prisma.Decimal(pendingStr);
    const realLiquidity = bankBalance.minus(recurringExpensesPending);
    return {
      bankBalance: bankBalance.toString(),
      recurringExpensesPending: recurringExpensesPending.toString(),
      realLiquidity: realLiquidity.toString(),
    };
  }

  /**
   * Suma de gastos `RecurringEvent` (activos) que aún faltan en el mes local.
   */
  async sumPendingExpenseRecurringEventsThisMonth(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { defaultCurrency: true, timezone: true },
    });
    const cur = user.defaultCurrency.toUpperCase().slice(0, 3);
    const tz = user.timezone ?? 'UTC';
    const now = new Date();

    const rows = await this.prisma.recurringEvent.findMany({
      where: {
        userId,
        isActive: true,
        type: RecurringEventType.EXPENSE,
        currency: cur,
      },
      include: { category: { select: { slug: true } } },
    });

    let total = new Prisma.Decimal(0);
    for (const r of rows) {
      total = total.plus(
        recurringEventExpenseRemainingInMonth(
          {
            type: r.type,
            frequency: r.frequency,
            daysOfMonth: r.daysOfMonth,
            dayOfMonth: r.dayOfMonth,
            dayOfWeek: r.dayOfWeek,
            billingMonth: r.billingMonth,
            amount: r.amount,
            lastProcessedDate: r.lastProcessedDate,
          },
          r.category.slug,
          tz,
          now,
        ),
      );
    }
    return total.toString();
  }

  /**
   * Flujo de caja libre: saldo en bancos menos MSI, suscripciones (RecurringExpense), renta/servicios,
   * y gastos pendientes en `RecurringEvent`.
   */
  async getFreeCashFlow(userId: string): Promise<FreeCashFlowBreakdown> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { defaultCurrency: true, timezone: true },
    });
    const cur = user.defaultCurrency.toUpperCase().slice(0, 3);
    const tz = user.timezone ?? 'UTC';

    const [bankAgg, msiAgg, recurringRows, recurringEventsExpensePendingStr] = await Promise.all([
      this.prisma.account.aggregate({
        where: { userId, type: 'BANK', currency: cur },
        _sum: { balance: true },
      }),
      this.prisma.installmentPlan.aggregate({
        where: {
          status: InstallmentPlanStatus.ACTIVE,
          account: { userId, currency: cur },
        },
        _sum: { monthlyAmount: true },
      }),
      this.prisma.recurringExpense.findMany({
        where: { userId, isArchived: false, currency: cur },
        include: { category: { select: { slug: true } } },
      }),
      this.sumPendingExpenseRecurringEventsThisMonth(userId),
    ]);

    const bankBalance = new Prisma.Decimal(bankAgg._sum.balance ?? 0);
    const msiThisMonth = new Prisma.Decimal(msiAgg._sum.monthlyAmount ?? 0);
    const recurringEventsExpensePending = new Prisma.Decimal(recurringEventsExpensePendingStr);

    const now = new Date();
    let subscriptionsRemaining = new Prisma.Decimal(0);
    let housingUtilitiesPending = new Prisma.Decimal(0);

    for (const re of recurringRows) {
      const slug = re.category.slug.toLowerCase();
      const isHousing = HOUSING_AND_UTILITY_SLUGS.has(slug);
      if (isHousing) {
        housingUtilitiesPending = housingUtilitiesPending.plus(housingOrUtilityStillDue(re, tz, now));
      } else {
        subscriptionsRemaining = subscriptionsRemaining.plus(
          subscriptionRemainingInMonth(re, tz, now),
        );
      }
    }

    const freeCashFlow = bankBalance
      .minus(msiThisMonth)
      .minus(subscriptionsRemaining)
      .minus(housingUtilitiesPending)
      .minus(recurringEventsExpensePending);

    return {
      bankBalance: bankBalance.toString(),
      msiThisMonth: msiThisMonth.toString(),
      subscriptionsRemaining: subscriptionsRemaining.toString(),
      housingUtilitiesPending: housingUtilitiesPending.toString(),
      recurringEventsExpensePending: recurringEventsExpensePending.toString(),
      freeCashFlow: freeCashFlow.toString(),
    };
  }
}
