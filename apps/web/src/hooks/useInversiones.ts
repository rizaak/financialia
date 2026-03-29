import { useCallback, useEffect, useState } from 'react';
import { fetchTieredDashboard } from '../api/fetchInvestments';
import type { TieredDashboardApi } from '../types/investmentsSummary';

/**
 * Datos de inversiones por tramos (GET /investments/tiered/dashboard).
 */
export function useInversiones(getAccessToken: () => Promise<string>) {
  const [data, setData] = useState<TieredDashboardApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTieredDashboard(getAccessToken));
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Error al cargar inversiones');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
