import type { AmortizationScheduleRow, PrepaymentStrategy } from '../api/fetchLoans';

export type AmortizationChartPoint = {
  month: number;
  xLabel: string;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  balance: number;
  scenarioBalance: number | null;
};

export function monthsElapsedFromLoanStart(startIso: string, termMonths: number): number {
  const start = new Date(startIso);
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  return Math.max(0, Math.min(months, termMonths));
}

/** Balances después de cada pago mensual, desde saldo inicial, con cuota fija. */
function forwardBalancesAfterPayments(
  startBalance: number,
  monthlyPayment: number,
  annualRate: number,
  maxMonths: number,
): number[] {
  const i = annualRate / 12;
  const out: number[] = [];
  let b = Math.max(0, startBalance);
  let m = 0;
  while (b > 0.01 && m < maxMonths) {
    const interest = b * i;
    const toPrincipal = monthlyPayment - interest;
    if (toPrincipal <= 0) {
      break;
    }
    const cap = Math.min(toPrincipal, b);
    b -= cap;
    m++;
    out.push(b);
  }
  return out;
}

/**
 * Puntos para gráfica contractual + línea de escenario (solo REDUCE_TERM).
 */
export function buildAmortizationChartPoints(
  rows: AmortizationScheduleRow[],
  totalAmount: number,
  monthlyPayment: number,
  annualRate: number,
  startDateIso: string,
  termMonths: number,
  scenario: { extraAmount: number; strategy: PrepaymentStrategy } | null,
): AmortizationChartPoint[] {
  let cumInt = 0;
  let cumPrin = 0;
  const points: AmortizationChartPoint[] = [];

  const mElapsed = monthsElapsedFromLoanStart(startDateIso, termMonths);

  let scenarioTail: number[] | null = null;
  let m0 = 0;
  if (
    scenario &&
    scenario.strategy === 'REDUCE_TERM' &&
    scenario.extraAmount > 0 &&
    rows.length > 0
  ) {
    m0 = Math.min(mElapsed, rows.length);
    const maxF = termMonths + 240;
    if (mElapsed <= 0) {
      const afterExtra = Math.max(0, totalAmount - scenario.extraAmount);
      scenarioTail = forwardBalancesAfterPayments(afterExtra, monthlyPayment, annualRate, maxF);
    } else if (m0 >= 1) {
      const contractual = Number(rows[m0 - 1].balanceAfter);
      const afterExtra = Math.max(0, contractual - scenario.extraAmount);
      scenarioTail = forwardBalancesAfterPayments(afterExtra, monthlyPayment, annualRate, maxF);
    }
  }

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const month = r.month;
    cumInt += Number(r.interest);
    cumPrin += Number(r.principal);
    const balance = Number(r.balanceAfter);

    let scenarioBalance: number | null = null;
    if (scenario?.strategy === 'REDUCE_TERM' && scenarioTail && scenario.extraAmount > 0) {
      if (mElapsed <= 0) {
        const t = scenarioTail[month - 1];
        scenarioBalance =
          t !== undefined ? t : month > scenarioTail.length ? 0 : null;
      } else if (month < m0) {
        scenarioBalance = balance;
      } else if (month === m0) {
        scenarioBalance =
          m0 >= 1 && m0 <= rows.length
            ? Math.max(0, Number(rows[m0 - 1].balanceAfter) - scenario.extraAmount)
            : null;
      } else {
        const off = month - m0 - 1;
        if (off >= 0 && off < scenarioTail.length) {
          scenarioBalance = scenarioTail[off];
        } else if (off >= scenarioTail.length) {
          scenarioBalance = 0;
        }
      }
    }

    const showYear = month === 1 || month % 12 === 0;
    const yearNum = Math.floor((month - 1) / 12) + 1;
    const xLabel = showYear ? `Año ${yearNum}` : `${month}m`;

    points.push({
      month,
      xLabel,
      cumulativeInterest: cumInt,
      cumulativePrincipal: cumPrin,
      balance,
      scenarioBalance,
    });
  }

  return points;
}
