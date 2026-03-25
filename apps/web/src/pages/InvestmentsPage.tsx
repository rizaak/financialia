import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchInvestmentsOverview } from '../api/fetchInvestments';
import type { InvestmentsOverview } from '../api/investmentsTypes';
import { InvestmentsSection } from '../components/InvestmentsSection';
import { SectionCard } from '../components/SectionCard';
import type { ShellOutletContext } from '../layouts/shellContext';

export function InvestmentsPage() {
  const { getAccessToken, defaultCurrency } = useOutletContext<ShellOutletContext>();
  const [data, setData] = useState<InvestmentsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchInvestmentsOverview(getAccessToken));
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Error al cargar');
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
          <p className="text-sm font-medium text-emerald-700">Inversiones</p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Portafolios</h1>
          <p className="mt-1 text-sm text-zinc-500">Vista de tus portafolios y proyección anual.</p>
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
      ) : data ? (
        <InvestmentsSection
          data={data}
          getAccessToken={getAccessToken}
          onSaved={() => void load()}
          currencyCode={defaultCurrency}
        />
      ) : (
        <SectionCard title="Inversiones" subtitle="Sin datos">
          <p className="text-sm text-zinc-600">No hay información para mostrar.</p>
        </SectionCard>
      )}
    </div>
  );
}
