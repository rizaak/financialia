import type { InvestmentsOverview } from '../api/investmentsTypes';

/** Respuesta de GET /investments/summary */
export type TierSegmentApi = {
  sortOrder: number;
  annualRatePct: string;
  fractionOfPrincipal: number;
  amountInTier: string;
};

export type TieredInvestmentRowApi = {
  id: string;
  name: string;
  principal: string;
  currency: string;
  payoutFrequency: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  autoReinvest: boolean;
  effectiveAnnualPct: string;
  dailyEstimatedEarnings: string;
  tierProgressMessage: string;
  tierProgress01: number;
  currentTierSortOrder: number | null;
  tierSegments: TierSegmentApi[];
};

export type TieredDashboardApi = {
  netLiquidBalance: string;
  totalInvestedTiered: string;
  portfolioBlendedAnnualPct: string;
  projectedEarningsNext24h: string;
  investments: TieredInvestmentRowApi[];
};

export type InvestmentsSummaryApi = {
  defaultCurrency: string;
  tiered: TieredDashboardApi;
  portfolios: InvestmentsOverview;
};
