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
    <div className="space-y-8 bg-transparent">
      <InvestmentDashboard
        overview={data}
        currencyCode={currencyCode}
        getAccessToken={getAccessToken}
        onSaved={onSaved}
      />

      <SectionCard title="Gestionar portafolios">
        <div className="grid gap-4 bg-transparent lg:grid-cols-2 lg:items-start">
          <CreatePortfolioForm getAccessToken={getAccessToken} onSaved={onSaved} />
          <CreatePositionForm
            portfolios={data.portfolios}
            getAccessToken={getAccessToken}
            onSaved={onSaved}
          />
        </div>
        {!hasPortfolios ? (
          <p className="mt-4 text-sm text-[#94a3b8]">
            Crea un portafolio y añade posiciones para ver el resumen aquí.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
