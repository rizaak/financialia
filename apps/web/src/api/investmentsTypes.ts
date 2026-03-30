export type InvestmentPositionKind = 'VARIABLE' | 'FIXED_TERM';

export type InvestmentPositionRow = {
  id: string;
  label: string;
  initialAmount: string;
  expectedAnnualReturnPct: string;
  projectedValueAfter1y: string;
  growthPctVsInitial: string;
  kind: InvestmentPositionKind;
  maturityDate: string | null;
  agreedAnnualRatePct: string | null;
  marketValue: string | null;
  unrealizedPlPct: string | null;
};

export type InvestmentsOverview = {
  portfolios: Array<{
    id: string;
    name: string;
    baseCurrency: string;
    totals: {
      initial: string;
      projectedAfter1y: string;
    };
    positions: InvestmentPositionRow[];
  }>;
  grandTotals: {
    initial: string;
    projectedAfter1y: string;
  };
};
