import type { GrowthData } from '../investments/investmentDashboardTypes';

/**
 * Serie de saldo mes a mes con capitalización mensual y aportación opcional constante.
 * `annualRate` en decimal anual (ej. 0.08 = 8%).
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  months: number,
  monthlyContribution = 0,
): GrowthData[] {
  const r = annualRate / 12;
  const series: GrowthData[] = [];
  let balance = principal;

  for (let m = 0; m <= months; m++) {
    series.push({
      month: m,
      monthLabel: m === 0 ? 'Hoy' : `Mes ${m}`,
      value: Math.round(balance * 100) / 100,
    });
    if (m < months) {
      balance = balance * (1 + r) + monthlyContribution;
    }
  }

  return series;
}

export type AllocationValidationResult = {
  valid: boolean;
  total: number;
  excess: number;
};

/**
 * Comprueba que la suma de porcentajes no supere `maxTotal` (por defecto 100).
 */
export function validateAllocationPercentagesSum(
  percentages: readonly number[],
  maxTotal = 100,
): AllocationValidationResult {
  const total = percentages.reduce((a, b) => a + b, 0);
  const excess = Math.max(0, total - maxTotal);
  return {
    valid: total <= maxTotal + 1e-9,
    total,
    excess,
  };
}

/**
 * Si la suma supera 100, escala todos los pesos proporcionalmente para que sumen exactamente 100.
 * Si la suma es 0, devuelve el mismo arreglo.
 */
export function normalizeAllocationPercentages(percentages: readonly number[]): number[] {
  const sum = percentages.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return [...percentages];
  }
  if (sum <= 100) {
    return [...percentages];
  }
  const factor = 100 / sum;
  return percentages.map((p) => Math.round(p * factor * 10000) / 10000);
}

/**
 * Valida y, si hace falta, normaliza para que la suma sea ≤ 100 (o exactamente 100 tras normalizar si excedía).
 */
export function validateOrNormalizeAllocations(percentages: readonly number[]): {
  percentages: number[];
  wasNormalized: boolean;
} {
  const { valid, total } = validateAllocationPercentagesSum(percentages);
  if (valid) {
    return { percentages: [...percentages], wasNormalized: false };
  }
  if (total <= 0) {
    return { percentages: [...percentages], wasNormalized: false };
  }
  return { percentages: normalizeAllocationPercentages(percentages), wasNormalized: true };
}
