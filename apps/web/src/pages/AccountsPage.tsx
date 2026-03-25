import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  createAccount,
  fetchAccountsSummary,
  type AccountRow,
  type AccountsSummary,
} from '../api/fetchAccounts';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import type { ShellOutletContext } from '../layouts/shellContext';
import { formatMoney } from '../lib/formatMoney';

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2';

function accountTypeLabel(t: AccountRow['type']): string {
  switch (t) {
    case 'BANK':
      return 'Banco';
    case 'WALLET':
      return 'Cartera';
    case 'CASH':
      return 'Efectivo';
    default:
      return t;
  }
}

export function AccountsPage() {
  const { getAccessToken, defaultCurrency, financeDataRevision } =
    useOutletContext<ShellOutletContext>();
  const [summary, setSummary] = useState<AccountsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountRow['type']>('BANK');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const s = await fetchAccountsSummary(getAccessToken);
        setSummary(s);
      } catch (e) {
        if (!silent) {
          setSummary(null);
          setError(e instanceof Error ? e.message : 'Error al cargar cuentas');
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

  async function onCreateAccount(e: FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    const name = newName.trim();
    if (!name) {
      setCreateErr('Escribe un nombre.');
      return;
    }
    setCreating(true);
    try {
      await createAccount(getAccessToken, {
        name,
        type: newType,
        currency: defaultCurrency,
      });
      setNewName('');
      await load();
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setCreating(false);
    }
  }

  const cur = summary?.defaultCurrency ?? defaultCurrency;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Patrimonio</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Mis cuentas</h1>
          <p className="mt-1 text-sm text-zinc-500">Saldos y totales en {cur}.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          Actualizar
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : summary ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total en bancos" value={formatMoney(summary.totalBanks, cur)} />
            <StatCard label="Total invertido" value={formatMoney(summary.totalInvestedTiered, cur)} />
            <StatCard label="Saldo neto total" value={formatMoney(summary.totalNetBalance, cur)} />
          </div>

          <SectionCard title="Líquido por tipo">
            <div className="grid gap-3 sm:grid-cols-3">
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Bancos</span>
                <br />
                {formatMoney(summary.totalBanks, cur)}
              </p>
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Carteras</span>
                <br />
                {formatMoney(summary.totalWallets, cur)}
              </p>
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">Efectivo</span>
                <br />
                {formatMoney(summary.totalCash, cur)}
              </p>
            </div>
            <p className="mt-3 text-sm text-zinc-600">
              Total líquido:{' '}
              <span className="font-semibold text-zinc-900">{formatMoney(summary.totalLiquid, cur)}</span>
            </p>
          </SectionCard>

          <SectionCard title="Cuentas">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Moneda</th>
                    <th className="pb-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.accounts.map((a) => (
                    <tr key={a.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-zinc-900">{a.name}</td>
                      <td className="py-2.5 pr-4 text-zinc-600">{accountTypeLabel(a.type)}</td>
                      <td className="py-2.5 pr-4 text-zinc-600">{a.currency}</td>
                      <td className="py-2.5 text-right tabular-nums text-zinc-900">
                        {formatMoney(a.balance, a.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Nueva cuenta">
            <form onSubmit={(e) => void onCreateAccount(e)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-zinc-600" htmlFor="acc-name">
                  Nombre
                </label>
                <input
                  id="acc-name"
                  className={inputClass}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. BBVA, Binance"
                  maxLength={120}
                  disabled={creating}
                />
              </div>
              <div className="sm:w-44">
                <label className="text-xs font-medium text-zinc-600" htmlFor="acc-type">
                  Tipo
                </label>
                <select
                  id="acc-type"
                  className={inputClass}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AccountRow['type'])}
                  disabled={creating}
                >
                  <option value="BANK">Banco</option>
                  <option value="WALLET">Cartera</option>
                  <option value="CASH">Efectivo</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-50"
              >
                {creating ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>
            {createErr ? <p className="mt-2 text-xs text-rose-600">{createErr}</p> : null}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
