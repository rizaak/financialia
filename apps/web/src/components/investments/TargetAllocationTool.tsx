import { useMemo, useState } from 'react';
import { PORTFOLIO_CATEGORIES } from '../../investments/investmentDashboardTypes';
import {
  normalizeAllocationPercentages,
  validateAllocationPercentagesSum,
} from '../../lib/investmentDashboardMath';

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/30';

export function TargetAllocationTool() {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(PORTFOLIO_CATEGORIES.map((c) => [c.id, ''])),
  );

  const numbers = useMemo(
    () =>
      PORTFOLIO_CATEGORIES.map((c) => {
        const n = Number(values[c.id].replace(/,/g, ''));
        return Number.isFinite(n) && n >= 0 ? n : 0;
      }),
    [values],
  );

  const { valid, total, excess } = validateAllocationPercentagesSum(numbers);

  function setField(id: string, raw: string) {
    setValues((prev) => ({ ...prev, [id]: raw }));
  }

  function onNormalize() {
    const normalized = normalizeAllocationPercentages(numbers);
    const next: Record<string, string> = {};
    PORTFOLIO_CATEGORIES.forEach((c, i) => {
      next[c.id] = normalized[i] === 0 ? '' : String(normalized[i]);
    });
    setValues(next);
  }

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Asignación objetivo (%)</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Simulación local: ajusta porcentajes y normaliza si superan el 100%.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PORTFOLIO_CATEGORIES.map((c) => (
          <div key={c.id}>
            <label className="text-xs font-medium text-zinc-600" htmlFor={`alloc-${c.id}`}>
              {c.label}
            </label>
            <input
              id={`alloc-${c.id}`}
              type="text"
              inputMode="decimal"
              className={inputClass}
              placeholder="0"
              value={values[c.id]}
              onChange={(e) => setField(c.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${valid ? 'text-zinc-600' : 'text-rose-700'}`}>
          Suma actual: <span className="font-semibold tabular-nums">{total.toFixed(2)}%</span>
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
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            Normalizar a 100%
          </button>
        ) : null}
      </div>
    </div>
  );
}
