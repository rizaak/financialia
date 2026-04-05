import { Box } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { InvestmentsOverview } from '../../api/investmentsTypes';
import {
  PORTFOLIO_CATEGORIES,
  type DonutSegment,
  type PortfolioCategoryId,
} from '../../investments/investmentDashboardTypes';
import { formatMoney } from '../../lib/formatMoney';
import { mapOverviewToDashboardModel } from '../../investments/mapOverviewToDashboard';
import { SectionCard } from '../SectionCard';
import { InvestmentStatCard } from './InvestmentStatCard';
import { PortfolioAssetsGrouped } from './PortfolioAssetsGrouped';
import { MuiGrowthLineChart } from './MuiGrowthLineChart';
import { MuiPortfolioPieChart } from './MuiPortfolioPieChart';
import { TargetAllocationTool } from './TargetAllocationTool';

const STORAGE_KEY = 'vidya.investment.objectivesTargetPct.v1';

function emptyTargetAllocation(): Record<string, string> {
  return Object.fromEntries(PORTFOLIO_CATEGORIES.map((c) => [c.id, '']));
}

function loadTargetAllocation(): Record<string, string> {
  if (typeof window === 'undefined') return emptyTargetAllocation();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTargetAllocation();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next = emptyTargetAllocation();
    for (const c of PORTFOLIO_CATEGORIES) {
      const v = parsed[c.id];
      if (typeof v === 'string') next[c.id] = v;
    }
    return next;
  } catch {
    return emptyTargetAllocation();
  }
}

type Props = {
  overview: InvestmentsOverview;
  currencyCode: string;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function InvestmentDashboard({ overview, currencyCode, getAccessToken, onSaved }: Props) {
  const model = useMemo(() => mapOverviewToDashboardModel(overview), [overview]);

  const [targetAllocation, setTargetAllocation] = useState(emptyTargetAllocation);

  useEffect(() => {
    setTargetAllocation(loadTargetAllocation());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetAllocation));
    } catch {
      /* ignore */
    }
  }, [targetAllocation]);

  const targetPctByCategory = useMemo(() => {
    const out: Record<PortfolioCategoryId, number> = {
      cripto: 0,
      acciones: 0,
      etfs: 0,
      efectivo: 0,
    };
    for (const c of PORTFOLIO_CATEGORIES) {
      const n = Number(String(targetAllocation[c.id] ?? '').replace(/,/g, ''));
      out[c.id] = Number.isFinite(n) && n >= 0 ? n : 0;
    }
    return out;
  }, [targetAllocation]);

  const actualPctByCategory = useMemo(() => {
    const pat = model.patrimonioTotal;
    const out: Record<PortfolioCategoryId, number> = {
      cripto: 0,
      acciones: 0,
      etfs: 0,
      efectivo: 0,
    };
    if (pat <= 0) return out;
    for (const c of PORTFOLIO_CATEGORIES) {
      const seg = model.donutSegments.find((s) => s.categoryId === c.id);
      const value = seg?.value ?? 0;
      out[c.id] = Math.round((value / pat) * 1000) / 10;
    }
    return out;
  }, [model.donutSegments, model.patrimonioTotal]);

  const enrichedDonutSegments = useMemo((): DonutSegment[] => {
    const pat = model.patrimonioTotal;
    const out: DonutSegment[] = [];
    for (const meta of PORTFOLIO_CATEGORIES) {
      const seg = model.donutSegments.find((s) => s.categoryId === meta.id);
      const value = seg?.value ?? 0;
      if (value <= 0) continue;
      const pct = pat > 0 ? Math.round((value / pat) * 1000) / 10 : 0;
      const target = targetPctByCategory[meta.id];
      const funded = target > 0 && pct >= target - 0.5;
      out.push({
        categoryId: meta.id,
        name: meta.label,
        value,
        pct,
        color: meta.color,
        funded,
      });
    }
    return out;
  }, [model.donutSegments, model.patrimonioTotal, targetPctByCategory]);

  const fmt = (n: number) => formatMoney(n, currencyCode);
  const fmtN = (n: number, code: string) => formatMoney(n, code);

  const returnPct = model.weightedAvgAnnualReturn * 100;
  const returnPositive = returnPct >= 0;

  return (
    <div className="space-y-8 bg-transparent">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvestmentStatCard
          statKey="patrimonio"
          variant="hero"
          label="Patrimonio total"
          value={fmt(model.patrimonioTotal)}
        />
        <InvestmentStatCard
          statKey="rendimiento"
          label="Rendimiento promedio ponderado"
          value={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
          tone={returnPositive ? 'positive' : 'negative'}
          showTrendArrow
        />
        <InvestmentStatCard statKey="ritmo" label="Ritmo mensual (año 1)" value={fmt(model.estimatedMonthlyChange)} />
        <InvestmentStatCard
          statKey="proyeccion"
          label="Proyección a 12 meses"
          value={fmt(model.proyeccion12Meses)}
          tone="positive"
        />
      </div>

      <SectionCard
        title="Objetivos"
        subtitle="Metas de asignación y barras de avance; la dona refleja la meta (anillo exterior) y el estado fondeado."
      >
        <TargetAllocationTool
          values={targetAllocation}
          onChange={setTargetAllocation}
          actualPctByCategory={actualPctByCategory}
        />
      </SectionCard>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <SectionCard title="Crecimiento proyectado">
            <MuiGrowthLineChart
              data={model.growthSeries}
              currencyCode={currencyCode}
              formatCurrency={fmtN}
            />
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard title="Distribución del portafolio">
            <MuiPortfolioPieChart
              segments={enrichedDonutSegments}
              formatCurrency={fmtN}
              currencyCode={currencyCode}
              targetPctByCategory={targetPctByCategory}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Activos por motor de rendimiento" subtitle="Plazo fijo, renta variable y valor de mercado.">
        <Box sx={{ backgroundColor: 'transparent' }}>
          <PortfolioAssetsGrouped
            assets={model.assets}
            formatCurrency={fmtN}
            currencyCode={currencyCode}
            getAccessToken={getAccessToken}
            onMarketValueSaved={onSaved}
          />
        </Box>
      </SectionCard>
    </div>
  );
}
