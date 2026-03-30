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

const iconTintByStat: Record<InvestmentStatKey, { bg: string; color: string }> = {
  patrimonio: { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' },
  rendimiento: { bg: 'rgba(52, 211, 153, 0.14)', color: '#34d399' },
  ritmo: { bg: 'rgba(167, 139, 250, 0.16)', color: '#a78bfa' },
  proyeccion: { bg: 'rgba(56, 189, 248, 0.12)', color: '#22d3ee' },
};

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
  const iconTint = statKey ? iconTintByStat[statKey] : null;

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
        overflow: 'visible',
        ...(isHero
          ? {
              borderColor: 'rgba(56, 189, 248, 0.35)',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }
          : {}),
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
                bgcolor: iconTint?.bg ?? 'rgba(56, 189, 248, 0.15)',
                color: iconTint?.color ?? '#38bdf8',
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
            color={
              tone === 'negative'
                ? 'error.main'
                : tone === 'positive' && statKey === 'rendimiento'
                  ? 'success.light'
                  : '#ffffff'
            }
            sx={{
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.15,
              ...(isProyeccion ? { fontSize: { xs: '1.35rem', sm: '1.5rem' }, color: '#6ee7b7' } : {}),
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
