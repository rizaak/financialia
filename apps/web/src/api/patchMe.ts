import { getApiBaseUrl } from './apiBaseUrl';
import type { MeResponse } from './fetchMe';

export type PatchMeBody = {
  defaultCurrency?: 'USD' | 'MXN';
};

export async function patchMe(
  getAccessToken: () => Promise<string>,
  body: PatchMeBody,
): Promise<MeResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/me`, {
    method: 'PATCH',
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
  return res.json() as Promise<MeResponse>;
}
