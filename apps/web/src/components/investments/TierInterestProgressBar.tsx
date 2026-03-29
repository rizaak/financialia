import { Box, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import {
  DEMO_TIER_STRATEGY,
  getActiveTierIndex,
  type InterestTier,
} from '../../hooks/useTierInterest';

export type TierSegmentUi = {
  sortOrder: number;
  annualRatePct: string;
  fractionOfPrincipal: number;
};

export type TierInterestProgressBarProps = {
  /** Capital posicionado (misma moneda que los topes del demo). */
  principal: number;
  /** Segmentos desde el backend (fracción del capital por tasa). */
  segments?: TierSegmentUi[];
  tiers?: InterestTier[];
  /** 0–1: cupo usado dentro del tramo actual (API). */
  tierProgressWithin?: number;
  title?: string;
};

const SEGMENT_PALETTE = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#94a3b8'];

/**
 * Barra segmentada: con `segments` del API muestra proporción real por tramo; si no, demo por tramos iguales.
 */
export function TierInterestProgressBar({
  principal,
  segments,
  tiers = DEMO_TIER_STRATEGY,
  tierProgressWithin,
  title = 'Tramos de interés',
}: TierInterestProgressBarProps) {
  const theme = useTheme();
  const active = getActiveTierIndex(principal, tiers);
  const segmentColors = ['#f87171', '#fbbf24', theme.palette.grey[400]];
  const useApiSegments = Boolean(segments && segments.length > 0);

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      <Typography variant="subtitle2" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          height: 12,
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {useApiSegments
          ? segments!.map((s, i) => (
              <Box
                key={`${s.sortOrder}-${i}`}
                sx={{
                  width: `${Math.max(0, Math.min(1, s.fractionOfPrincipal)) * 100}%`,
                  minWidth: s.fractionOfPrincipal > 0.02 ? 4 : 0,
                  bgcolor: SEGMENT_PALETTE[i % SEGMENT_PALETTE.length],
                  transition: 'width 0.2s',
                }}
                title={`${s.annualRatePct}% nominal · ${(s.fractionOfPrincipal * 100).toFixed(1)}% del capital`}
              />
            ))
          : tiers.map((t, i) => (
              <Box
                key={t.id}
                sx={{
                  flex: 1,
                  bgcolor: segmentColors[i % segmentColors.length],
                  opacity: i === active ? 1 : 0.4,
                  transition: 'opacity 0.2s',
                }}
                title={`${t.ratePct}%`}
              />
            ))}
      </Box>
      {useApiSegments ? (
        <Stack direction="row" flexWrap="wrap" gap={2} useFlexGap>
          {segments!.map((s, i) => (
            <Typography key={`${s.sortOrder}-${i}`} variant="caption" color="text.secondary" fontWeight={600}>
              {s.sortOrder >= 9000 ? 'Remanente' : `Tramo ${s.sortOrder + 1}`}: {s.annualRatePct}% ·{' '}
              {(s.fractionOfPrincipal * 100).toFixed(1)}% cap.
            </Typography>
          ))}
        </Stack>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={2} useFlexGap>
          {tiers.map((t, i) => (
            <Typography
              key={t.id}
              variant="caption"
              color={i === active ? 'primary' : 'text.secondary'}
              fontWeight={i === active ? 700 : 400}
            >
              Tramo {i + 1}: {t.ratePct}% {i === active ? '(activo)' : ''}
            </Typography>
          ))}
        </Stack>
      )}
      {tierProgressWithin != null && Number.isFinite(tierProgressWithin) ? (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Uso del cupo en el tramo actual
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, tierProgressWithin * 100))}
            sx={{
              height: 12,
              borderRadius: '999px',
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': { borderRadius: '999px' },
            }}
          />
        </Stack>
      ) : null}
      <Typography variant="body2" color="text.secondary">
        Capital de referencia:{' '}
        <Box component="span" fontWeight={600} color="text.primary">
          {principal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
        </Box>
        {!useApiSegments ? (
          <>
            {' '}
            · Tasa demo: <strong>{tiers[active]?.ratePct ?? 0}%</strong>
          </>
        ) : null}
      </Typography>
    </Stack>
  );
}
