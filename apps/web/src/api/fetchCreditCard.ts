import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type CreditCardStatementApi = {
  statementPeriod: { from: string; to: string };
  nextClosingDate: string;
  nextPaymentDueDate: string;
  daysUntilPaymentDue: number;
  balanceAtStatement: string;
  /** Mensualidades MSI en curso que suman al pago sin intereses (ajustado por periodo). */
  installmentRecurringPortion: string;
  paymentToAvoidInterest: string;
  interestProjectionNextMonth: string;
  availableCredit: string;
  nextPaymentLabel: string;
  creditLimit: string;
  currentDebt: string;
  currency: string;
  statementClosedThisMonth: boolean;
  lastStatementClosingDate: string | null;
  lastClosedStatementBalance: string;
  lastClosedStatementPaymentAmount: string;
  /** Abonos a la tarjeta posteriores al último cierre (transferencias + ingresos). */
  paymentsAppliedSinceLastClosing: string;
  /** Pendiente del corte para evitar intereses tras descontar abonos (≥ 0). */
  remainingLastStatementPaymentAmount: string;
  lastStatementPaymentDueDate: string | null;
  inPaymentWindow: boolean;
  paymentPastDue: boolean;
};

export type NextStatementBreakdownApi = {
  statementPeriod: { from: string; to: string };
  purchasesAfterLastClosing: string;
  activeInstallmentsMonthlyTotal: string;
  paymentToAvoidInterest: string;
  currency: string;
};

export type InstallmentPlanRowApi = {
  id: string;
  label: string;
  totalAmount: string;
  totalInstallments: number;
  currentInstallment: number;
  monthlyAmount: string;
  remainingToPay: string;
  startDate: string;
  interestRate: string;
  isInterestFree: boolean;
  status: 'ACTIVE' | 'PAID' | 'CANCELLED';
  currency: string;
  transactionId: string | null;
};

export async function fetchCreditCardStatement(
  getAccessToken: () => Promise<string>,
  accountId: string,
): Promise<CreditCardStatementApi> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/${encodeURIComponent(accountId)}/credit-statement`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<CreditCardStatementApi>;
}

export async function fetchNextStatementBreakdown(
  getAccessToken: () => Promise<string>,
  accountId: string,
): Promise<NextStatementBreakdownApi> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/accounts/${encodeURIComponent(accountId)}/next-statement`,
    {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  await assertOk(res);
  return res.json() as Promise<NextStatementBreakdownApi>;
}

export async function fetchInstallmentPlans(
  getAccessToken: () => Promise<string>,
  accountId: string,
): Promise<InstallmentPlanRowApi[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/accounts/${encodeURIComponent(accountId)}/installment-plans`,
    {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  await assertOk(res);
  return res.json() as Promise<InstallmentPlanRowApi[]>;
}

export type PostInstallmentPlanPayload = {
  totalAmount: number;
  totalInstallments: number;
  categoryId: string;
  concept: string;
  notes?: string;
  occurredAt?: string;
  description?: string;
  isInterestFree: boolean;
  interestRate?: number;
  source?: 'AI_ASSISTANT' | 'MANUAL';
  startDate?: string;
};

export async function postInstallmentPlan(
  getAccessToken: () => Promise<string>,
  accountId: string,
  body: PostInstallmentPlanPayload,
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(
    `${getApiBaseUrl()}/accounts/${encodeURIComponent(accountId)}/installment-plans`,
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
  return res.json();
}
