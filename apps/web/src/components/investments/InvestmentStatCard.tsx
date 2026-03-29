import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import AutoGraphOutlined from '@mui/icons-material/AutoGraphOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import { Box, Card, CardContent, CardHeader, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export type InvestmentStatKey = 'patrimonio' | 'rendimiento' | 'ritmo' | 'proyeccion';

type Tone = 'default' | 'positive' | 'negative';

type Props = {
  label: string;
  value: string;
  hint?: string;
  /** Tarjeta principal (patrimonio). */
  variant?: 'default' | 'hero';
  tone?: Tone;
  /** Flecha al lado del valor (p. ej. rendimiento %). */
  showTrendArrow?: boolean;
  /** Icono y estilo premium por métrica. */
  statKey?: InvestmentStatKey;
};

const toneColor: Record<Tone, string> = {
  default: 'text.primary',
  positive: 'success.main',
  negative: 'error.main',
};

function TrendArrow({ tone }: { tone: Tone }) {
  if (tone === 'positive') {
    return (
      <svg
        className="inline-block h-5 w-5 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  if (tone === 'negative') {
    return (
      <svg
        className="inline-block h-5 w-5 text-rose-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  }
  return null;
}

const iconByStat: Record<InvestmentStatKey, ReactNode> = {
  patrimonio: <AccountBalanceWalletOutlined sx={{ fontSize: 22 }} />,
  rendimiento: <TrendingUpOutlined sx={{ fontSize: 22 }} />,
  ritmo: <SpeedOutlined sx={{ fontSize: 22 }} />,
  proyeccion: <AutoGraphOutlined sx={{ fontSize: 22 }} />,
};

const cardShadow = '0 2px 16px -4px rgba(15, 23, 42, 0.07), 0 4px 24px -8px rgba(15, 23, 42, 0.06)';

export function InvestmentStatCard({
  label,
  value,
  hint,
  variant = 'default',
  tone = 'default',
  showTrendArrow = false,
  statKey,
}: Props) {
  const isHero = variant === 'hero';
  const isProyeccion = statKey === 'proyeccion';
  const headerIcon = statKey ? iconByStat[statKey] : null;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: cardShadow,
        overflow: 'visible',
        ...(isHero ? { borderColor: 'success.light', bgcolor: 'grey.50' } : {}),
      }}
    >
      <CardHeader
        avatar={
          headerIcon ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'action.hover',
                color: 'primary.main',
              }}
            >
              {headerIcon}
            </Box>
          ) : undefined
        }
        title={label}
        titleTypographyProps={{
          variant: 'overline',
          color: 'text.secondary',
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
        sx={{ pb: 0, pt: 2, px: 2, '& .MuiCardHeader-avatar': { mr: 1.5 } }}
      />
      <CardContent sx={{ pt: 1, pb: 2, px: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: isHero ? 44 : 40,
          }}
        >
          {showTrendArrow ? <TrendArrow tone={tone} /> : null}
          <Typography
            component="p"
            variant={isProyeccion ? 'h5' : isHero ? 'h4' : 'h6'}
            fontWeight={800}
            color={isProyeccion ? 'success.main' : toneColor[tone]}
            sx={{
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.15,
              ...(isProyeccion ? { fontSize: { xs: '1.35rem', sm: '1.5rem' } } : {}),
            }}
          >
            {value}
          </Typography>
        </Box>
        {hint ? (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', lineHeight: 1.4 }}>
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
