import { assertOk } from '../lib/http/assertOk';
import type { CreateTransactionResponse } from './fetchTransactions';
import { getApiBaseUrl } from './apiBaseUrl';

export type RecurringIncomeFrequency = 'QUINCENAL' | 'MONTHLY';

export type RecurringIncomeListRow = {
  id: string;
  label: string;
  amount: string;
  currency: string;
  frequency: RecurringIncomeFrequency;
  paymentDays: number[];
  categoryId: string;
  accountId: string;
  lastConfirmedAt: string | null;
  isArchived: boolean;
  category: { id: string; name: string; slug: string };
  account: { id: string; name: string; type: string; currency: string };
  dueToday: boolean;
  hasIncomeRegisteredToday: boolean;
};

export type CreateRecurringIncomeBody = {
  label?: string;
  amount: number;
  frequency: RecurringIncomeFrequency;
  paymentDays: number[];
  categoryId: string;
  accountId: string;
  currency?: string;
};

export type RecurringIncomeReminderItem = {
  recurringIncomeId: string;
  message: string;
};

export async function fetchRecurringIncomes(
  getAccessToken: () => Promise<string>,
): Promise<RecurringIncomeListRow[]> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-incomes`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<RecurringIncomeListRow[]>;
}

export async function fetchRecurringIncomeChatReminders(
  getAccessToken: () => Promise<string>,
): Promise<{ items: RecurringIncomeReminderItem[] }> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-incomes/chat-reminders`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<{ items: RecurringIncomeReminderItem[] }>;
}

export async function createRecurringIncome(
  getAccessToken: () => Promise<string>,
  body: CreateRecurringIncomeBody,
): Promise<RecurringIncomeListRow> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-incomes`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<RecurringIncomeListRow>;
}

export async function deleteRecurringIncome(
  getAccessToken: () => Promise<string>,
  id: string,
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-incomes/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
}

export async function confirmRecurringIncomeDeposit(
  getAccessToken: () => Promise<string>,
  id: string,
): Promise<CreateTransactionResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-incomes/${id}/confirm-deposit`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<CreateTransactionResponse>;
}
