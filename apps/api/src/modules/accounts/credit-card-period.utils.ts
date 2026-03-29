import type { CreditCard } from '@prisma/client';

export function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Fin del día UTC del corte en ese mes (respeta meses con menos días). */
export function closingEndOfDayUtc(year: number, monthIndex: number, closingDay: number): Date {
  const dim = daysInUtcMonth(year, monthIndex);
  const d = Math.min(closingDay, dim);
  return new Date(Date.UTC(year, monthIndex, d, 23, 59, 59, 999));
}

export function addUtcDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Fin del último corte ya ocurrido respecto a `now` (misma regla que el estado de cuenta).
 */
export function getPreviousClosingEnd(cc: CreditCard, now: Date): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonthClosing = closingEndOfDayUtc(y, m, cc.closingDay);

  if (now.getTime() <= thisMonthClosing.getTime()) {
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    return closingEndOfDayUtc(py, pm, cc.closingDay);
  }
  return thisMonthClosing;
}

/**
 * Próxima fecha límite de pago (fin del corte + días hasta el pago), alineada con `CreditCardStatementService`.
 */
export function computeNextPaymentDueUtc(
  cc: Pick<CreditCard, 'closingDay' | 'paymentDueDaysAfterClosing'>,
  now: Date = new Date(),
): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonthClosing = closingEndOfDayUtc(y, m, cc.closingDay);
  let nextClosing: Date;
  if (now.getTime() <= thisMonthClosing.getTime()) {
    nextClosing = thisMonthClosing;
  } else {
    const nm = m + 1;
    const ny = nm > 11 ? y + 1 : y;
    const nmi = nm > 11 ? 0 : nm;
    nextClosing = closingEndOfDayUtc(ny, nmi, cc.closingDay);
  }
  return addUtcDays(nextClosing, cc.paymentDueDaysAfterClosing);
}
