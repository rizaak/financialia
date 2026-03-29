import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchInvestmentsOverview } from '../api/fetchInvestments';
import type { InvestmentsOverview } from '../api/investmentsTypes';
import { InvestmentsSection } from '../components/InvestmentsSection';
import { InvestmentsView } from '../components/investments/InvestmentsView';
import { SectionCard } from '../components/SectionCard';
import type { ShellOutletContext } from '../layouts/shellContext';

export function InvestmentsPage() {
  const { getAccessToken, defaultCurrency } = useOutletContext<ShellOutletContext>();
  const [overview, setOverview] = useState<InvestmentsOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      setOverview(await fetchInvestmentsOverview(getAccessToken));
    } catch (e) {
      setOverview(null);
      setOverviewError(e instanceof Error ? e.message : 'Error al cargar portafolios');
    } finally {
      setOverviewLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <InvestmentsView getAccessToken={getAccessToken} defaultCurrency={defaultCurrency} />

      <div className="mt-12">
        {overviewLoading ? (
          <SectionCard title="Portafolios clásicos" subtitle="Cargando…">
            <p className="text-sm text-zinc-500">Cargando portafolios…</p>
          </SectionCard>
        ) : overviewError ? (
          <SectionCard title="Portafolios clásicos" subtitle="Error">
            <p className="text-sm text-rose-800">{overviewError}</p>
          </SectionCard>
        ) : overview ? (
          <InvestmentsSection
            data={overview}
            getAccessToken={getAccessToken}
            onSaved={() => void loadOverview()}
            currencyCode={defaultCurrency}
          />
        ) : (
          <SectionCard title="Portafolios clásicos" subtitle="Sin datos">
            <p className="text-sm text-zinc-600">No hay información para mostrar.</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
