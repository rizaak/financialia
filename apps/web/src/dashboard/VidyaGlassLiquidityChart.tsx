import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { formatMoney } from '../lib/formatMoney';

export type LiquidityGlassTotals = {
  banks: string;
  wallets: string;
  investments: string;
  creditDebt: string;
};

const R = 15.9155;
/** Circunferencia ~100 unidades (patrón viewBox 36×36). */
const C = 2 * Math.PI * R;

type Segment = { key: string; label: string; value: number; stroke: string };

const GLASS_WRAP_SX = {
  borderRadius: 3,
  p: 2,
  background: 'linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 4px 24px rgba(2, 6, 23, 0.35)',
  filter: 'drop-shadow(0 10px 28px rgba(37, 99, 235, 0.42))',
} as const;

function buildSegments(totals: LiquidityGlassTotals): Segment[] {
  const banks = Math.max(0, Number(totals.banks));
  const wallets = Math.max(0, Number(totals.wallets));
  const inv = Math.max(0, Number(totals.investments));
  const debt = Math.max(0, Number(totals.creditDebt));
  const raw: Segment[] = [
    { key: 'banks', label: 'Bancos', value: banks, stroke: 'rgba(56, 189, 248, 0.92)' },
    { key: 'wallets', label: 'Carteras', value: wallets, stroke: 'rgba(167, 139, 250, 0.92)' },
    { key: 'investments', label: 'Inversiones', value: inv, stroke: 'rgba(52, 211, 153, 0.92)' },
    { key: 'debt', label: 'Deuda TC', value: debt, stroke: 'rgba(251, 113, 133, 0.95)' },
  ];
  return raw.filter((s) => s.value > 0.004);
}

type DonutProps = {
  totals: LiquidityGlassTotals;
  currencyCode: string;
  /** Patrimonio neto total (centro). */
  totalNetWorth: string;
  /** Diámetro aproximado del SVG en px. */
  sizePx: number;
};

function GlassDonut({ totals, currencyCode, totalNetWorth, sizePx }: DonutProps) {
  const segments = useMemo(() => buildSegments(totals), [totals]);
  const total = segments.reduce((s, x) => s + x.value, 0);

  const rings = useMemo(() => {
    if (total <= 0) return [];
    let cum = 0;
    return segments.map((seg) => {
      const len = (seg.value / total) * C;
      const dash = `${len} ${Math.max(0.001, C - len)}`;
      const offset = -cum;
      cum += len;
      return { ...seg, dash, offset };
    });
  }, [segments, total]);

  const netLabel = formatMoney(totalNetWorth, currencyCode);
  const shortNet =
    netLabel.length > 14 ? `${netLabel.slice(0, 12)}…` : netLabel;

  return (
    <Box sx={{ ...GLASS_WRAP_SX, width: '100%', maxWidth: sizePx + 32 }}>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          display: 'block',
          textAlign: 'center',
          letterSpacing: 0.08,
          textTransform: 'uppercase',
          color: 'rgba(226, 232, 240, 0.85)',
          mb: 1,
        }}
      >
        Composición
      </Typography>
      <Box sx={{ position: 'relative', width: sizePx, height: sizePx, mx: 'auto' }}>
        <svg width={sizePx} height={sizePx} viewBox="0 0 36 36" aria-hidden style={{ display: 'block' }}>
          <circle
            r={R}
            cx="18"
            cy="18"
            fill="transparent"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3.2"
          />
          {total > 0
            ? rings.map((r) => (
                <circle
                  key={r.key}
                  r={R}
                  cx="18"
                  cy="18"
                  fill="transparent"
                  stroke={r.stroke}
                  strokeWidth="3.35"
                  strokeDasharray={r.dash}
                  strokeDashoffset={r.offset}
                  transform="rotate(-90 18 18)"
                  strokeLinecap="round"
                />
              ))
            : null}
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            px: 1,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: 'rgba(226, 232, 240, 0.75)', fontWeight: 600, lineHeight: 1.2 }}
          >
            Patrimonio neto
          </Typography>
          <Typography
            component="div"
            sx={{
              fontWeight: 800,
              fontSize: sizePx < 200 ? '0.95rem' : '1.05rem',
              lineHeight: 1.15,
              color: '#f8fafc',
              fontVariantNumeric: 'tabular-nums',
              wordBreak: 'break-word',
            }}
            title={netLabel}
          >
            {shortNet}
          </Typography>
        </Box>
      </Box>
      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        {segments.map((s) => (
          <Stack key={s.key} direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: s.stroke,
                  boxShadow: '0 0 8px rgba(59, 130, 246, 0.35)',
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.9)' }}>
                {s.label}
              </Typography>
            </Stack>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(String(s.value), currencyCode)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export type VidyaGlassLiquidityChartProps = {
  totals: LiquidityGlassTotals;
  currencyCode: string;
  totalNetWorth: string;
  /** `compact` ~168px; `comfortable` ~220px. */
  density?: 'compact' | 'comfortable';
};

export function VidyaGlassLiquidityChart({
  totals,
  currencyCode,
  totalNetWorth,
  density = 'comfortable',
}: VidyaGlassLiquidityChartProps) {
  const sizePx = density === 'compact' ? 168 : 220;
  return (
    <GlassDonut totals={totals} currencyCode={currencyCode} totalNetWorth={totalNetWorth} sizePx={sizePx} />
  );
}

export type LiquidityAvailableGlassBarProps = {
  freeCashFlow: string;
  totalLiquid: string;
  currencyCode: string;
};

/** Barra horizontal tipo “vidrio” para móvil: liquidez disponible vs líquido total. */
export function LiquidityAvailableGlassBar({
  freeCashFlow,
  totalLiquid,
  currencyCode,
}: LiquidityAvailableGlassBarProps) {
  const num = Number(freeCashFlow);
  const den = Number(totalLiquid);
  const pct =
    den > 0 && Number.isFinite(num) && Number.isFinite(den)
      ? Math.min(100, Math.max(0, (num / den) * 100))
      : 0;

  return (
    <Box sx={GLASS_WRAP_SX}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 1.25 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'rgba(226,232,240,0.95)' }}>
          Liquidez disponible
        </Typography>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(freeCashFlow, currencyCode)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(37,99,235,0.95) 0%, rgba(52,211,153,0.95) 100%)',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.55)',
          },
        }}
      />
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(226,232,240,0.65)' }}>
        {den > 0
          ? `${pct.toFixed(0)}% de tu líquido total queda libre de compromisos del mes.`
          : 'Añade saldos en cuentas para medir tu liquidez disponible.'}
      </Typography>
    </Box>
  );
}
