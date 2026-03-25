import { type FormEvent, useState } from 'react';
import { createPortfolio, type CreatePortfolioBody } from '../../api/fetchInvestments';

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2';

type Props = {
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function CreatePortfolioForm({ getAccessToken, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio.');
      return;
    }
    setBusy(true);
    try {
      const body: CreatePortfolioBody = { name: trimmed };
      const desc = description.trim();
      if (desc) {
        body.description = desc;
      }
      if (baseCurrency && baseCurrency.length === 3) {
        body.baseCurrency = baseCurrency.toUpperCase();
      }
      await createPortfolio(getAccessToken, body);
      setName('');
      setDescription('');
      setBaseCurrency('USD');
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el portafolio');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-4"
    >
      <h4 className="text-sm font-semibold text-zinc-900">Nuevo portafolio</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="pf-name">
            Nombre
          </label>
          <input
            id="pf-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Retiro, Corto plazo"
            maxLength={120}
            disabled={busy}
            autoComplete="off"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="pf-desc">
            Descripción (opcional)
          </label>
          <textarea
            id="pf-desc"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre objetivos o reglas"
            maxLength={2000}
            disabled={busy}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="pf-ccy">
            Moneda base
          </label>
          <select
            id="pf-ccy"
            className={inputClass}
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            disabled={busy}
          >
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Crear portafolio'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </form>
  );
}
