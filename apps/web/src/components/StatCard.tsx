import Box from '@mui/material/Box';
import { MoneyText } from './shared/MoneyText';

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
  /** Borde primario 2px + fondo ligeramente más marcado (p. ej. saldo neto). */
  variant?: 'default' | 'highlight';
  /** Etiquetas más pequeñas y números más gruesos (p. ej. vista de cuentas). */
  compact?: boolean;
};

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-zinc-900',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
};

/** KPI: importe centrado bajo la etiqueta (rejilla con `items-stretch` + `h-full`). */
export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  variant = 'default',
  compact = false,
}: StatCardProps) {
  const labelClass = compact
    ? 'shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500'
    : 'shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500';
  const valueClass = compact
    ? `text-center text-2xl font-extrabold tabular-nums leading-tight ${toneClass[tone]}`
    : `text-center text-2xl font-semibold tabular-nums leading-tight ${toneClass[tone]}`;

  const inner = (
    <>
      <p className={labelClass}>{label}</p>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pt-2">
        <p className={valueClass} style={{ letterSpacing: '-0.5px' }}>
          <MoneyText>{value}</MoneyText>
        </p>
      </div>
      {hint ? <p className="mt-auto shrink-0 pt-1 text-center text-xs text-zinc-400">{hint}</p> : null}
    </>
  );

  if (variant === 'highlight') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 132,
          p: 2.5,
          border: 2,
          borderColor: 'primary.main',
          borderRadius: 2,
          bgcolor: 'grey.50',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.07)',
        }}
      >
        {inner}
      </Box>
    );
  }

  return (
    <div className="flex h-full min-h-[132px] flex-col rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.07)]">
      {inner}
    </div>
  );
}
