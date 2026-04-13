import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type CashAdvanceOperationKind = 'IMMEDIATE_CASH_FIXED' | 'ATM_WITHDRAWAL';

export type CashAdvanceRegistrationMode = 'INJECT_TO_ACCOUNT' | 'DEBT_ONLY';

export type PostCashAdvanceInstallmentBody = {
  operationKind: CashAdvanceOperationKind;
  withdrawnAmount: number;
  interestAnnualPct?: number;
  dailyRatePct?: number;
  totalInstallments: number;
  dispositionFee?: number;
  registrationMode?: CashAdvanceRegistrationMode;
  initialInstallment?: number;
  cashAccountId?: string;
  expenseCategoryId: string;
  incomeCategoryId?: string;
  concept?: string;
  notes?: string;
};

export type PostCashAdvanceInstallmentResult = {
  planId: string;
  expenseTransactionId: string;
  incomeTransactionId: string | null;
  registrationMode: CashAdvanceRegistrationMode;
  totalCharged: string;
  withdrawnAmount: string;
  monthlyPayment: string;
  totalInstallments: number;
  initialInstallment: number;
  currency: string;
};

export async function postCashAdvanceInstallment(
  getAccessToken: () => Promise<string>,
  creditAccountId: string,
  body: PostCashAdvanceInstallmentBody,
): Promise<PostCashAdvanceInstallmentResult> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/accounts/${encodeURIComponent(creditAccountId)}/cash-advance-installment`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  await assertOk(res);
  return res.json() as Promise<PostCashAdvanceInstallmentResult>;
}
