import { create } from 'zustand';
import {
  fetchAccounts,
  fetchAccountsSummary,
  type AccountRow,
  type AccountsSummary,
} from '../api/fetchAccounts';

export type FinanceState = {
  /** Se incrementa tras mutaciones que afectan saldos; los hooks suscritos hacen re-fetch. */
  balancesRevision: number;
  accountsSummary: AccountsSummary | null;
  accountsList: AccountRow[] | null;
  accountsLoading: boolean;
  accountsError: string | null;
};

type FinanceActions = {
  /** Carga resumen + listado desde la API y actualiza el store. */
  fetchAccounts: (
    getAccessToken: () => Promise<string>,
    options?: { includeArchived?: boolean },
  ) => Promise<void>;
  /** Tras POST exitoso: sube revisión y refresca cuentas sin recargar la página. */
  refreshBalancesAfterMutation: (getAccessToken: () => Promise<string>) => Promise<void>;
  /** Sincroniza desde el dashboard (evita pedir GET /accounts duplicado si ya viene en el bundle). */
  hydrateAccountsFromSummary: (summary: AccountsSummary) => void;
  hydrateAccountsList: (rows: AccountRow[]) => void;
  reset: () => void;
};

const initial: FinanceState = {
  balancesRevision: 0,
  accountsSummary: null,
  accountsList: null,
  accountsLoading: false,
  accountsError: null,
};

export const useFinanceStore = create<FinanceState & FinanceActions>((set, get) => ({
  ...initial,

  fetchAccounts: async (getAccessToken, options) => {
    set({ accountsLoading: true, accountsError: null });
    try {
      const [summary, list] = await Promise.all([
        fetchAccountsSummary(getAccessToken),
        fetchAccounts(getAccessToken, options),
      ]);
      set({
        accountsSummary: summary,
        accountsList: list,
        accountsLoading: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar cuentas';
      set({ accountsError: msg, accountsLoading: false });
    }
  },

  refreshBalancesAfterMutation: async (getAccessToken) => {
    set((s) => ({ balancesRevision: s.balancesRevision + 1 }));
    await get().fetchAccounts(getAccessToken);
  },

  hydrateAccountsFromSummary: (summary) => {
    set({ accountsSummary: summary });
  },

  hydrateAccountsList: (rows) => {
    set({ accountsList: rows });
  },

  reset: () => set(initial),
}));
