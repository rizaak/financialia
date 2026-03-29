import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type CreditCardProfileRow = {
  closingDay: number;
  paymentDueDaysAfterClosing: number;
  annualInterestRatePct: string;
};

export type AccountRow = {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD';
  status: 'ACTIVE' | 'ARCHIVED';
  currency: string;
  balance: string;
  creditLimit?: string | null;
  creditCard?: CreditCardProfileRow | null;
};

export type BankBalanceRow = {
  id: string;
  name: string;
  balance: string;
};

export type FreeCashFlowBreakdown = {
  bankBalance: string;
  liquidTieredPrincipal: string;
  frozenTieredPrincipal: string;
  msiThisMonth: string;
  subscriptionsRemaining: string;
  housingUtilitiesPending: string;
  /** Gastos en eventos recurrentes unificados (tabla RecurringEvent) pendientes en el mes. */
  recurringEventsExpensePending: string;
};

/** Saldo bancario − gastos recurrentes pendientes del mes (motor RecurringEvent). */
export type RealLiquidityRecurringKpi = {
  bankBalance: string;
  recurringExpensesPending: string;
  realLiquidity: string;
};

export type AccountsSummary = {
  defaultCurrency: string;
  totalBanks: string;
  totalWallets: string;
  totalCash: string;
  totalLiquid: string;
  totalInvestedTiered: string;
  totalCreditDebt: string;
  totalNetBalance: string;
  /** Cuentas tipo banco con saldo individual */
  banksBreakdown: BankBalanceRow[];
  accounts: AccountRow[];
  /** Saldo bancos − MSI − suscripciones restantes − renta/servicios (moneda base). */
  freeCashFlow: string;
  freeCashFlowBreakdown: FreeCashFlowBreakdown;
  realLiquidityRecurring: RealLiquidityRecurringKpi;
};

export async function fetchAccounts(
  getAccessToken: () => Promise<string>,
  options?: { includeArchived?: boolean },
): Promise<AccountRow[]> {
  const token = await getAccessToken();
  const q = new URLSearchParams();
  if (options?.includeArchived) {
    q.set('includeArchived', 'true');
  }
  const suffix = q.toString() ? `?${q}` : '';
  const res = await fetch(`${getApiBaseUrl()}/accounts${suffix}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<AccountRow[]>;
}

export type PatchCreditCardAccountPayload = {
  name?: string;
  creditLimit?: number;
  /** Fracción anual (ej. 0.45 = 45%), misma convención que al crear tarjeta. */
  annualInterestRatePct?: number;
};

export async function patchCreditCardAccount(
  getAccessToken: () => Promise<string>,
  accountId: string,
  body: PatchCreditCardAccountPayload,
): Promise<AccountRow> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/${encodeURIComponent(accountId)}/credit-card`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<AccountRow>;
}

export async function patchAccountStatus(
  getAccessToken: () => Promise<string>,
  accountId: string,
  body: { status: 'ACTIVE' | 'ARCHIVED' },
): Promise<AccountRow> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/${accountId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<AccountRow>;
}

/** Reconcilia el saldo de la cuenta con el valor real (crea transacción ADJUSTMENT si hay diferencia). */
export async function reconcileAccount(
  getAccessToken: () => Promise<string>,
  accountId: string,
  actualBalance: number,
): Promise<{ skipped: boolean; transaction: Record<string, unknown> | null }> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/${accountId}/reconcile`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ actualBalance }),
  });
  await assertOk(res);
  return res.json() as Promise<{ skipped: boolean; transaction: Record<string, unknown> | null }>;
}

/** @deprecated Usa `reconcileAccount`. */
export async function syncAccountBalance(
  getAccessToken: () => Promise<string>,
  accountId: string,
  actualBalance: number,
): Promise<{ skipped: boolean; transaction: Record<string, unknown> | null }> {
  return reconcileAccount(getAccessToken, accountId, actualBalance);
}

export async function fetchAccountsSummary(
  getAccessToken: () => Promise<string>,
): Promise<AccountsSummary> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts/summary`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<AccountsSummary>;
}

export type CreateAccountPayload = {
  name: string;
  type: AccountRow['type'];
  currency?: string;
  creditLimit?: number;
  closingDay?: number;
  paymentDueDaysAfterClosing?: number;
  annualInterestRatePct?: number;
};

export async function createAccount(
  getAccessToken: () => Promise<string>,
  body: CreateAccountPayload,
): Promise<AccountRow> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/accounts`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<AccountRow>;
}
