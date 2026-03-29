import type { AccountRow } from '../api/fetchAccounts';

/** Saldo o crédito disponible para un gasto desde esta cuenta. */
export function availableForExpense(acc: AccountRow): number {
  if (acc.type === 'CREDIT_CARD') {
    const limit = Number(acc.creditLimit ?? 0);
    const debt = Number(acc.balance);
    if (!Number.isFinite(limit) || limit <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(0, limit - debt);
  }
  return Number(acc.balance);
}
