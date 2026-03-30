import { Box, Chip, LinearProgress, Paper, Typography } from '@mui/material';
import {
  PORTFOLIO_CATEGORIES,
  type PortfolioCategoryId,
} from '../../investments/investmentDashboardTypes';
import {
  normalizeAllocationPercentages,
  validateAllocationPercentagesSum,
} from '../../lib/investmentDashboardMath';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white shadow-none outline-none backdrop-blur-sm placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-500/20';

export type TargetAllocationToolProps = {
  /** Valores de texto por categoría (porcentaje meta). */
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  /** % actual del patrimonio por categoría (0–100). */
  actualPctByCategory: Record<PortfolioCategoryId, number>;
};

function parseTargetPct(raw: string): number {
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function TargetAllocationTool({ values, onChange, actualPctByCategory }: TargetAllocationToolProps) {
  const numbers = PORTFOLIO_CATEGORIES.map((c) => parseTargetPct(values[c.id] ?? ''));

  const { valid, total, excess } = validateAllocationPercentagesSum(numbers);

  function setField(id: string, raw: string) {
    onChange({ ...values, [id]: raw });
  }

  function onNormalize() {
    const normalized = normalizeAllocationPercentages(numbers);
    const next: Record<string, string> = {};
    PORTFOLIO_CATEGORIES.forEach((c, i) => {
      next[c.id] = normalized[i] === 0 ? '' : String(normalized[i]);
    });
    onChange(next);
  }

  return (
    <div className="rounded-[12px] border border-white/10 bg-transparent p-4 backdrop-blur-[10px]">
      <p className="text-xs text-[#94a3b8]">
        Define tu asignación meta por categoría. La barra muestra avance hacia la meta; al cumplirla se marca como
        fondeado y se refleja en la gráfica de portafolio.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PORTFOLIO_CATEGORIES.map((c) => {
          const targetPct = parseTargetPct(values[c.id] ?? '');
          const actualPct = actualPctByCategory[c.id] ?? 0;
          const funded = targetPct > 0 && actualPct >= targetPct - 0.5;
          const progressPct =
            targetPct > 0 ? Math.min(100, Math.max(0, (actualPct / targetPct) * 100)) : 0;

          return (
            <Paper
              key={c.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'transparent',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: 'none',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#94a3b8]" htmlFor={`alloc-${c.id}`}>
                  {c.label}
                </label>
                {funded && targetPct > 0 ? (
                  <Chip
                    size="small"
                    label="Fondeado"
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      bgcolor: 'rgba(52, 211, 153, 0.14)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(52, 211, 153, 0.35)',
                    }}
                  />
                ) : null}
              </div>
              <input
                id={`alloc-${c.id}`}
                type="text"
                inputMode="decimal"
                className={inputClass}
                placeholder="Meta %"
                value={values[c.id] ?? ''}
                onChange={(e) => setField(c.id, e.target.value)}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8' }}>
                Actual {actualPct.toFixed(1)}% · Meta {targetPct > 0 ? `${targetPct.toFixed(1)}%` : '—'}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={targetPct > 0 ? progressPct : 0}
                  sx={{
                    height: 8,
                    borderRadius: '999px',
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: '999px',
                      ...(funded
                        ? {
                            background: 'linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)',
                            boxShadow:
                              '0 0 18px rgba(52, 211, 153, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                          }
                        : {
                            background: 'linear-gradient(90deg, #38bdf8 0%, #22d3ee 100%)',
                            boxShadow:
                              '0 0 18px rgba(56, 189, 248, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          }),
                    },
                  }}
                />
              </Box>
            </Paper>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${valid ? 'text-[#94a3b8]' : 'text-rose-300'}`}>
          Suma meta: <span className="font-semibold tabular-nums text-white">{total.toFixed(2)}%</span>
          {!valid ? (
            <span className="ml-2 text-xs">
              (excede {excess.toFixed(2)}% sobre 100%)
            </span>
          ) : null}
        </p>
        {!valid && total > 0 ? (
          <button
            type="button"
            onClick={onNormalize}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.1]"
          >
            Normalizar a 100%
          </button>
        ) : null}
      </div>
    </div>
  );
}
