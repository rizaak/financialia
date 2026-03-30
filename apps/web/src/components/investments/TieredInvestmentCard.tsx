import LockClockIcon from '@mui/icons-material/LockClock';
import { Box, Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import type { TieredInvestmentRowApi } from '../../types/investmentsSummary';
import { formatMoney } from '../../lib/formatMoney';
import { TierInterestProgressBar } from './TierInterestProgressBar';
import { VanAccountTipBubble } from './VanAccountTipBubble';

const payoutLabel: Record<TieredInvestmentRowApi['payoutFrequency'], string> = {
  DAILY: 'Pago diario',
  MONTHLY: 'Pago mensual',
  ANNUAL: 'Pago anual',
};

const moneySx = {
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums' as const,
};

type Props = {
  row: TieredInvestmentRowApi;
  currencyCode: string;
};

function formatReleaseDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TieredInvestmentCard({ row, currencyCode }: Props) {
  const principal = Number(row.principal);
  const apy = Number(row.effectiveAnnualPct);
  const daily = Number(row.dailyEstimatedEarnings);
  const cur = row.currency || currencyCode;
  const frozen = row.isLiquid === false;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'transparent',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                {frozen ? (
                  <Tooltip title={`Capital congelado hasta ${formatReleaseDate(row.maturityDate)}`}>
                    <LockClockIcon color="warning" sx={{ flexShrink: 0 }} fontSize="small" />
                  </Tooltip>
                ) : null}
                <Typography variant="h6" fontWeight={800} sx={{ minWidth: 0 }}>
                  {row.name}
                </Typography>
              </Stack>
              <VanAccountTipBubble
                accountKey={row.id}
                dailyEstimatedEarnings={row.dailyEstimatedEarnings}
                currencyCode={cur}
              />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={payoutLabel[row.payoutFrequency]}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'rgba(56, 189, 248, 0.12)',
                  color: '#7dd3fc',
                  border: '1px solid rgba(56, 189, 248, 0.28)',
                }}
              />
              {row.autoReinvest ? (
                <Chip
                  size="small"
                  label="Reinversión activa"
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'rgba(52, 211, 153, 0.12)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(52, 211, 153, 0.28)',
                  }}
                />
              ) : null}
              {frozen ? (
                <Chip
                  size="small"
                  icon={<LockClockIcon sx={{ fontSize: '1rem !important', color: '#fbbf24 !important' }} />}
                  label={`Libera ${formatReleaseDate(row.maturityDate)}`}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'rgba(251, 191, 36, 0.1)',
                    color: '#fcd34d',
                    border: '1px solid rgba(251, 191, 36, 0.28)',
                  }}
                />
              ) : null}
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03) !important',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
            }}
          >
            <Box
              flex={1}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: { xs: '1px solid', sm: 'none' },
                borderRight: { sm: '1px solid' },
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                Capital
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ ...moneySx, color: '#ffffff' }}>
                {formatMoney(row.principal, cur)}
              </Typography>
            </Box>
            <Box
              flex={1}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: { xs: '1px solid', sm: 'none' },
                borderRight: { sm: '1px solid' },
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                APY promedio (referencia)
              </Typography>
              <Typography variant="body1" fontWeight={800} sx={{ ...moneySx, color: '#ffffff' }}>
                {Number.isFinite(apy) ? `${apy.toFixed(2)}%` : '—'}
              </Typography>
            </Box>
            <Box flex={1} sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                Ganancia diaria estimada
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={{ ...moneySx, color: '#ffffff' }}>
                {Number.isFinite(daily) ? formatMoney(String(daily), cur) : '—'}
              </Typography>
            </Box>
          </Box>

          <TierInterestProgressBar
            principal={principal}
            tierProgressWithin={row.tierProgress01}
            segments={
              row.tierSegments && row.tierSegments.length > 0
                ? row.tierSegments.map((s) => ({
                    sortOrder: s.sortOrder,
                    annualRatePct: s.annualRatePct,
                    fractionOfPrincipal: s.fractionOfPrincipal,
                  }))
                : undefined
            }
            title="Distribución del capital por tramo (tasa nominal)"
          />

          <Typography variant="caption" color="text.secondary">
            {row.tierProgressMessage}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
