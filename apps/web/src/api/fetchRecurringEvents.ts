import { getApiBaseUrl } from './apiBaseUrl';
import { assertOk } from '../lib/http/assertOk';

export type RecurringEventApiRow = {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  amount: string;
  currency: string;
  frequency: string;
  daysOfMonth: number[];
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  billingMonth: number | null;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  defaultAccountId: string;
  lastProcessedDate: string | null;
  isActive: boolean;
  account?: { id: string; name: string };
};

export type UpcomingRecurringEventItem = {
  event: RecurringEventApiRow;
  nextOccurrenceLocal: string;
  nextOccurrenceIso: string;
};

export type UpcomingRecurringEventsResponse = {
  timezone: string;
  daysLookahead: number;
  items: UpcomingRecurringEventItem[];
};

export async function fetchUpcomingRecurringEvents(
  getAccessToken: () => Promise<string>,
  daysLookahead = 7,
): Promise<UpcomingRecurringEventsResponse> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/recurring-events/pending?daysLookahead=${encodeURIComponent(String(daysLookahead))}`,
    {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  await assertOk(res);
  return res.json() as Promise<UpcomingRecurringEventsResponse>;
}

/** Confirma el evento: crea transacción y actualiza `lastProcessedDate` (motor unificado). */
export async function confirmUnifiedRecurringEvent(
  getAccessToken: () => Promise<string>,
  eventId: string,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring/${encodeURIComponent(eventId)}/confirm`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json();
}

export async function patchRecurringEvent(
  getAccessToken: () => Promise<string>,
  eventId: string,
  body: { defaultAccountId?: string },
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/recurring-events/${encodeURIComponent(eventId)}`, {
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
