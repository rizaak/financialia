import type { InvestmentsOverview } from '../api/investmentsTypes';
import { CreatePortfolioForm } from './investments/CreatePortfolioForm';
import { CreatePositionForm } from './investments/CreatePositionForm';
import { InvestmentDashboard } from './investments/InvestmentDashboard';
import { SectionCard } from './SectionCard';

type InvestmentsSectionProps = {
  data: InvestmentsOverview;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
  currencyCode: string;
};

export function InvestmentsSection({
  data,
  getAccessToken,
  onSaved,
  currencyCode,
}: InvestmentsSectionProps) {
  const hasPortfolios = data.portfolios.length > 0;

  return (
    <div className="space-y-8">
      <InvestmentDashboard overview={data} currencyCode={currencyCode} />

      <SectionCard title="Gestionar portafolios">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <CreatePortfolioForm getAccessToken={getAccessToken} onSaved={onSaved} />
          <CreatePositionForm
            portfolios={data.portfolios}
            getAccessToken={getAccessToken}
            onSaved={onSaved}
          />
        </div>
        {!hasPortfolios ? (
          <p className="mt-4 text-sm text-zinc-600">
            Crea un portafolio y añade posiciones para ver el resumen aquí.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
