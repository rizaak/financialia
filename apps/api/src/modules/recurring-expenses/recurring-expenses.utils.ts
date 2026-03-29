import type { RecurringExpense, RecurringExpenseFrequency } from '@prisma/client';

export type LocalYmd = { y: number; m: number; d: number };

export function getLocalPartsInTz(tz: string, instant: Date): LocalYmd {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Un instante UTC en el que el calendario local en `tz` coincide con (y, m, d).
 * Recorre ventana UTC amplia por DST.
 */
export function findUtcInstantForLocalDate(tz: string, y: number, m: number, d: number): Date {
  const start = Date.UTC(y, m - 1, d - 1, 0, 0, 0, 0);
  const end = Date.UTC(y, m - 1, d + 1, 23, 59, 59, 999);
  for (let ms = start; ms <= end; ms += 3600000) {
    const inst = new Date(ms);
    const p = getLocalPartsInTz(tz, inst);
    if (p.y === y && p.m === m && p.d === d) {
      return inst;
    }
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/** Día de la semana local 0=domingo … 6=sábado para la fecha civil (y,m,d) en `tz`. */
export function getLocalWeekdayInTz(tz: string, y: number, m: number, d: number): number {
  const instant = findUtcInstantForLocalDate(tz, y, m, d);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).formatToParts(instant);
  const wd = parts.find((p) => p.type === 'weekday')?.value;
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd ?? ''] ?? 0;
}

export function effectiveBillingDay(billingDay: number, y: number, m: number): number {
  return Math.min(billingDay, daysInMonth(y, m));
}

/** Suma días al calendario civil (Y-M-D). */
export function addCalendarDays(y: number, m: number, d: number, add: number): LocalYmd {
  const next = new Date(Date.UTC(y, m - 1, d + add));
  return {
    y: next.getUTCFullYear(),
    m: next.getUTCMonth() + 1,
    d: next.getUTCDate(),
  };
}

export function matchesRecurringOnLocalDate(
  frequency: RecurringExpenseFrequency,
  billingDay: number,
  billingMonth: number | null,
  y: number,
  m: number,
  d: number,
): boolean {
  const eff = effectiveBillingDay(billingDay, y, m);
  if (frequency === 'MONTHLY') {
    return d === eff;
  }
  if (frequency === 'ANNUAL') {
    const bm = billingMonth ?? 1;
    if (m !== bm) {
      return false;
    }
    return d === eff;
  }
  return false;
}

export function sameLocalCalendarDay(tz: string, a: Date, b: Date): boolean {
  const pa = getLocalPartsInTz(tz, a);
  const pb = getLocalPartsInTz(tz, b);
  return pa.y === pb.y && pa.m === pb.m && pa.d === pb.d;
}

export function formatAmountEs(amount: number, currency: string): string {
  const code = currency.length === 3 ? currency.toUpperCase() : 'MXN';
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${code}`;
  }
}

/** Próximo día de cobro en los próximos `horizonDays` (incluye hoy), o null si no cae en la ventana. */
export function nextChargeWithinHorizon(
  re: Pick<RecurringExpense, 'frequency' | 'billingDay' | 'billingMonth'>,
  tz: string,
  now: Date,
  horizonDays: number,
): { chargeOn: LocalYmd; daysFromToday: number } | null {
  const today = getLocalPartsInTz(tz, now);
  for (let i = 0; i < horizonDays; i++) {
    const { y, m, d } = addCalendarDays(today.y, today.m, today.d, i);
    if (matchesRecurringOnLocalDate(re.frequency, re.billingDay, re.billingMonth, y, m, d)) {
      return { chargeOn: { y, m, d }, daysFromToday: i };
    }
  }
  return null;
}
