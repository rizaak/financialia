import type { InvestmentsOverview } from '../api/investmentsTypes';
import {
  PORTFOLIO_CATEGORIES,
  type DonutSegment,
  type InvestmentAsset,
  type InvestmentDashboardModel,
  type PortfolioCategoryId,
} from './investmentDashboardTypes';
import { calculateCompoundInterest } from '../lib/investmentDashboardMath';

/** Inferencia por etiqueta del activo (sin campo en API). */
export function inferPortfolioCategory(label: string): PortfolioCategoryId {
  const l = label.toLowerCase();
  if (
    /\b(btc|eth|usdt|xrp|sol|doge|cripto|crypto|binance|coinbase|defi)\b/.test(l) ||
    l.includes('bitcoin') ||
    l.includes('ethereum')
  ) {
    return 'cripto';
  }
  if (
    /\b(etf|qqq|spy|voo|vti|ishares|vanguard|s&p|sp500)\b/.test(l) ||
    l.includes('etf')
  ) {
    return 'etfs';
  }
  if (
    /\b(cetes|bono|mmf|money market|liquidez|cash|efectivo|pagare)\b/.test(l) ||
    l.includes('smart cash')
  ) {
    return 'efectivo';
  }
  if (
    /\b(stock|accion|acción|nasdaq|nyse|aapl|msft|nvda|amzn|meta|goog)\b/.test(l) ||
    l.includes('acciones')
  ) {
    return 'acciones';
  }
  return 'efectivo';
}

export function mapOverviewToDashboardModel(overview: InvestmentsOverview): InvestmentDashboardModel {
  const patrimonioTotal = Number(overview.grandTotals.initial);
  const proyeccion12Meses = Number(overview.grandTotals.projectedAfter1y);

  const assets: InvestmentAsset[] = [];
  let weightedReturnNumerator = 0;

  for (const p of overview.portfolios) {
    for (const pos of p.positions) {
      const amount = Number(pos.initialAmount);
      const ret = Number(pos.expectedAnnualReturnPct);
      const growth = Number(pos.growthPctVsInitial);
      weightedReturnNumerator += amount * ret;
      assets.push({
        id: pos.id,
        name: pos.label,
        portfolioName: p.name,
        amountInvested: amount,
        portfolioSharePct: 0,
        expectedAnnualReturnPct: ret * 100,
        growthPctVsInitial: growth,
        category: inferPortfolioCategory(pos.label),
      });
    }
  }

  const denom = patrimonioTotal > 0 ? patrimonioTotal : 1;
  for (const a of assets) {
    a.portfolioSharePct = Math.round((a.amountInvested / denom) * 10000) / 100;
  }

  const weightedAvgAnnualReturn =
    patrimonioTotal > 0 ? weightedReturnNumerator / patrimonioTotal : 0;

  const estimatedMonthlyChange =
    patrimonioTotal > 0 ? (proyeccion12Meses - patrimonioTotal) / 12 : 0;

  const growthSeries = calculateCompoundInterest(
    patrimonioTotal,
    weightedAvgAnnualReturn,
    12,
    0,
  );

  const byCategory = new Map<PortfolioCategoryId, number>();
  for (const c of PORTFOLIO_CATEGORIES) {
    byCategory.set(c.id, 0);
  }
  for (const a of assets) {
    byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + a.amountInvested);
  }

  const donutTotal = [...byCategory.values()].reduce((x, y) => x + y, 0);
  const donutSegments: DonutSegment[] = PORTFOLIO_CATEGORIES.map((meta) => {
    const value = byCategory.get(meta.id) ?? 0;
    const pct = donutTotal > 0 ? Math.round((value / donutTotal) * 1000) / 10 : 0;
    return {
      categoryId: meta.id,
      name: meta.label,
      value,
      pct,
      color: meta.color,
    };
  }).filter((s) => s.value > 0);

  return {
    patrimonioTotal,
    weightedAvgAnnualReturn,
    estimatedMonthlyChange,
    proyeccion12Meses,
    assets,
    growthSeries,
    donutSegments,
  };
}
