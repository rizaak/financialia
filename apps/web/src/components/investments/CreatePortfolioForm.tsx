import { type FormEvent, useState } from 'react';
import { createPortfolio, type CreatePortfolioBody } from '../../api/fetchInvestments';
import { useTransaction } from '../../hooks/useTransaction';
import { Spinner } from '../ui/spinner';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white shadow-none outline-none backdrop-blur-sm placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-500/20';

type Props = {
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function CreatePortfolioForm({ getAccessToken, onSaved }: Props) {
  const { run } = useTransaction();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('MXN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSubmitting(true);
    try {
      const body: CreatePortfolioBody = { name: trimmed };
      const desc = description.trim();
      if (desc) {
        body.description = desc;
      }
      if (baseCurrency && baseCurrency.length === 3) {
        body.baseCurrency = baseCurrency.toUpperCase();
      }
      const result = await run(() => createPortfolio(getAccessToken, body), {
        loadingMessage: 'Creando portafolio…',
        successMessage: '✅ Portafolio creado',
        successDescription: trimmed,
      });
      if (result !== undefined) {
        setName('');
        setDescription('');
        setBaseCurrency('MXN');
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
      <h4 className="text-sm font-semibold text-white">Nuevo portafolio</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pf-name">
            Nombre
          </label>
          <input
            id="pf-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Retiro, Corto plazo"
            maxLength={120}
            disabled={submitting}
            autoComplete="off"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pf-desc">
            Descripción (opcional)
          </label>
          <textarea
            id="pf-desc"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre objetivos o reglas"
            maxLength={2000}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[#94a3b8]" htmlFor="pf-ccy">
            Moneda base
          </label>
          <select
            id="pf-ccy"
            className={inputClass}
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            disabled={submitting}
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white shadow-none backdrop-blur-sm transition-colors hover:border-sky-400/45 hover:bg-white/[0.1] disabled:opacity-50"
          >
            {submitting ? <Spinner className="text-white" /> : null}
            {submitting ? 'Guardando…' : 'Crear portafolio'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </form>
  );
}
