/** Cuota nivelada mensual (misma fórmula que el API). */
export function computeAmortizingMonthlyPayment(
  principal: number,
  annualPercent: number,
  numPayments: number,
): number {
  if (principal <= 0 || numPayments < 1) return 0;
  const r = annualPercent / 100 / 12;
  if (r < 1e-15) return principal / numPayments;
  const pow = Math.pow(1 + r, numPayments);
  return (principal * r * pow) / (pow - 1);
}

export function annualPctForCashAdvance(
  operationKind: 'IMMEDIATE_CASH_FIXED' | 'ATM_WITHDRAWAL',
  interestAnnualPct: number | undefined,
  dailyRatePct: number | undefined,
): number | null {
  if (operationKind === 'ATM_WITHDRAWAL') {
    if (dailyRatePct != null && dailyRatePct > 0) return dailyRatePct * 365;
    if (interestAnnualPct != null && interestAnnualPct >= 0) return interestAnnualPct;
    return null;
  }
  if (interestAnnualPct == null) return null;
  return interestAnnualPct;
}
