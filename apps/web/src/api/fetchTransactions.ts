import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type SpendingInsightPayload = {
  message: string;
  categoryName: string;
  currency: string;
  thisWeekCount: number;
  thisWeekTotal: string;
  avgWeeklyHistorical: string;
  deltaVsAverage: string;
};

export type CreateTransactionResponse = {
  transaction: Record<string, unknown> & { id: string };
  spendingInsight: SpendingInsightPayload | null;
  /** Alerta si efectivo débito < pago para no generar intereses en tarjetas (moneda base). */
  interestRiskMessage: string | null;
};

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

export type TransactionWithCategory = Omit<CreateTransactionPayload, 'type'> & {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string;
  currency: string;
  occurredAt: string;
  concept: string;
  source?: string;
  type: 'EXPENSE' | 'INCOME' | 'ADJUSTMENT';
  metadata?: Record<string, unknown> | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    kind: string;
  };
  account?: {
    id: string;
    name: string;
    currency: string;
  };
  installmentPlan?: {
    id: string;
    totalAmount: string;
    totalInstallments: number;
    monthlyAmount: string;
    currentInstallment: number;
    status: string;
  } | null;
};

/** Máximo permitido por el backend en `GET /transactions` (list-transactions-query). */
export const TRANSACTION_LIST_MAX = 100;

export async function listTransactions(
  getAccessToken: () => Promise<string>,
  limitOrOptions?: number | { limit?: number; accountId?: string },
): Promise<TransactionWithCategory[]> {
  let limit = 40;
  let accountId: string | undefined;
  if (typeof limitOrOptions === 'number') {
    limit = limitOrOptions;
  } else if (limitOrOptions && typeof limitOrOptions === 'object') {
    limit = limitOrOptions.limit ?? 40;
    accountId = limitOrOptions.accountId;
  }
  limit = Math.min(Math.max(1, limit), TRANSACTION_LIST_MAX);
  const q = new URLSearchParams({ limit: String(limit) });
  if (accountId) {
    q.set('accountId', accountId);
  }
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transactions?${q}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<TransactionWithCategory[]>;
}

export async function createTransaction(
  getAccessToken: () => Promise<string>,
  body: CreateTransactionPayload,
): Promise<CreateTransactionResponse> {
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
  await assertOk(res);
  return res.json() as Promise<CreateTransactionResponse>;
}

export type UpdateTransactionPayload = {
  accountId?: string;
  categoryId?: string;
  type?: 'EXPENSE' | 'INCOME' | 'ADJUSTMENT';
  amount?: number;
  concept?: string;
  notes?: string | null;
  occurredAt?: string;
  /** Solo MSI: nuevo plazo en meses. */
  totalInstallments?: number;
};

export async function patchTransaction(
  getAccessToken: () => Promise<string>,
  transactionId: string,
  body: UpdateTransactionPayload,
): Promise<TransactionWithCategory> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<TransactionWithCategory>;
}

export async function getTransaction(
  getAccessToken: () => Promise<string>,
  transactionId: string,
): Promise<TransactionWithCategory> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transactions/${transactionId}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<TransactionWithCategory>;
}

export async function deleteTransaction(
  getAccessToken: () => Promise<string>,
  transactionId: string,
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
}
