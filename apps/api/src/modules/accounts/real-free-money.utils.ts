import type { RecurringExpense, RecurringExpenseFrequency } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  daysInMonth,
  effectiveBillingDay,
  getLocalPartsInTz,
  matchesRecurringOnLocalDate,
  sameLocalCalendarDay,
} from '../recurring-expenses/recurring-expenses.utils';

/** Renta, luz y similares (categorías sembradas por defecto). */
export const HOUSING_AND_UTILITY_SLUGS = new Set(['vivienda', 'servicios']);

function isChargeInCurrentLocalMonth(
  frequency: RecurringExpenseFrequency,
  billingMonth: number | null,
  y: number,
  m: number,
): boolean {
  if (
    frequency === 'MONTHLY' ||
    frequency === 'QUINCENAL' ||
    frequency === 'WEEKLY' ||
    frequency === 'DAILY'
  ) {
    return true;
  }
  if (frequency === 'ANNUAL') {
    return billingMonth != null && billingMonth === m;
  }
  if (frequency === 'SEMIANNUAL') {
    if (billingMonth == null) return false;
    const bm = billingMonth;
    const m2 = bm <= 6 ? bm + 6 : bm - 6;
    return m === bm || m === m2;
  }
  return false;
}

/**
 * Obligación de vivienda/servicios aún no cubierta en el mes local (incluye retrasos del mismo mes).
 */
export function housingOrUtilityStillDue(
  re: Pick<
    RecurringExpense,
    | 'frequency'
    | 'billingDay'
    | 'billingMonth'
    | 'billingWeekday'
    | 'amount'
    | 'lastConfirmedAt'
  >,
  tz: string,
  now: Date,
): Prisma.Decimal {
  const { y, m, d } = getLocalPartsInTz(tz, now);
  if (!isChargeInCurrentLocalMonth(re.frequency, re.billingMonth, y, m)) {
    return new Prisma.Decimal(0);
  }
  const amt = new Prisma.Decimal(re.amount);

  if (
    re.frequency === 'MONTHLY' ||
    re.frequency === 'ANNUAL' ||
    re.frequency === 'SEMIANNUAL'
  ) {
    const effDay = effectiveBillingDay(re.billingDay, y, m);
    if (d < effDay) {
      return amt;
    }
    if (d === effDay) {
      if (re.lastConfirmedAt && sameLocalCalendarDay(tz, re.lastConfirmedAt, now)) {
        return new Prisma.Decimal(0);
      }
      return amt;
    }
    const lc = re.lastConfirmedAt ? getLocalPartsInTz(tz, re.lastConfirmedAt) : null;
    if (lc && lc.y === y && lc.m === m && lc.d >= effDay) {
      return new Prisma.Decimal(0);
    }
    return amt;
  }

  const dim = daysInMonth(y, m);
  for (let dd = d; dd <= dim; dd++) {
    if (!matchesRecurringOnLocalDate(re, tz, y, m, dd)) continue;
    if (dd > d) return amt;
    if (dd === d) {
      if (re.lastConfirmedAt && sameLocalCalendarDay(tz, re.lastConfirmedAt, now)) {
        return new Prisma.Decimal(0);
      }
      return amt;
    }
  }
  return new Prisma.Decimal(0);
}

/**
 * Suscripciones y cargos similares: lo que aún falta por pagar desde hoy hasta el fin del mes (día de cobro futuro o hoy sin confirmar).
 */
export function subscriptionRemainingInMonth(
  re: Pick<
    RecurringExpense,
    | 'frequency'
    | 'billingDay'
    | 'billingMonth'
    | 'billingWeekday'
    | 'amount'
    | 'lastConfirmedAt'
  >,
  tz: string,
  now: Date,
): Prisma.Decimal {
  const { y, m, d } = getLocalPartsInTz(tz, now);
  if (!isChargeInCurrentLocalMonth(re.frequency, re.billingMonth, y, m)) {
    return new Prisma.Decimal(0);
  }
  const amt = new Prisma.Decimal(re.amount);
  const dim = daysInMonth(y, m);
  for (let dd = d; dd <= dim; dd++) {
    if (!matchesRecurringOnLocalDate(re, tz, y, m, dd)) continue;
    if (dd > d) return amt;
    if (dd === d) {
      if (re.lastConfirmedAt && sameLocalCalendarDay(tz, re.lastConfirmedAt, now)) {
        return new Prisma.Decimal(0);
      }
      return amt;
    }
  }
  return new Prisma.Decimal(0);
}
