import { getApiBaseUrl } from './apiBaseUrl';
import type { CategoryRow } from './categoryTypes';

export async function fetchCategories(
  getAccessToken: () => Promise<string>,
): Promise<CategoryRow[]> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/categories`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<CategoryRow[]>;
}
