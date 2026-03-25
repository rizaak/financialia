import { type FormEvent, useEffect, useState } from 'react';
import { createPosition } from '../../api/fetchInvestments';
import type { InvestmentsOverview } from '../../api/investmentsTypes';

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2';

type Props = {
  portfolios: InvestmentsOverview['portfolios'];
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function CreatePositionForm({ portfolios, getAccessToken, onSaved }: Props) {
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [returnPct, setReturnPct] = useState('7');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = portfolios.length > 0;

  useEffect(() => {
    if (!portfolios.length) {
      setPortfolioId('');
      return;
    }
    if (!portfolios.some((p) => p.id === portfolioId)) {
      setPortfolioId(portfolios[0].id);
    }
  }, [portfolios, portfolioId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit || !portfolioId) {
      setError('Selecciona un portafolio.');
      return;
    }
    const lbl = label.trim();
    if (!lbl) {
      setError('El nombre de la posición es obligatorio.');
      return;
    }
    const amt = Number(initialAmount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Monto inicial inválido.');
      return;
    }
    const pct = Number(returnPct.replace(/,/g, ''));
    if (!Number.isFinite(pct) || pct <= -100 || pct > 1000) {
      setError('Rendimiento anual debe estar entre -100 y 1000 (%).');
      return;
    }
    const expectedAnnualReturnPct = pct / 100;

    setBusy(true);
    try {
      await createPosition(getAccessToken, portfolioId, {
        label: lbl,
        initialAmount: amt,
        expectedAnnualReturnPct,
        notes: notes.trim() || undefined,
      });
      setLabel('');
      setInitialAmount('');
      setReturnPct('7');
      setNotes('');
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la posición');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-4"
    >
      <h4 className="text-sm font-semibold text-zinc-900">Nueva posición</h4>
      <p className="mt-0.5 text-xs text-zinc-500">
        Monto inicial y rendimiento anual estimado. Un nombre claro ayuda a organizar tus activos.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="pos-pf">
            Portafolio
          </label>
          <select
            id="pos-pf"
            className={inputClass}
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            disabled={busy || !canSubmit}
          >
            {!canSubmit ? (
              <option value="">Crea un portafolio primero</option>
            ) : (
              portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.baseCurrency})
                </option>
              ))
            )}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="pos-label">
            Etiqueta
          </label>
          <input
            id="pos-label"
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej. VTI, CETES, Cripto"
            maxLength={120}
            disabled={busy || !canSubmit}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="pos-amt">
            Monto inicial
          </label>
          <input
            id="pos-amt"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            placeholder="10000"
            disabled={busy || !canSubmit}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="pos-pct">
            Rend. anual esperado (%)
          </label>
          <input
            id="pos-pct"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={returnPct}
            onChange={(e) => setReturnPct(e.target.value)}
            placeholder="7"
            disabled={busy || !canSubmit}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="pos-notes">
            Notas (opcional)
          </label>
          <input
            id="pos-notes"
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            disabled={busy || !canSubmit}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Guardando…' : 'Añadir posición'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </form>
  );
}
