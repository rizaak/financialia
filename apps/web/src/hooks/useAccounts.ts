import { useCallback } from 'react';
import type { AccountRow } from '../api/fetchAccounts';
import { useFinanceStore } from '../stores/financeStore';

/**
 * Cuentas del usuario desde Zustand (misma fuente que el dashboard).
 * Los nombres coinciden con los que usa la API y el parse de la IA al hacer match por id.
 */
export function useAccounts(getAccessToken: () => Promise<string>) {
  const accountsList = useFinanceStore((s) => s.accountsList);
  const loading = useFinanceStore((s) => s.accountsLoading);
  const error = useFinanceStore((s) => s.accountsError);
  const fetchAccounts = useFinanceStore((s) => s.fetchAccounts);

  const refresh = useCallback(() => fetchAccounts(getAccessToken), [fetchAccounts, getAccessToken]);

  const accounts: AccountRow[] = accountsList ?? [];

  return {
    accounts,
    /** `null` = aún no se ha cargado desde el servidor. */
    accountsList,
    loading,
    error,
    refresh,
  };
}
