import { assertOk } from '../lib/http/assertOk';
import type { CreateTransactionResponse } from './fetchTransactions';
import { getApiBaseUrl } from './apiBaseUrl';

export type RecurringFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'QUINCENAL'
  | 'MONTHLY'
  | 'SEMIANNUAL'
  | 'ANNUAL';

export function recurringExpenseFrequencyLabel(f: RecurringFrequency): string {
  const labels: Record<RecurringFrequency, string> = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    QUINCENAL: 'Quincenal',
    MONTHLY: 'Mensual',
    SEMIANNUAL: 'Semestral',
    ANNUAL: 'Anual',
  };
  return labels[f] ?? f;
}

export type UpcomingCharge = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: RecurringFrequency;
  categoryName: string;
  accountName: string;
  daysFromToday: number;
  chargeDateIso: string;
  chargeDateLabel: string;
};

export type RecurringChatReminderItem = {
  recurringExpenseId: string;
  message: string;
};

export type CreateRecurringExpenseBody = {
  name: string;
  amount: number;
  billingDay: number;
  frequency: RecurringFrequency;
  billingMonth?: number;
  /** 0=domingo … 6=sábado; solo WEEKLY. */
  billingWeekday?: number;
  categoryId: string;
  accountId: string;
  currency?: string;
};

export type RecurringExpenseListRow = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: RecurringFrequency;
  billingDay: number;
  billingMonth: number | null;
  billingWeekday: number | null;
  isArchived: boolean;
  category: { id: string; name: string; slug: string };
  account: { id: string; name: string; type: string; currency: string };
};

export type PatchRecurringExpenseBody = {
  name?: string;
  amount?: number;
  billingDay?: number;
  frequency?: RecurringFrequency;
  billingMonth?: number | null;
  billingWeekday?: number | null;
  isArchived?: boolean;
};

export async function fetchRecurringExpensesList(
  getAccessToken: () => Promise<string>,
  options?: { includeArchived?: boolean },
): Promise<RecurringExpenseListRow[]> {
  const token = await getAccessToken();
  const q = new URLSearchParams();
  if (options?.includeArchived) q.set('includeArchived', 'true');
  const suffix = q.toString() ? `?${q}` : '';
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses${suffix}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<RecurringExpenseListRow[]>;
}

export async function patchRecurringExpense(
  getAccessToken: () => Promise<string>,
  id: string,
  body: PatchRecurringExpenseBody,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json();
}

export async function fetchUpcomingCharges(
  getAccessToken: () => Promise<string>,
  days = 7,
): Promise<UpcomingCharge[]> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses/upcoming?days=${days}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<UpcomingCharge[]>;
}

export async function fetchRecurringChatReminders(
  getAccessToken: () => Promise<string>,
): Promise<{ items: RecurringChatReminderItem[] }> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses/chat-reminders`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<{ items: RecurringChatReminderItem[] }>;
}

export async function createRecurringExpense(
  getAccessToken: () => Promise<string>,
  body: CreateRecurringExpenseBody,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json();
}

export async function confirmRecurringCharge(
  getAccessToken: () => Promise<string>,
  id: string,
): Promise<CreateTransactionResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-expenses/${id}/confirm-charge`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<CreateTransactionResponse>;
}
