import { Box, LinearProgress, Stack, Typography } from '@mui/material';
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

function dominantSegmentIndex(segments: TierSegmentUi[]): number {
  if (segments.length === 0) return 0;
  let best = 0;
  let max = -1;
  segments.forEach((s, i) => {
    if (s.fractionOfPrincipal > max) {
      max = s.fractionOfPrincipal;
      best = i;
    }
  });
  return best;
}

/**
 * Barra única minimalista + indicador «Tramo actual» (brillo solo con capital en tramos).
 */
export function TierInterestProgressBar({
  principal,
  segments,
  tiers = DEMO_TIER_STRATEGY,
  tierProgressWithin,
  title = 'Tramos de interés',
}: TierInterestProgressBarProps) {
  const active = getActiveTierIndex(principal, tiers);
  const segmentColors = ['#f87171', '#fbbf24', 'rgba(148, 163, 184, 0.55)'];
  const useApiSegments = Boolean(segments && segments.length > 0);
  const capitalWorking = principal > 0;

  const domIdx = useApiSegments ? dominantSegmentIndex(segments!) : active;
  const currentRateLabel = useApiSegments
    ? `${segments![domIdx]?.annualRatePct ?? '—'}% nominal`
    : `${tiers[active]?.ratePct ?? 0}%`;

  const cupoPct =
    tierProgressWithin != null && Number.isFinite(tierProgressWithin)
      ? Math.min(100, Math.max(0, tierProgressWithin * 100))
      : null;

  return (
    <Stack spacing={1.25} sx={{ width: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
        <Typography variant="subtitle2" fontWeight={600} color="text.primary">
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Ref.{' '}
          <Box component="span" fontWeight={600} sx={{ color: 'text.primary' }}>
            {principal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </Box>
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            display: 'flex',
            height: 10,
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            bgcolor: 'rgba(255,255,255,0.04)',
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
                    opacity: i === domIdx && capitalWorking ? 1 : capitalWorking ? 0.55 : 0.35,
                    boxShadow:
                      i === domIdx && capitalWorking
                        ? '0 0 16px rgba(52, 211, 153, 0.35)'
                        : undefined,
                  }}
                  title={`${s.annualRatePct}% · ${(s.fractionOfPrincipal * 100).toFixed(1)}% del capital`}
                />
              ))
            : tiers.map((t, i) => (
                <Box
                  key={t.id}
                  sx={{
                    flex: 1,
                    bgcolor: segmentColors[i % segmentColors.length],
                    opacity: i === active ? 1 : 0.35,
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    boxShadow:
                      i === active && capitalWorking
                        ? '0 0 14px rgba(52, 211, 153, 0.35)'
                        : undefined,
                  }}
                  title={`${t.ratePct}%`}
                />
              ))}
        </Box>
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: '999px',
            border: '1px solid',
            borderColor: capitalWorking ? 'rgba(52, 211, 153, 0.45)' : 'rgba(255,255,255,0.08)',
            bgcolor: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            boxShadow: capitalWorking
              ? '0 0 20px rgba(52, 211, 153, 0.25), inset 0 0 12px rgba(52, 211, 153, 0.08)'
              : 'none',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            letterSpacing={0.02}
            sx={{
              color: capitalWorking ? 'success.light' : '#94a3b8',
              textTransform: 'uppercase',
              fontSize: '0.65rem',
            }}
          >
            Tramo actual
          </Typography>
          <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
            {currentRateLabel}
          </Typography>
        </Box>

        {cupoPct != null ? (
          <Box sx={{ flex: '1 1 140px', minWidth: 120, maxWidth: 280 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 0.35 }}>
              Cupo del tramo
            </Typography>
            <LinearProgress
              variant="determinate"
              value={cupoPct}
              sx={{
                height: 6,
                borderRadius: '999px',
                bgcolor: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: '999px',
                  bgcolor: 'primary.light',
                  boxShadow: capitalWorking ? '0 0 12px rgba(96, 165, 250, 0.45)' : undefined,
                },
              }}
            />
          </Box>
        ) : null}
      </Stack>
    </Stack>
  );
}
