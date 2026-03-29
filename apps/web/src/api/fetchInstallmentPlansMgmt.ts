import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type InstallmentPlanCommitmentRow = {
  id: string;
  accountId: string;
  accountName: string;
  label: string;
  totalAmount: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: string;
  remainingInstallments: number;
  remainingToPay: string;
  startDate: string;
  interestRate: string;
  isInterestFree: boolean;
  status: string;
  currency: string;
  transactionId: string;
};

export type PatchInstallmentPlanBody = {
  monthlyAmount?: number;
  remainingInstallments?: number;
  cancel?: boolean;
};

export async function fetchAllActiveInstallmentPlans(
  getAccessToken: () => Promise<string>,
): Promise<InstallmentPlanCommitmentRow[]> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/installment-plans`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  await assertOk(res);
  return res.json() as Promise<InstallmentPlanCommitmentRow[]>;
}

export async function patchInstallmentPlan(
  getAccessToken: () => Promise<string>,
  planId: string,
  body: PatchInstallmentPlanBody,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/installment-plans/${encodeURIComponent(planId)}`, {
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
