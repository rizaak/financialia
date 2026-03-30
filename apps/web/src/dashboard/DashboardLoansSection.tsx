import { Box, Button, Chip, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useState } from 'react';
import type { LoansDashboardSummary, LoanSummaryRow, PrepaymentStrategy } from '../api/fetchLoans';
import { formatMoney } from '../lib/formatMoney';
import { LoanAmortizationChart } from './LoanAmortizationChart';
import { LoanExtraPaymentSimulatorDialog } from './LoanExtraPaymentSimulatorDialog';

function LoanCard({
  row,
  defaultCurrency,
  getAccessToken,
}: {
  row: LoanSummaryRow;
  defaultCurrency: string;
  getAccessToken: () => Promise<string>;
}) {
  const theme = useTheme();
  const [simOpen, setSimOpen] = useState(false);
  const [chartScenario, setChartScenario] = useState<{
    extraAmount: number;
    strategy: PrepaymentStrategy;
  } | null>(null);
  const cur = row.currency || defaultCurrency;
  const paid = Number(row.principalPaid);
  const remaining = Number(row.currentBalance);
  const total = paid + remaining;
  const pct = total > 0 ? Math.round((paid / total) * 1000) / 10 : 0;
  const labelKind = row.kind === 'MORTGAGE' ? 'Hipoteca' : 'Crédito personal';

  const pieData = [
    {
      id: 0,
      value: Math.max(0, paid),
      label: 'Capital amortizado',
      color: theme.palette.primary.main,
    },
    {
      id: 1,
      value: Math.max(0, remaining),
      label: 'Capital pendiente',
      color: theme.palette.grey[600],
    },
  ].filter((d) => d.value > 0);

  return (
    <Box
      sx={{
        borderRadius: '20px',
        border: 1,
        borderColor: 'divider',
        p: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
        <Typography variant="subtitle1" fontWeight={700}>
          {row.name}
        </Typography>
        <Chip size="small" label={labelKind} variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Has pagado el <strong>{pct}%</strong> del capital de tu {row.kind === 'MORTGAGE' ? 'vivienda' : 'préstamo'}.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Box sx={{ width: '100%', maxWidth: 220, height: 200 }}>
          {pieData.length > 0 ? (
            <PieChart
              series={[
                {
                  type: 'pie',
                  innerRadius: '55%',
                  outerRadius: '90%',
                  paddingAngle: 2,
                  data: pieData,
                  valueFormatter: (item) => formatMoney(Number(item.value), cur),
                },
              ]}
              height={200}
              hideLegend
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              Sin datos de capital.
            </Typography>
          )}
        </Box>
        <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progreso del capital
              </Typography>
              <Typography variant="caption" fontWeight={700}>
                {pct}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(100, pct)} sx={{ height: 10, borderRadius: 1 }} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Intereses acumulados pagados (registrados):{' '}
            <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}>
              {formatMoney(row.cumulativeInterestPaid, cur)}
            </Box>
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Mensualidad: {formatMoney(row.monthlyPayment, cur)} · Pendiente capital:{' '}
            {formatMoney(row.currentBalance, cur)}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start', mt: 1, textTransform: 'none', fontWeight: 600 }}
            onClick={() => setSimOpen(true)}
          >
            Simular Abono a Capital
          </Button>
        </Stack>
      </Stack>
      <LoanAmortizationChart
        loanId={row.id}
        name={row.name}
        kind={row.kind}
        currency={cur}
        totalAmount={row.totalAmount}
        currentBalance={row.currentBalance}
        monthlyPayment={row.monthlyPayment}
        annualRate={row.interestRateAnnual}
        startDate={row.startDate}
        termMonths={row.termMonths}
        getAccessToken={getAccessToken}
        scenario={chartScenario}
        onClearScenario={() => setChartScenario(null)}
      />
      <LoanExtraPaymentSimulatorDialog
        open={simOpen}
        onClose={() => setSimOpen(false)}
        loanId={row.id}
        loanName={row.name}
        currency={cur}
        currentBalance={row.currentBalance}
        getAccessToken={getAccessToken}
        onPinToChart={(extra, strategy) => setChartScenario({ extraAmount: extra, strategy })}
      />
    </Box>
  );
}

export type DashboardLoansSectionProps = {
  data: LoansDashboardSummary;
  defaultCurrency: string;
  getAccessToken: () => Promise<string>;
};

export function DashboardLoansSection({
  data,
  defaultCurrency,
  getAccessToken,
}: DashboardLoansSectionProps) {
  const active = data.loans.filter((l) => l.status === 'ACTIVE');
  if (active.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Capital pendiente total:{' '}
        <strong>{formatMoney(data.aggregate.totalPrincipalRemaining, defaultCurrency)}</strong>
        {' · '}
        Intereses pagados (histórico):{' '}
        <strong>{formatMoney(data.aggregate.totalCumulativeInterestPaid, defaultCurrency)}</strong>
        {' · '}
        Servicio de deuda mensual (activos):{' '}
        <strong>{formatMoney(data.aggregate.monthlyDebtService, defaultCurrency)}</strong>
      </Typography>
      {active.map((row) => (
        <LoanCard
          key={row.id}
          row={row}
          defaultCurrency={defaultCurrency}
          getAccessToken={getAccessToken}
        />
      ))}
    </Stack>
  );
}
