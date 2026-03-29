import { Box, Button, CircularProgress, Paper, Stack, Typography, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchAmortizationSchedule,
  type LoanKind,
  type PrepaymentStrategy,
} from '../api/fetchLoans';
import { formatMoney } from '../lib/formatMoney';
import {
  buildAmortizationChartPoints,
  monthsElapsedFromLoanStart,
  type AmortizationChartPoint,
} from './loan-amortization-chart.utils';

function equityLabel(kind: LoanKind): string {
  if (kind === 'MORTGAGE') return 'vivienda';
  return 'préstamo';
}

function LoanEquityGauge({
  percent,
  kind,
  currency,
}: {
  percent: number;
  kind: LoanKind;
  currency: string;
}) {
  const theme = useTheme();
  const p = Math.min(100, Math.max(0, percent));
  const label = equityLabel(kind);

  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Patrimonio del crédito ({currency})
      </Typography>
      <Box sx={{ width: 240, height: 130, mx: 'auto', position: 'relative' }}>
        <PieChart
          series={[
            {
              type: 'pie',
              innerRadius: '62%',
              outerRadius: '98%',
              paddingAngle: 1,
              startAngle: 180,
              endAngle: 0,
              data: [
                { id: 0, value: p, label: 'tuyo', color: theme.palette.primary.main },
                { id: 1, value: 100 - p, label: 'pendiente', color: theme.palette.grey[300] },
              ],
              valueFormatter: () => '',
            },
          ]}
          height={130}
          hideLegend
          margin={{ top: 4, bottom: 0, left: 0, right: 0 }}
        />
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'primary.main',
          }}
        >
          {p.toFixed(0)}%
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 320, mx: 'auto' }}>
        Eres dueño del <strong>{p.toFixed(1)}%</strong> de tu {label} (capital amortizado vs. monto
        original).
      </Typography>
    </Box>
  );
}

function ChartTooltip({
  active,
  payload,
  currency,
  monthsElapsed,
}: {
  active?: boolean;
  payload?: Array<{ payload: AmortizationChartPoint }>;
  currency: string;
  monthsElapsed: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const future = p.month > monthsElapsed;
  const verb = future ? 'habrás' : 'habías';
  return (
    <Paper elevation={3} sx={{ px: 1.5, py: 1, maxWidth: 320 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        Mes {p.month}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        En el mes {p.month}, {verb} pagado{' '}
        <strong>{formatMoney(p.cumulativeInterest, currency)}</strong> en intereses y{' '}
        <strong>{formatMoney(p.cumulativePrincipal, currency)}</strong> en capital (acumulado
        contractual).
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Tu deuda restante será de{' '}
        <strong>{formatMoney(p.balance, currency)}</strong>
        {future ? ' (proyección contractual).' : '.'}
      </Typography>
      {p.scenarioBalance != null ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Con el abono simulado, el saldo caería a{' '}
          <strong>{formatMoney(p.scenarioBalance, currency)}</strong>.
        </Typography>
      ) : null}
    </Paper>
  );
}

export type LoanAmortizationChartProps = {
  loanId: string;
  name: string;
  kind: LoanKind;
  currency: string;
  totalAmount: string;
  currentBalance: string;
  monthlyPayment: string;
  annualRate: string;
  startDate: string;
  termMonths: number;
  getAccessToken: () => Promise<string>;
  scenario: { extraAmount: number; strategy: PrepaymentStrategy } | null;
  onClearScenario?: () => void;
};

export function LoanAmortizationChart({
  loanId,
  name,
  kind,
  currency,
  totalAmount,
  currentBalance,
  monthlyPayment,
  annualRate,
  startDate,
  termMonths,
  getAccessToken,
  scenario,
  onClearScenario,
}: LoanAmortizationChartProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<AmortizationChartPoint[]>([]);

  const monthsElapsed = useMemo(
    () => monthsElapsedFromLoanStart(startDate, termMonths),
    [startDate, termMonths],
  );

  const equityPct = useMemo(() => {
    const t = Number(totalAmount);
    const c = Number(currentBalance);
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(c)) return 0;
    return ((t - c) / t) * 100;
  }, [totalAmount, currentBalance]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sched = await fetchAmortizationSchedule(getAccessToken, loanId);
      const pts = buildAmortizationChartPoints(
        sched.rows,
        Number(sched.principal),
        Number(monthlyPayment),
        Number(annualRate),
        startDate,
        termMonths,
        scenario,
      );
      setChartData(pts);
    } catch (e) {
      setChartData([]);
      setError(e instanceof Error ? e.message : 'No se pudo cargar la amortización.');
    } finally {
      setLoading(false);
    }
  }, [
    annualRate,
    getAccessToken,
    loanId,
    monthlyPayment,
    scenario,
    startDate,
    termMonths,
    totalAmount,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const dataForRecharts = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        scenarioBalance: d.scenarioBalance ?? undefined,
      })),
    [chartData],
  );

  if (loading) {
    return (
      <Box className="flex items-center justify-center py-6">
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  if (dataForRecharts.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        Evolución del crédito (tabla contractual)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {name} · La mancha naranja muestra intereses acumulados; el verde, capital ya pagado. La línea
        azul es tu saldo insoluto.
        {scenario && scenario.strategy === 'REDUCE_TERM'
          ? ' La línea gris punteada proyecta el saldo si hoy abonaras a capital (reducir plazo).'
          : ''}
      </Typography>
      {scenario && onClearScenario ? (
        <Button size="small" variant="text" color="inherit" onClick={onClearScenario} sx={{ alignSelf: 'flex-start' }}>
          Quitar comparación de escenario
        </Button>
      ) : null}
      <Box sx={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataForRecharts} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickFormatter={(m: number) =>
                m === 1 || m % 12 === 0 ? `Año ${Math.max(1, Math.ceil(m / 12))}` : ''
              }
              interval={11}
              minTickGap={24}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) =>
                formatMoney(v, currency).replace(/\s/g, ' ').slice(0, 12)
              }
              width={56}
              tick={{ fontSize: 10 }}
              label={{ value: 'Acumulado (capital + int.)', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) =>
                formatMoney(v, currency).replace(/\s/g, ' ').slice(0, 12)
              }
              width={56}
              tick={{ fontSize: 10 }}
              label={{ value: 'Saldo', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
            />
            <Tooltip
              content={<ChartTooltip currency={currency} monthsElapsed={monthsElapsed} />}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cumulativeInterest"
              name="Intereses acumulados"
              stackId="pay"
              fill={theme.palette.warning.main}
              stroke={theme.palette.warning.dark}
              fillOpacity={0.85}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cumulativePrincipal"
              name="Capital amortizado"
              stackId="pay"
              fill={theme.palette.success.main}
              stroke={theme.palette.success.dark}
              fillOpacity={0.85}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="balance"
              name="Saldo insoluto"
              stroke={theme.palette.info.dark}
              strokeWidth={2}
              dot={false}
            />
            {scenario && scenario.strategy === 'REDUCE_TERM' ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="scenarioBalance"
                name="Saldo (abono simulado)"
                stroke={theme.palette.grey[500]}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      <LoanEquityGauge percent={equityPct} kind={kind} currency={currency} />
    </Stack>
  );
}
