import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type TransferRow = {
  id: string;
  name: string;
  type: 'BANK' | 'WALLET' | 'CASH' | 'CREDIT_CARD';
  currency: string;
};

export type TransferRecord = {
  id: string;
  userId: string;
  originAccountId: string;
  destinationAccountId: string;
  amount: string;
  fee: string;
  occurredAt: string;
  notes: string | null;
  feeTransactionId: string | null;
  originAccount: TransferRow;
  destinationAccount: TransferRow;
};

export type CreateTransferPayload = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee?: number;
  /** Solo pago a TC: intereses/cargos que sumó el banco a la deuda antes de tu abono. */
  creditCardBankCharges?: number;
  notes?: string;
  occurredAt?: string;
};

export async function createTransfer(
  getAccessToken: () => Promise<string>,
  body: CreateTransferPayload,
): Promise<TransferRecord> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transfers`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  await assertOk(res);
  return res.json() as Promise<TransferRecord>;
}

export async function fetchTransfers(
  getAccessToken: () => Promise<string>,
  limitOrOptions?: number | { limit?: number; accountId?: string },
): Promise<TransferRecord[]> {
  let limit = 30;
  let accountId: string | undefined;
  if (typeof limitOrOptions === 'number') {
    limit = limitOrOptions;
  } else if (limitOrOptions && typeof limitOrOptions === 'object') {
    limit = limitOrOptions.limit ?? 30;
    accountId = limitOrOptions.accountId;
  }
  const q = new URLSearchParams({ limit: String(limit) });
  if (accountId) {
    q.set('accountId', accountId);
  }
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/transfers?${q}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  await assertOk(res);
  return res.json() as Promise<TransferRecord[]>;
}
