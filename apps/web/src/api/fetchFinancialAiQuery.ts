import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type FinancialAiQueryResponse = {
  answer: string;
};

export async function getFinancialAiQuery(
  getAccessToken: () => Promise<string>,
  question: string,
): Promise<FinancialAiQueryResponse> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ q: question.trim() });
  const res = await fetch(`${getApiBaseUrl()}/ai/query?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<FinancialAiQueryResponse>;
}
