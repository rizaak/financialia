import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchCategories } from '../api/fetchCategories';
import { QuickExpenseForm } from '../components/QuickExpenseForm';
import { SectionCard } from '../components/SectionCard';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import type { ShellOutletContext } from '../layouts/shellContext';

export function RegisterPage() {
  const { getAccessToken, configHint, defaultCurrency, notifyTransactionSaved } =
    useOutletContext<ShellOutletContext>();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCategories(getAccessToken);
      setCategories(rows);
    } catch (e) {
      setCategories([]);
      setError(formatDashboardLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Operaciones</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Registro</h1>
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
      ) : (
        <SectionCard title="Registrar movimiento">
          <QuickExpenseForm
            categories={categories}
            getAccessToken={getAccessToken}
            onSaved={() => {
              notifyTransactionSaved();
            }}
            defaultCurrency={defaultCurrency}
          />
        </SectionCard>
      )}
    </div>
  );
}
