import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AccountsSummary, FreeCashFlowBreakdown, RealLiquidityRecurringKpi } from '../api/fetchAccounts';
import type { DashboardSummary } from '../api/types';
import { parseNestErrorBody } from '../lib/http/parseNestErrorBody';
import { createApiClient } from '../services/api.service';
import { useFinanceStore } from '../stores/financeStore';
import type { LoansDashboardSummary } from '../api/fetchLoans';
import type { InvestmentsSummaryApi } from '../types/investmentsSummary';

function describeAxiosError(reason: unknown): string {
  if (!isAxiosError(reason)) {
    return String(reason);
  }
  const d = reason.response?.data;
  if (typeof d === 'string') {
    return parseNestErrorBody(d);
  }
  if (d && typeof d === 'object' && 'message' in d) {
    const m = (d as { message: unknown }).message;
    if (Array.isArray(m)) {
      return m.map(String).join(', ');
    }
    if (typeof m === 'string') {
      return m;
    }
  }
  return reason.message;
}

export type DashboardDataSnapshot = {
  defaultCurrency: string;
  totalNetBalance: string;
  totalLiquid: string;
  totalBanks: string;
  totalInvestedTiered: string;
  totalCreditDebt: string;
  monthExpense: string;
  aiTips: string[];
  freeCashFlow: string;
  freeCashFlowBreakdown: FreeCashFlowBreakdown;
  realLiquidityRecurring: RealLiquidityRecurringKpi;
};

function buildAiTips(input: {
  expense: string;
  income: string;
  blendedAnnualPct: string;
  projected24h: string;
}): string[] {
  const exp = Number(input.expense);
  const inc = Number(input.income);
  const tips: string[] = [];
  if (Number.isFinite(exp) && Number.isFinite(inc) && inc > 0) {
    const ratio = exp / inc;
    if (ratio > 0.9) {
      tips.push('Este mes tus gastos están cerca de tus ingresos: conviene revisar gastos discrecionales.');
    } else if (ratio < 0.4) {
      tips.push('Buen margen entre ingresos y gastos: podrías reforzar ahorro o inversiones.');
    }
  }
  tips.push(
    `Rendimiento anual ponderado (tramos): ${Number(input.blendedAnnualPct).toFixed(2)}% anual.`,
  );
  tips.push(
    `Ganancia diaria estimada (inversiones a tramos): ${Number(input.projected24h).toFixed(2)} en 24 h (referencia).`,
  );
  if (tips.length < 3) {
    tips.push('Revisa tus categorías de mayor gasto para ajustar el presupuesto del próximo mes.');
  }
  return tips.slice(0, 3);
}

type CachedDashboard = {
  accounts: AccountsSummary;
  investments: InvestmentsSummaryApi;
  stats: DashboardSummary;
  /** null si el endpoint falló o aún no hay datos. */
  loansSummary: LoansDashboardSummary | null;
};

export function useDashboard(params: { getAccessToken: () => Promise<string> }) {
  const { getAccessToken } = params;
  const balancesRevision = useFinanceStore((s) => s.balancesRevision);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cache, setCache] = useState<CachedDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<CachedDashboard | null>(null);
  cacheRef.current = cache;

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const hadCache = Boolean(cacheRef.current);

      if (!silent) {
        if (!hadCache) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);
      }

      const client = createApiClient(getAccessToken);

      const settled = await Promise.allSettled([
        client.get<AccountsSummary>('/accounts/summary'),
        client.get<InvestmentsSummaryApi>('/investments/summary'),
        client.get<DashboardSummary>('/transactions/stats'),
        client.get<LoansDashboardSummary>('/loans/summary'),
      ]);

      const prev = cacheRef.current;
      const accounts =
        settled[0].status === 'fulfilled' ? settled[0].value.data : prev?.accounts;
      const investments =
        settled[1].status === 'fulfilled' ? settled[1].value.data : prev?.investments;
      const stats = settled[2].status === 'fulfilled' ? settled[2].value.data : prev?.stats;
      const loansSummary =
        settled[3].status === 'fulfilled'
          ? settled[3].value.data
          : (prev?.loansSummary ?? null);

      const anyRejected = settled.some((s) => s.status === 'rejected');

      if (accounts && investments && stats) {
        setCache({ accounts, investments, stats, loansSummary });
        useFinanceStore.getState().hydrateAccountsFromSummary(accounts);
        useFinanceStore.getState().hydrateAccountsList(accounts.accounts);
        setError(null);
        if (anyRejected && prev) {
          toast.error('Error al actualizar saldos. Mostrando datos locales.', {
            id: 'dashboard-refresh-failed',
          });
        }
      } else {
        const firstRejection = settled.find((s) => s.status === 'rejected') as
          | PromiseRejectedResult
          | undefined;
        setError(
          firstRejection ? describeAxiosError(firstRejection.reason) : 'No se pudo cargar el dashboard.',
        );
      }

      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const revisionReady = useRef(false);
  useEffect(() => {
    if (!revisionReady.current) {
      revisionReady.current = true;
      return;
    }
    void load({ silent: true });
  }, [balancesRevision, load]);

  const snapshot: DashboardDataSnapshot | null = useMemo(() => {
    if (!cache) return null;
    const cur = cache.accounts.defaultCurrency;
    const exp = cache.stats.totals.expense;
    return {
      defaultCurrency: cur,
      totalNetBalance: cache.accounts.totalNetBalance,
      totalLiquid: cache.accounts.totalLiquid,
      totalBanks: cache.accounts.totalBanks,
      totalInvestedTiered: cache.accounts.totalInvestedTiered,
      totalCreditDebt: cache.accounts.totalCreditDebt,
      monthExpense: exp,
      aiTips: buildAiTips({
        expense: exp,
        income: cache.stats.totals.income,
        blendedAnnualPct: cache.investments.tiered.portfolioBlendedAnnualPct,
        projected24h: cache.investments.tiered.projectedEarningsNext24h,
      }),
      freeCashFlow: cache.accounts.freeCashFlow,
      freeCashFlowBreakdown: cache.accounts.freeCashFlowBreakdown,
      realLiquidityRecurring: cache.accounts.realLiquidityRecurring,
    };
  }, [cache]);

  return {
    loading,
    refreshing,
    error,
    snapshot,
    periodSummary: cache?.stats ?? null,
    accountsSummary: cache?.accounts ?? null,
    investmentsSummary: cache?.investments ?? null,
    loansSummary: cache?.loansSummary ?? null,
    refetch: () => void load(),
    refetchSilent: () => void load({ silent: true }),
  };
}
