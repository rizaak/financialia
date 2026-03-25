import { useMemo } from 'react';
import type { InvestmentsOverview } from '../../api/investmentsTypes';
import { formatMoney } from '../../lib/formatMoney';
import { mapOverviewToDashboardModel } from '../../investments/mapOverviewToDashboard';
import { SectionCard } from '../SectionCard';
import { AssetTable } from './AssetTable';
import { InvestmentChart } from './InvestmentChart';
import { InvestmentStatCard } from './InvestmentStatCard';
import { PortfolioDonutChart } from './PortfolioDonutChart';
import { TargetAllocationTool } from './TargetAllocationTool';

type Props = {
  overview: InvestmentsOverview;
  currencyCode: string;
};

export function InvestmentDashboard({ overview, currencyCode }: Props) {
  const model = useMemo(() => mapOverviewToDashboardModel(overview), [overview]);

  const fmt = (n: number) => formatMoney(n, currencyCode);
  const fmtN = (n: number, code: string) => formatMoney(n, code);

  const returnPct = model.weightedAvgAnnualReturn * 100;
  const returnPositive = returnPct >= 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InvestmentStatCard variant="hero" label="Patrimonio total" value={fmt(model.patrimonioTotal)} />
        <InvestmentStatCard
          label="Rendimiento promedio ponderado"
          value={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
          tone={returnPositive ? 'positive' : 'negative'}
          showTrendArrow
        />
        <InvestmentStatCard label="Ritmo mensual (año 1)" value={fmt(model.estimatedMonthlyChange)} />
        <InvestmentStatCard
          label="Proyección a 12 meses"
          value={fmt(model.proyeccion12Meses)}
          tone="positive"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <SectionCard title="Crecimiento proyectado">
            <InvestmentChart
              data={model.growthSeries}
              currencyCode={currencyCode}
              formatCurrency={fmtN}
            />
          </SectionCard>
        </div>
        <div className="lg:col-span-2">
          <SectionCard title="Distribución del portafolio">
            <PortfolioDonutChart
              segments={model.donutSegments}
              formatCurrency={fmtN}
              currencyCode={currencyCode}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Activos">
        <AssetTable
          assets={model.assets}
          formatCurrency={fmtN}
          currencyCode={currencyCode}
        />
      </SectionCard>

      <TargetAllocationTool />
    </div>
  );
}
