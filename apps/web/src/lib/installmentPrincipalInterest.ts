/**
 * Saldo insoluto al inicio del pago `installmentIndex` (1 = primera mensualidad),
 * para un préstamo amortizado con cuota fija y tasa nominal anual en pagos mensuales.
 */
export function balanceAtInstallmentStart(params: {
  financedPrincipal: number;
  annualPercent: number;
  monthlyPayment: number;
  installmentIndex: number;
}): number {
  const { financedPrincipal: L, annualPercent, monthlyPayment: M, installmentIndex: k } = params;
  if (L <= 0 || k < 1) return 0;
  const n = k - 1;
  if (n <= 0) return L;
  const r = annualPercent / 100 / 12;
  if (r < 1e-14) {
    return Math.max(0, L - n * M);
  }
  const pow = Math.pow(1 + r, n);
  const bal = L * pow - M * ((pow - 1) / r);
  return Math.max(0, bal);
}

/** Desglose capital / interés de la mensualidad `installmentIndex` (1-based). */
export function principalInterestForInstallment(params: {
  financedPrincipal: number;
  annualPercent: number;
  monthlyPayment: number;
  installmentIndex: number;
}): { principal: number; interest: number } {
  const { financedPrincipal: L, annualPercent, monthlyPayment: M, installmentIndex: k } = params;
  if (k < 1 || M <= 0) return { principal: 0, interest: 0 };
  const r = annualPercent / 100 / 12;
  const balStart = balanceAtInstallmentStart({ financedPrincipal: L, annualPercent, monthlyPayment: M, installmentIndex: k });
  if (r < 1e-14) {
    return { principal: Math.min(M, balStart), interest: 0 };
  }
  const interest = balStart * r;
  const principal = Math.max(0, M - interest);
  return { principal, interest };
}
