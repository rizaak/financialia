import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type UserProfileResponse = {
  auth0Subject: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  defaultCurrency: string;
  baseCurrency: string;
  monthlyBudget: string | null;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  language: string;
  timezone: string;
  hideBalances: boolean;
  profileUpdatedAt: string;
  userUpdatedAt: string;
};

export async function fetchProfile(
  getAccessToken: () => Promise<string>,
): Promise<UserProfileResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/me/profile`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<UserProfileResponse>;
}
