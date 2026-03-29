import { Box, Stack, Typography, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import type { DonutSegment } from '../../investments/investmentDashboardTypes';

type Props = {
  segments: DonutSegment[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
  height?: number;
};

/**
 * Distribución de cartera con @mui/x-charts PieChart.
 */
export function MuiPortfolioPieChart({
  segments,
  formatCurrency,
  currencyCode,
  height = 300,
}: Props) {
  const theme = useTheme();

  if (segments.length === 0) {
    return (
      <Box className="flex h-72 flex-col items-center justify-center text-center text-sm text-zinc-500">
        <Typography color="text.secondary">Sin datos para distribución.</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, maxWidth: 280 }}>
          Usa palabras clave en la etiqueta (BTC, ETF, CETES…) para agrupar por categoría.
        </Typography>
      </Box>
    );
  }

  const pieData = segments.map((s, i) => ({
    id: i,
    value: s.value,
    label: s.name,
    color: s.color,
  }));

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
      <Box sx={{ width: '100%', maxWidth: 360, height }}>
        <PieChart
          series={[
            {
              type: 'pie',
              innerRadius: '58%',
              outerRadius: '88%',
              paddingAngle: 2,
              data: pieData,
              valueFormatter: (item) => {
                const idx = typeof item.id === 'number' ? item.id : 0;
                const seg = segments[idx];
                const pct = seg?.pct ?? 0;
                return `${formatCurrency(item.value, currencyCode)} (${pct}%)`;
              },
            },
          ]}
          height={height}
          hideLegend
        />
      </Box>
      <Stack spacing={1} sx={{ minWidth: 160 }}>
        {segments.map((s) => (
          <Stack key={s.categoryId} direction="row" justifyContent="space-between" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: s.color,
                  flexShrink: 0,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
              <Typography variant="caption" fontWeight={600} noWrap>
                {s.name}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {s.pct}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
