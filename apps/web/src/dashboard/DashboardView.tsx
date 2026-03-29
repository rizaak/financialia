import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { LogoVantix } from '../components/brand/LogoVantix';
import { ChartFallback } from '../components/ChartFallback';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { useFinanceStore } from '../stores/financeStore';
import { useDashboard } from '../hooks/useDashboard';
import { formatMoney } from '../lib/formatMoney';
import { AiFinancialAdvisor } from './AiFinancialAdvisor';
import { AiInsightsWidget } from './AiInsightsWidget';
import { BalanceSummaryCards } from './BalanceSummaryCards';
import { FreeCashFlowHighlight } from './FreeCashFlowHighlight';
import { DashboardCreditCardsStrip } from './DashboardCreditCardsStrip';
import { DashboardPaymentCalendar } from './DashboardPaymentCalendar';
import { BankBalancesRow } from './BankBalancesRow';
import { DashboardInvestmentsMini } from './DashboardInvestmentsMini';
import { DashboardLoansSection } from './DashboardLoansSection';
import { DashboardOverviewSkeleton } from './DashboardOverviewSkeleton';
import { RecentActivityFeed } from './RecentActivityFeed';
import { UpcomingEventsWidget } from './UpcomingEventsWidget';
import { useRecurringChatReminders } from '../hooks/useRecurringChatReminders';

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
};

export function DashboardView({
  getAccessToken,
  configHint,
  defaultCurrency,
}: DashboardViewProps) {
  const balanceRevision = useFinanceStore((s) => s.balancesRevision);
  const {
    loading,
    refreshing,
    error,
    snapshot,
    periodSummary,
    accountsSummary,
    investmentsSummary,
    loansSummary,
    refetch,
  } = useDashboard({ getAccessToken });

  const showSkeleton = loading && !snapshot;
  const cur = snapshot?.defaultCurrency ?? defaultCurrency;

  const creditCardAccounts = useMemo(
    () => accountsSummary?.accounts.filter((a) => a.type === 'CREDIT_CARD') ?? [],
    [accountsSummary?.accounts],
  );

  const dashboardReady = Boolean(snapshot && periodSummary && accountsSummary && investmentsSummary);
  useRecurringChatReminders({
    getAccessToken,
    enabled: dashboardReady,
  });

  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <Box
        component="header"
        className="col-span-12 mb-6 mt-4"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <LogoVantix size={44} aria-label="Vantix" />
          </Box>
          <Box component="h1" sx={{ typography: 'h4', fontWeight: 800 }}>
            Tu panorama
          </Box>
          <Box component="p" sx={{ typography: 'body2', color: 'text.secondary', mt: 0.5 }}>
            Resumen de periodo, cuentas, inversiones a tramos y actividad reciente.
          </Box>
        </Box>
        <Tooltip title="Actualizar datos del dashboard">
          <span>
            <IconButton
              color="primary"
              onClick={() => void refetch()}
              disabled={refreshing}
              aria-label="Actualizar datos del dashboard"
              sx={{
                alignSelf: { xs: 'flex-end', sm: 'auto' },
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {refreshing ? <CircularProgress size={22} color="inherit" /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {configHint}

      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        {showSkeleton ? (
          <DashboardOverviewSkeleton />
        ) : error && !snapshot ? (
          <div className="col-span-12 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : snapshot && periodSummary && accountsSummary && investmentsSummary ? (
          <>
            <FreeCashFlowHighlight data={snapshot} />
            <BalanceSummaryCards data={snapshot} />

            <div className="col-span-12">
              <UpcomingEventsWidget
                getAccessToken={getAccessToken}
                defaultCurrency={cur}
                balanceRevision={balanceRevision}
                onMutation={() => void refetch()}
              />
            </div>

            {creditCardAccounts.length > 0 ? (
              <DashboardCreditCardsStrip
                getAccessToken={getAccessToken}
                accounts={creditCardAccounts}
                defaultCurrency={cur}
                balanceRevision={balanceRevision}
              />
            ) : null}

            {creditCardAccounts.length > 0 ? (
              <DashboardPaymentCalendar
                getAccessToken={getAccessToken}
                creditCards={creditCardAccounts}
                allAccounts={accountsSummary.accounts}
                defaultCurrency={cur}
                balanceRevision={balanceRevision}
                onPaid={() => void refetch()}
              />
            ) : null}

            <div className="col-span-12">
              <SectionCard title="Cuentas bancarias" subtitle="Saldo por cuenta (tipo banco, moneda por defecto)">
                <BankBalancesRow banks={accountsSummary.banksBreakdown ?? []} currencyCode={cur} />
              </SectionCard>
            </div>

            <div className="col-span-12 flex flex-col gap-8 lg:col-span-8">
              <SectionCard
                title="Este mes"
                subtitle={periodLabel(periodSummary.period.from, periodSummary.period.to)}
              >
                <div className="grid grid-cols-1 items-stretch gap-4 pt-2 sm:grid-cols-3">
                  <StatCard label="Ingresos" value={formatMoney(periodSummary.totals.income, cur)} />
                  <StatCard label="Gastos" value={formatMoney(periodSummary.totals.expense, cur)} />
                  <StatCard
                    label="Flujo neto"
                    value={formatMoney(periodSummary.totals.net, cur)}
                    tone={Number(periodSummary.totals.net) >= 0 ? 'positive' : 'negative'}
                  />
                </div>
              </SectionCard>

              <DashboardInvestmentsMini data={investmentsSummary} currencyCode={cur} />

              {loansSummary && loansSummary.loans.some((l) => l.status === 'ACTIVE') ? (
                <SectionCard
                  title="Pasivos"
                  subtitle="Préstamos fijos e hipotecas — progreso de capital e intereses acumulados"
                >
                  <DashboardLoansSection
                    data={loansSummary}
                    defaultCurrency={cur}
                    getAccessToken={getAccessToken}
                  />
                </SectionCard>
              ) : null}

              <SectionCard title="Gastos por categoría">
                <Suspense fallback={<ChartFallback />}>
                  <ExpenseByCategoryChart
                    rows={periodSummary.expensesByCategory}
                    currencyCode={cur}
                  />
                </Suspense>
              </SectionCard>

              <RecentActivityFeed
                getAccessToken={getAccessToken}
                defaultCurrency={cur}
                balanceRevision={balanceRevision}
                accounts={accountsSummary.accounts}
                onMutation={() => void refetch()}
              />
            </div>

            <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
              <AiInsightsWidget data={snapshot} />
              <AiFinancialAdvisor getAccessToken={getAccessToken} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
