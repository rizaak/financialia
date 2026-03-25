import { getApiBaseUrl } from './apiBaseUrl';
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<InvestmentsOverview>;
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}
