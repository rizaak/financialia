import { getApiBaseUrl } from './apiBaseUrl';

export type MeResponse = {
  id: string;
  auth0Subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  defaultCurrency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchMe(getAccessToken: () => Promise<string>): Promise<MeResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/me`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<MeResponse>;
}
