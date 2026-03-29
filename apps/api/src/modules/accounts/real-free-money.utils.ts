import type { RecurringExpense, RecurringExpenseFrequency } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  effectiveBillingDay,
  getLocalPartsInTz,
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
  if (frequency === 'MONTHLY') {
    return true;
  }
  if (frequency === 'ANNUAL') {
    return billingMonth != null && billingMonth === m;
  }
  return false;
}

/**
 * Obligación de vivienda/servicios aún no cubierta en el mes local (incluye retrasos del mismo mes).
 */
export function housingOrUtilityStillDue(
  re: Pick<
    RecurringExpense,
    'frequency' | 'billingDay' | 'billingMonth' | 'amount' | 'lastConfirmedAt'
  >,
  tz: string,
  now: Date,
): Prisma.Decimal {
  const { y, m, d } = getLocalPartsInTz(tz, now);
  if (!isChargeInCurrentLocalMonth(re.frequency, re.billingMonth, y, m)) {
    return new Prisma.Decimal(0);
  }
  const effDay = effectiveBillingDay(re.billingDay, y, m);
  const amt = new Prisma.Decimal(re.amount);
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

/**
 * Suscripciones y cargos similares: lo que aún falta por pagar desde hoy hasta el fin del mes (día de cobro futuro o hoy sin confirmar).
 */
export function subscriptionRemainingInMonth(
  re: Pick<
    RecurringExpense,
    'frequency' | 'billingDay' | 'billingMonth' | 'amount' | 'lastConfirmedAt'
  >,
  tz: string,
  now: Date,
): Prisma.Decimal {
  const { y, m, d } = getLocalPartsInTz(tz, now);
  if (!isChargeInCurrentLocalMonth(re.frequency, re.billingMonth, y, m)) {
    return new Prisma.Decimal(0);
  }
  const effDay = effectiveBillingDay(re.billingDay, y, m);
  const amt = new Prisma.Decimal(re.amount);
  if (d < effDay) {
    return amt;
  }
  if (d === effDay) {
    if (re.lastConfirmedAt && sameLocalCalendarDay(tz, re.lastConfirmedAt, now)) {
      return new Prisma.Decimal(0);
    }
    return amt;
  }
  return new Prisma.Decimal(0);
}
