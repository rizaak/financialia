import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { PieChart } from '@mui/x-charts/PieChart';
import {
  PORTFOLIO_CATEGORIES,
  type DonutSegment,
  type PortfolioCategoryId,
} from '../../investments/investmentDashboardTypes';

type Props = {
  segments: DonutSegment[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
  height?: number;
  /** % meta por categoría (0–100). Si la suma &gt; 0, se dibuja anillo exterior de objetivo. */
  targetPctByCategory?: Record<PortfolioCategoryId, number>;
};

function sliceColor(theme: Theme, s: DonutSegment): string {
  if (s.funded) {
    return theme.palette.warning.main;
  }
  return s.color;
}

/**
 * Distribución de cartera con @mui/x-charts PieChart.
 * Anillo interior: posición actual (categorías fondeadas en color de éxito).
 * Anillo exterior: distribución objetivo (simulación), cuando hay metas definidas.
 */
export function MuiPortfolioPieChart({
  segments,
  formatCurrency,
  currencyCode,
  height = 300,
  targetPctByCategory,
}: Props) {
  const theme = useTheme();

  if (segments.length === 0) {
    return (
      <Box className="flex h-72 flex-col items-center justify-center text-center text-sm text-[#94a3b8]">
        <Typography color="text.secondary">Sin datos para distribución.</Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, maxWidth: 280 }}>
          Usa palabras clave en la etiqueta (BTC, ETF, CETES…) para agrupar por categoría.
        </Typography>
      </Box>
    );
  }

  const pieDataActual = segments.map((s) => ({
    id: s.categoryId,
    value: s.value,
    label: s.name,
    color: sliceColor(theme, s),
  }));

  const targetSum =
    targetPctByCategory != null
      ? PORTFOLIO_CATEGORIES.reduce((a, c) => a + (targetPctByCategory[c.id] ?? 0), 0)
      : 0;

  const targetRingData =
    targetPctByCategory != null && targetSum > 0.5
      ? (() => {
          type TargetRingSlice = {
            id: string;
            value: number;
            label: string;
            color: string;
          };
          const ordered: TargetRingSlice[] = PORTFOLIO_CATEGORIES.flatMap((meta) => {
            const tp = targetPctByCategory[meta.id] ?? 0;
            if (tp <= 0) return [];
            return [
              {
                id: `meta-${meta.id}`,
                value: tp,
                label: `${meta.label} (objetivo)`,
                color: alpha(meta.color, 0.55),
              },
            ];
          });
          const remainder = Math.max(0, 100 - targetSum);
          if (remainder > 0.5) {
            ordered.push({
              id: 'meta-remainder',
              value: remainder,
              label: 'Meta sin asignar',
              color: 'rgba(148, 163, 184, 0.45)',
            });
          }
          return ordered;
        })()
      : null;

  const series = [
    {
      type: 'pie' as const,
      innerRadius: '58%',
      outerRadius: '88%',
      paddingAngle: 2,
      sortingValues: 'none' as const,
      data: pieDataActual,
      valueFormatter: (item: { id?: string | number; value: number }) => {
        const seg = segments.find((x) => x.categoryId === item.id);
        const pct = seg?.pct ?? 0;
        const tag = seg?.funded ? ' · Fondeado' : '';
        return `${formatCurrency(item.value, currencyCode)} (${pct}%${tag})`;
      },
    },
    ...(targetRingData && targetRingData.length > 0
      ? [
          {
            type: 'pie' as const,
            innerRadius: '88%',
            outerRadius: '98%',
            paddingAngle: 2,
            sortingValues: 'none' as const,
            data: targetRingData,
            valueFormatter: (item: { value: number }) => `${item.value}% del anillo objetivo`,
          },
        ]
      : []),
  ];

  return (
    <Stack spacing={1.5}>
      {targetRingData && targetRingData.length > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
          Anillo interior: tu posición actual. Anillo exterior: distribución objetivo (metas en Objetivos).
        </Typography>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <Box sx={{ width: '100%', maxWidth: 360, height }}>
          <PieChart series={series} height={height} hideLegend />
        </Box>
        <Stack spacing={1} sx={{ minWidth: 180 }}>
          {segments.map((s) => {
            const meta = targetPctByCategory?.[s.categoryId];
            const hasMeta = meta != null && meta > 0;
            return (
              <Stack key={s.categoryId} direction="row" justifyContent="space-between" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: sliceColor(theme, s),
                      flexShrink: 0,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Typography variant="caption" fontWeight={600} noWrap>
                    {s.name}
                  </Typography>
                  {s.funded ? (
                    <Typography component="span" variant="caption" color="warning.main" fontWeight={700}>
                      · Fondeado
                    </Typography>
                  ) : null}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                  {s.pct}%
                  {hasMeta ? (
                    <Typography component="span" variant="caption" display="block" color="text.disabled">
                      meta {meta!.toFixed(0)}%
                    </Typography>
                  ) : null}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
