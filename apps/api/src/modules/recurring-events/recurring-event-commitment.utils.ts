import { Prisma, RecurringEventType } from '@prisma/client';
import { HOUSING_AND_UTILITY_SLUGS } from '../accounts/real-free-money.utils';
import {
  daysInMonth,
  effectiveBillingDay,
  getLocalPartsInTz,
  getLocalWeekdayInTz,
} from '../recurring-expenses/recurring-expenses.utils';

type Schedule = {
  type: RecurringEventType;
  frequency: import('@prisma/client').RecurringEventFrequency;
  daysOfMonth: number[];
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  billingMonth: number | null;
  amount: Prisma.Decimal;
  lastProcessedDate: Date | null;
};

export function wasPaidOnLocalYmd(
  lastProcessed: Date | null,
  y: number,
  m: number,
  d: number,
  tz: string,
): boolean {
  if (!lastProcessed) {
    return false;
  }
  const p = getLocalPartsInTz(tz, lastProcessed);
  return p.y === y && p.m === m && p.d === d;
}

/**
 * Suma de montos de gastos recurrentes (RecurringEvent EXPENSE) que aún aplican como compromiso en el mes local.
 * Vivienda/servicios: incluye retrasos del mes; el resto: solo cargos futuros o hoy sin registrar.
 */
export function recurringEventExpenseRemainingInMonth(
  re: Schedule,
  categorySlug: string,
  tz: string,
  now: Date,
): Prisma.Decimal {
  if (re.type !== RecurringEventType.EXPENSE) {
    return new Prisma.Decimal(0);
  }

  const { y, m, d } = getLocalPartsInTz(tz, now);
  if (re.frequency === 'YEARLY' && (re.billingMonth == null || re.billingMonth !== m)) {
    return new Prisma.Decimal(0);
  }

  if (re.frequency === 'WEEKLY') {
    if (re.dayOfWeek == null) {
      return new Prisma.Decimal(0);
    }
    const dim = daysInMonth(y, m);
    const amt = new Prisma.Decimal(re.amount);
    const isHousing = HOUSING_AND_UTILITY_SLUGS.has(categorySlug.toLowerCase());
    let total = new Prisma.Decimal(0);
    for (let day = 1; day <= dim; day++) {
      if (getLocalWeekdayInTz(tz, y, m, day) !== re.dayOfWeek) {
        continue;
      }
      if (wasPaidOnLocalYmd(re.lastProcessedDate, y, m, day, tz)) {
        continue;
      }
      if (isHousing || day >= d) {
        total = total.plus(amt);
      }
    }
    return total;
  }

  const days =
    re.daysOfMonth.length > 0
      ? re.daysOfMonth
      : re.dayOfMonth != null
        ? [re.dayOfMonth]
        : [];
  if (days.length === 0) {
    return new Prisma.Decimal(0);
  }

  const isHousing = HOUSING_AND_UTILITY_SLUGS.has(categorySlug.toLowerCase());
  const amt = new Prisma.Decimal(re.amount);
  let total = new Prisma.Decimal(0);

  for (const pd of days) {
    const eff = effectiveBillingDay(pd, y, m);
    if (wasPaidOnLocalYmd(re.lastProcessedDate, y, m, eff, tz)) {
      continue;
    }
    if (isHousing) {
      if (d < eff) {
        total = total.plus(amt);
      } else if (d === eff) {
        total = total.plus(amt);
      } else {
        const lc = re.lastProcessedDate ? getLocalPartsInTz(tz, re.lastProcessedDate) : null;
        if (lc && lc.y === y && lc.m === m && lc.d >= eff) {
          continue;
        }
        total = total.plus(amt);
      }
    } else {
      if (d < eff) {
        total = total.plus(amt);
      } else if (d === eff) {
        total = total.plus(amt);
      }
    }
  }

  return total;
}
