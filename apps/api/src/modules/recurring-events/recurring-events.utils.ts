import type { RecurringEventFrequency } from '@prisma/client';
import { getLocalWeekdayInTz } from '../recurring-expenses/recurring-expenses.utils';
import { paymentDayMatches } from '../recurring-incomes/recurring-incomes.utils';

/**
 * Indica si el evento aplica en la fecha local (y, m, d) en la zona `tz`.
 * YEARLY exige billingMonth igual al mes actual.
 * WEEKLY usa dayOfWeek (0–6) y calendario local.
 */
export function recurringEventMatchesLocalDate(
  frequency: RecurringEventFrequency,
  daysOfMonth: number[],
  billingMonth: number | null,
  dayOfWeek: number | null,
  y: number,
  m: number,
  d: number,
  tz: string,
): boolean {
  if (frequency === 'WEEKLY') {
    if (dayOfWeek == null) {
      return false;
    }
    return getLocalWeekdayInTz(tz, y, m, d) === dayOfWeek;
  }
  if (frequency === 'YEARLY') {
    if (billingMonth == null || billingMonth !== m) {
      return false;
    }
  }
  if (daysOfMonth.length === 0) {
    return false;
  }
  return paymentDayMatches(daysOfMonth, y, m, d);
}
