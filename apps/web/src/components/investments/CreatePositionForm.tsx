import { type FormEvent, useEffect, useState } from 'react';
import { createPosition } from '../../api/fetchInvestments';
import type { InvestmentsOverview } from '../../api/investmentsTypes';
import { VI_SUCCESS_MESSAGE } from '../../config/brandConfig';
import { useTransaction } from '../../hooks/useTransaction';
import { Spinner } from '../ui/spinner';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white shadow-none outline-none backdrop-blur-sm placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-500/20';

type Props = {
  portfolios: InvestmentsOverview['portfolios'];
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function CreatePositionForm({ portfolios, getAccessToken, onSaved }: Props) {
  const { run } = useTransaction();
  const [portfolioId, setPortfolioId] = useState(portfolios[0]?.id ?? '');
  const [label, setLabel] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [returnPct, setReturnPct] = useState('7');
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<'VARIABLE' | 'FIXED_TERM'>('VARIABLE');
  const [maturityDate, setMaturityDate] = useState('');
  const [agreedRatePct, setAgreedRatePct] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

    if (kind === 'FIXED_TERM') {
      if (!maturityDate.trim()) {
        setError('La fecha de vencimiento es obligatoria para plazo fijo.');
        return;
      }
      const ar = Number(String(agreedRatePct).replace(/,/g, ''));
      if (!Number.isFinite(ar) || ar < 0) {
        setError('Indica la tasa pactada anual (%).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const pfName = portfolios.find((p) => p.id === portfolioId)?.name ?? 'portafolio';
      const arDec =
        kind === 'FIXED_TERM'
          ? Number(String(agreedRatePct).replace(/,/g, '')) / 100
          : undefined;
      const result = await run(
        () =>
          createPosition(getAccessToken, portfolioId, {
            label: lbl,
            initialAmount: amt,
            expectedAnnualReturnPct,
            notes: notes.trim() || undefined,
            kind,
            ...(kind === 'FIXED_TERM'
              ? {
                  maturityDate: new Date(maturityDate + 'T12:00:00').toISOString(),
                  agreedAnnualRatePct: arDec!,
                }
              : {}),
          }),
        {
          loadingMessage: 'Registrando posición…',
          successMessage: VI_SUCCESS_MESSAGE,
          successDescription: `Inversión registrada: ${lbl} · ${pfName}`,
        },
      );
      if (result !== undefined) {
        setLabel('');
        setInitialAmount('');
        setReturnPct('7');
        setNotes('');
        setKind('VARIABLE');
        setMaturityDate('');
        setAgreedRatePct('');
        await onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-[12px] border border-white/10 bg-transparent p-4 backdrop-blur-[10px]"
    >
      <h4 className="text-sm font-semibold text-white">Nueva posición</h4>
      <p className="mt-0.5 text-xs text-[#94a3b8]">
        Monto inicial y rendimiento anual estimado. Un nombre claro ayuda a organizar tus activos.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-pf">
            Portafolio
          </label>
          <select
            id="pos-pf"
            className={inputClass}
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            disabled={submitting || !canSubmit}
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
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-label">
            Etiqueta
          </label>
          <input
            id="pos-label"
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej. VTI, CETES, Cripto"
            maxLength={120}
            disabled={submitting || !canSubmit}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-amt">
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
            disabled={submitting || !canSubmit}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-pct">
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
            disabled={submitting || !canSubmit}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-kind">
            Tipo de instrumento
          </label>
          <select
            id="pos-kind"
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as 'VARIABLE' | 'FIXED_TERM')}
            disabled={submitting || !canSubmit}
          >
            <option value="VARIABLE">Renta variable / sin vencimiento fijo</option>
            <option value="FIXED_TERM">Plazo fijo (CETES, pagaré)</option>
          </select>
        </div>
        {kind === 'FIXED_TERM' ? (
          <>
            <div>
              <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-mat">
                Fecha de vencimiento
              </label>
              <input
                id="pos-mat"
                type="date"
                className={inputClass}
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                disabled={submitting || !canSubmit}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-agreed">
                Tasa pactada anual (%)
              </label>
              <input
                id="pos-agreed"
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={agreedRatePct}
                onChange={(e) => setAgreedRatePct(e.target.value)}
                placeholder="10.5"
                disabled={submitting || !canSubmit}
              />
            </div>
          </>
        ) : null}
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pos-notes">
            Notas (opcional)
          </label>
          <input
            id="pos-notes"
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            disabled={submitting || !canSubmit}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white shadow-none backdrop-blur-sm transition-colors hover:border-sky-400/45 hover:bg-white/[0.1] disabled:opacity-50 sm:w-auto"
          >
            {submitting ? <Spinner /> : null}
            {submitting ? 'Guardando…' : 'Añadir posición'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </form>
  );
}
