import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import type { TieredInvestmentRowApi } from '../../types/investmentsSummary';
import { formatMoney } from '../../lib/formatMoney';
import { TierInterestProgressBar } from './TierInterestProgressBar';

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

export function TieredInvestmentCard({ row, currencyCode }: Props) {
  const principal = Number(row.principal);
  const apy = Number(row.effectiveAnnualPct);
  const daily = Number(row.dailyEstimatedEarnings);
  const cur = row.currency || currencyCode;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 2px 16px -4px rgba(15, 23, 42, 0.07), 0 4px 24px -8px rgba(15, 23, 42, 0.06)',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Typography variant="h6" fontWeight={800}>
              {row.name}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={payoutLabel[row.payoutFrequency]}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'info.50',
                  color: 'info.dark',
                  border: 'none',
                }}
              />
              {row.autoReinvest ? (
                <Chip
                  size="small"
                  label="Reinversión activa"
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'success.50',
                    color: 'success.dark',
                    border: 'none',
                  }}
                />
              ) : null}
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              borderRadius: 2,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
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
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Capital
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={moneySx}>
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
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                APY promedio (referencia)
              </Typography>
              <Typography variant="body1" fontWeight={800} color="success.main" sx={moneySx}>
                {Number.isFinite(apy) ? `${apy.toFixed(2)}%` : '—'}
              </Typography>
            </Box>
            <Box flex={1} sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Ganancia diaria estimada
              </Typography>
              <Typography variant="body1" fontWeight={700} sx={moneySx}>
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
