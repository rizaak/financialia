import { assertOk } from '../lib/http/assertOk';
import type { CreateTransactionResponse } from './fetchTransactions';
import { getApiBaseUrl } from './apiBaseUrl';

export type RecurringFrequency = 'MONTHLY' | 'ANNUAL';

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
  categoryId: string;
  accountId: string;
  currency?: string;
};

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
