/** Clasificación para distribución del portafolio (gráfico de dona). */
export type PortfolioCategoryId = 'cripto' | 'acciones' | 'etfs' | 'efectivo';

export type PortfolioCategoryMeta = {
  id: PortfolioCategoryId;
  label: string;
  color: string;
};

export const PORTFOLIO_CATEGORIES: readonly PortfolioCategoryMeta[] = [
  { id: 'cripto', label: 'Cripto', color: '#059669' },
  { id: 'acciones', label: 'Acciones', color: '#10b981' },
  { id: 'etfs', label: 'ETFs', color: '#34d399' },
  { id: 'efectivo', label: 'Efectivo', color: '#94a3b8' },
] as const;

/** Activo aplanado para tabla y KPIs. */
export type InvestmentAsset = {
  id: string;
  name: string;
  portfolioName: string;
  amountInvested: number;
  portfolioSharePct: number;
  expectedAnnualReturnPct: number;
  /** Crecimiento proyectado a 1 año vs monto inicial (API). */
  growthPctVsInitial: number;
  category: PortfolioCategoryId;
  kind: 'VARIABLE' | 'FIXED_TERM';
  maturityDate: string | null;
  /** Tasa pactada en decimal (ej. 0.105). */
  agreedAnnualRatePct: number | null;
  marketValue: number | null;
  unrealizedPlPct: number | null;
};

/** Punto temporal para el área de crecimiento. */
export type GrowthData = {
  month: number;
  monthLabel: string;
  value: number;
};

/** Segmento agregado para dona. */
export type DonutSegment = {
  categoryId: PortfolioCategoryId;
  name: string;
  value: number;
  pct: number;
  color: string;
  /** Meta de asignación cumplida (actual ≥ objetivo %). */
  funded?: boolean;
};

export type InvestmentDashboardModel = {
  patrimonioTotal: number;
  /** Tasa anual ponderada por monto (decimal, ej. 0.075). */
  weightedAvgAnnualReturn: number;
  /** Estimación lineal del cambio de valor por mes en el horizonte de 1 año. */
  estimatedMonthlyChange: number;
  proyeccion12Meses: number;
  assets: InvestmentAsset[];
  growthSeries: GrowthData[];
  donutSegments: DonutSegment[];
};
