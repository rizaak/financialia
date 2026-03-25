import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchAccountsSummary, type AccountsSummary } from '../api/fetchAccounts';
import { fetchDashboardSummary } from '../api/fetchSummary';
import type { DashboardSummary } from '../api/types';
import { ChartFallback } from '../components/ChartFallback';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import { formatMoney } from '../lib/formatMoney';

const ExpenseByCategoryChart = lazy(async () => {
  const m = await import('../components/ExpenseByCategoryChart');
  return { default: m.ExpenseByCategoryChart };
});

function periodLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return `${from.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })} — ${to.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export type DashboardViewProps = {
  getAccessToken: () => Promise<string>;
  configHint?: ReactNode;
  defaultCurrency: string;
  financeDataRevision: number;
};

export function DashboardView({
  getAccessToken,
  configHint,
  defaultCurrency,
  financeDataRevision,
}: DashboardViewProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [accountsSummary, setAccountsSummary] = useState<AccountsSummary | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setLoading(true);
        setError(null);
        setAccountsError(null);
      }
      try {
        const [sumRes, accRes] = await Promise.allSettled([
          fetchDashboardSummary(getAccessToken),
          fetchAccountsSummary(getAccessToken),
        ]);
        if (sumRes.status === 'rejected') {
          throw sumRes.reason;
        }
        setData(sumRes.value);
        if (accRes.status === 'fulfilled') {
          setAccountsSummary(accRes.value);
          setAccountsError(null);
        } else if (!silent) {
          setAccountsSummary(null);
          setAccountsError(formatDashboardLoadError(accRes.reason));
        }
      } catch (e) {
        if (!silent) {
          setData(null);
          setAccountsSummary(null);
          setError(formatDashboardLoadError(e));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const revisionSyncReady = useRef(false);
  useEffect(() => {
    if (!revisionSyncReady.current) {
      revisionSyncReady.current = true;
      return;
    }
    void load({ silent: true });
  }, [financeDataRevision, load]);

  const curForPatrimonio = accountsSummary?.defaultCurrency ?? defaultCurrency;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Resumen</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Tu panorama</h1>
          <p className="mt-1 text-sm text-zinc-500">Mes en curso, gastos por categoría y patrimonio.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Actualizar
        </button>
      </header>

      {configHint}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-8">
          <SectionCard
            title="Este mes"
            subtitle={periodLabel(data.period.from, data.period.to)}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Ingresos" value={formatMoney(data.totals.income, defaultCurrency)} />
              <StatCard label="Gastos" value={formatMoney(data.totals.expense, defaultCurrency)} />
              <StatCard
                label="Flujo neto"
                value={formatMoney(data.totals.net, defaultCurrency)}
                tone={Number(data.totals.net) >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </SectionCard>

          <SectionCard title="Gastos por categoría">
            <Suspense fallback={<ChartFallback />}>
              <ExpenseByCategoryChart rows={data.expensesByCategory} currencyCode={defaultCurrency} />
            </Suspense>
          </SectionCard>

          {accountsSummary ? (
            <SectionCard title="Patrimonio">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Líquido"
                  value={formatMoney(accountsSummary.totalLiquid, curForPatrimonio)}
                />
                <StatCard
                  label="En bancos"
                  value={formatMoney(accountsSummary.totalBanks, curForPatrimonio)}
                />
                <StatCard
                  label="Invertido"
                  value={formatMoney(accountsSummary.totalInvestedTiered, curForPatrimonio)}
                />
                <StatCard
                  label="Total neto"
                  value={formatMoney(accountsSummary.totalNetBalance, curForPatrimonio)}
                />
              </div>
            </SectionCard>
          ) : accountsError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No se pudo cargar el patrimonio. Inténtalo de nuevo más tarde.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
