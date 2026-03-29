import { useTheme } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import type { GrowthData } from '../../investments/investmentDashboardTypes';

type Props = {
  data: GrowthData[];
  currencyCode: string;
  formatCurrency: (value: number, code: string) => string;
  height?: number;
};

/**
 * Crecimiento de inversión con @mui/x-charts LineChart.
 */
export function MuiGrowthLineChart({ data, currencyCode, formatCurrency, height = 320 }: Props) {
  const theme = useTheme();

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Añade posiciones para ver la proyección.
      </div>
    );
  }

  const labels = data.map((d) => d.monthLabel);
  const values = data.map((d) => d.value);

  return (
    <LineChart
      xAxis={[{ scaleType: 'point', data: labels }]}
      yAxis={[
        {
          valueFormatter: (v: number | null) => formatCurrency(Number(v ?? 0), currencyCode),
        },
      ]}
      series={[
        {
          type: 'line',
          data: values,
          area: true,
          color: theme.palette.primary.main,
          showMark: false,
          label: 'Proyección',
          valueFormatter: (v: number | null) => formatCurrency(Number(v ?? 0), currencyCode),
        },
      ]}
      height={height}
      margin={{ left: 72, right: 16, top: 16, bottom: 32 }}
      hideLegend
      grid={{ horizontal: true }}
    />
  );
}
