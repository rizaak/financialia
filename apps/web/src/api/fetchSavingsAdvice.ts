import { isAxiosError } from 'axios';
import type { DashboardSummary } from './types';
import { parseNestErrorBody } from '../lib/http/parseNestErrorBody';
import { createApiClient } from '../services/api.service';

/** Primer y último instante del mes calendario anterior (zona local). */
export function getLastCalendarMonthIsoRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const last = new Date(y, m, 0, 23, 59, 59, 999);
  return { from: first.toISOString(), to: last.toISOString() };
}

function describeAxiosError(reason: unknown): string {
  if (!isAxiosError(reason)) {
    return String(reason);
  }
  const d = reason.response?.data;
  if (typeof d === 'string') {
    return parseNestErrorBody(d);
  }
  if (d && typeof d === 'object' && 'message' in d) {
    const msg = (d as { message: unknown }).message;
    if (Array.isArray(msg)) {
      return msg.map(String).join(', ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return reason.message;
}

export async function fetchLastMonthExpenseSummary(
  getAccessToken: () => Promise<string>,
): Promise<DashboardSummary> {
  const client = createApiClient(getAccessToken);
  const { from, to } = getLastCalendarMonthIsoRange();
  try {
    const { data } = await client.get<DashboardSummary>('/transactions/stats', {
      params: { from, to },
    });
    return data;
  } catch (e) {
    throw new Error(describeAxiosError(e));
  }
}

export async function postSavingsAdvice(
  summary: DashboardSummary,
  getAccessToken: () => Promise<string>,
): Promise<string> {
  const client = createApiClient(getAccessToken);
  try {
    const { data } = await client.post<{ advice: string }>('/ai-processor/savings-advice', {
      summary,
    });
    return data.advice;
  } catch (e) {
    throw new Error(describeAxiosError(e));
  }
}
