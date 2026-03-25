import { getApiBaseUrl } from './apiBaseUrl';
import type { DashboardSummary } from './types';

export async function fetchDashboardSummary(
  getAccessToken: () => Promise<string>,
  params?: { from?: string; to?: string },
): Promise<DashboardSummary> {
  const token = await getAccessToken();
  const qs = new URLSearchParams();
  if (params?.from) {
    qs.set('from', params.from);
  }
  if (params?.to) {
    qs.set('to', params.to);
  }
  const url = `${getApiBaseUrl()}/dashboard/summary${qs.toString() ? `?${qs}` : ''}`;
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<DashboardSummary>;
}
