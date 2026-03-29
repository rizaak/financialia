import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';
import type { TieredDashboardApi } from '../types/investmentsSummary';
import type { InvestmentsOverview } from './investmentsTypes';

async function jsonAuthFetch(
  getAccessToken: () => Promise<string>,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export async function fetchInvestmentsOverview(
  getAccessToken: () => Promise<string>,
): Promise<InvestmentsOverview> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/overview');
  await assertOk(res);
  return res.json() as Promise<InvestmentsOverview>;
}

export async function fetchTieredDashboard(
  getAccessToken: () => Promise<string>,
): Promise<TieredDashboardApi> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/tiered/dashboard');
  await assertOk(res);
  return res.json() as Promise<TieredDashboardApi>;
}

export type CreateTieredInvestmentWithStrategyBody = {
  strategyName: string;
  tiers: Array<{ annualRatePct: number; upperLimit?: number | null }>;
  originAccountId: string;
  interestDestinationAccountId?: string;
  name: string;
  initialDeposit: number;
  currency?: string;
  payoutFrequency: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  autoReinvest?: boolean;
};

export type TieredInvestmentCreated = {
  id: string;
  name: string;
  originAccount: { id: string; name: string };
};

export async function createTieredInvestmentWithStrategy(
  getAccessToken: () => Promise<string>,
  body: CreateTieredInvestmentWithStrategyBody,
): Promise<TieredInvestmentCreated> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/tiered/holdings/with-strategy', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<TieredInvestmentCreated>;
}

export type CreatePortfolioBody = {
  name: string;
  description?: string;
  baseCurrency?: string;
};

export async function createPortfolio(
  getAccessToken: () => Promise<string>,
  body: CreatePortfolioBody,
): Promise<{ id: string }> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/portfolios', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<{ id: string }>;
}

export type CreatePositionBody = {
  label: string;
  initialAmount: number;
  expectedAnnualReturnPct: number;
  notes?: string;
};

export async function createPosition(
  getAccessToken: () => Promise<string>,
  portfolioId: string,
  body: CreatePositionBody,
): Promise<{ id: string }> {
  const res = await jsonAuthFetch(
    getAccessToken,
    `/investments/portfolios/${portfolioId}/positions`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  await assertOk(res);
  return res.json() as Promise<{ id: string }>;
}

export type TieredStrategyCreated = {
  id: string;
  name: string;
};

export async function createTieredStrategy(
  getAccessToken: () => Promise<string>,
  body: { name: string },
): Promise<TieredStrategyCreated> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/tiered/strategies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<TieredStrategyCreated>;
}

export type AddInvestmentTierBody = {
  sortOrder: number;
  upperLimit?: number | null;
  annualRatePct: number;
};

export async function addInvestmentTier(
  getAccessToken: () => Promise<string>,
  strategyId: string,
  body: AddInvestmentTierBody,
): Promise<{ id: string }> {
  const res = await jsonAuthFetch(
    getAccessToken,
    `/investments/tiered/strategies/${strategyId}/tiers`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  await assertOk(res);
  return res.json() as Promise<{ id: string }>;
}

export type TieredStrategyApi = {
  id: string;
  name: string;
  tiers: Array<{
    id: string;
    sortOrder: number;
    annualRatePct: string;
    upperLimit: string | null;
  }>;
};

export async function fetchTieredStrategies(
  getAccessToken: () => Promise<string>,
): Promise<TieredStrategyApi[]> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/tiered/strategies');
  await assertOk(res);
  return res.json() as Promise<TieredStrategyApi[]>;
}

export type CreateTieredHoldingBody = {
  strategyId: string;
  originAccountId: string;
  interestDestinationAccountId?: string;
  name: string;
  initialDeposit: number;
  currency?: string;
  payoutFrequency: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  autoReinvest?: boolean;
};

export async function createTieredHolding(
  getAccessToken: () => Promise<string>,
  body: CreateTieredHoldingBody,
): Promise<unknown> {
  const res = await jsonAuthFetch(getAccessToken, '/investments/tiered/holdings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json();
}
