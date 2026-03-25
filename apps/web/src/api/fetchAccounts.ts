import { getApiBaseUrl } from './apiBaseUrl';

export type AccountRow = {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH';
  currency: string;
  balance: string;
};

export type AccountsSummary = {
  defaultCurrency: string;
  totalBanks: string;
  totalWallets: string;
  totalCash: string;
  totalLiquid: string;
  totalInvestedTiered: string;
  totalNetBalance: string;
  accounts: AccountRow[];
};

export async function fetchAccounts(getAccessToken: () => Promise<string>): Promise<AccountRow[]> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AccountRow[]>;
}

export async function fetchAccountsSummary(
  getAccessToken: () => Promise<string>,
): Promise<AccountsSummary> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/summary`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AccountsSummary>;
}

export type CreateAccountPayload = {
  name: string;
  type: AccountRow['type'];
  currency?: string;
};

export async function createAccount(
  getAccessToken: () => Promise<string>,
  body: CreateAccountPayload,
): Promise<AccountRow> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<AccountRow>;
}
