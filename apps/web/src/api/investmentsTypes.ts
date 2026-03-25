export type InvestmentsOverview = {
  portfolios: Array<{
    id: string;
    name: string;
    baseCurrency: string;
    totals: {
      initial: string;
      projectedAfter1y: string;
    };
    positions: Array<{
      id: string;
      label: string;
      initialAmount: string;
      expectedAnnualReturnPct: string;
      projectedValueAfter1y: string;
      growthPctVsInitial: string;
    }>;
  }>;
  grandTotals: {
    initial: string;
    projectedAfter1y: string;
  };
};
