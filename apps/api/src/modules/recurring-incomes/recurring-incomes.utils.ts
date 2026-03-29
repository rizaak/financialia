import {
  daysInMonth,
  formatAmountEs,
  getLocalPartsInTz,
  sameLocalCalendarDay,
} from '../recurring-expenses/recurring-expenses.utils';

export { formatAmountEs, getLocalPartsInTz, sameLocalCalendarDay };

export function paymentDayMatches(paymentDays: number[], y: number, m: number, d: number): boolean {
  if (paymentDays.length === 0) {
    return false;
  }
  return paymentDays.some((pd) => d === Math.min(pd, daysInMonth(y, m)));
}

export function normalizePaymentDays(days: number[]): number[] {
  const u = [...new Set(days.filter((n) => Number.isInteger(n) && n >= 1 && n <= 31))].sort(
    (a, b) => a - b,
  );
  return u;
}
