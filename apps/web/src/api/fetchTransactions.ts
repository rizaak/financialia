import { getApiBaseUrl } from './apiBaseUrl';

export type CreateTransactionPayload = {
  accountId: string;
  categoryId: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  concept: string;
  notes?: string;
  occurredAt?: string;
  currency?: string;
  source?: 'MANUAL' | 'WHATSAPP' | 'TELEGRAM' | 'AI_ASSISTANT' | 'IMPORT';
};

export async function createTransaction(
  getAccessToken: () => Promise<string>,
  body: CreateTransactionPayload,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transactions`, {
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
  return res.json() as Promise<unknown>;
}
