import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';
import type { UserProfileResponse } from './fetchProfile';

export type PatchProfileBody = {
  baseCurrency?: string;
  monthlyBudget?: number;
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  language?: string;
  timezone?: string;
  hideBalances?: boolean;
  avatarUrl?: string;
  displayName?: string;
};

export async function patchProfile(
  getAccessToken: () => Promise<string>,
  body: PatchProfileBody,
): Promise<UserProfileResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/me/profile`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<UserProfileResponse>;
}
