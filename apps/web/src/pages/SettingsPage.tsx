import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { patchMe } from '../api/patchMe';
import { SectionCard } from '../components/SectionCard';
import type { ShellOutletContext } from '../layouts/shellContext';
import { normalizeDisplayCurrency, type DisplayCurrency } from '../lib/displayCurrency';

const options: { value: DisplayCurrency; label: string; hint: string }[] = [
  { value: 'MXN', label: 'Peso mexicano', hint: 'México' },
  { value: 'USD', label: 'Dólar estadounidense', hint: 'Estados Unidos' },
];

export function SettingsPage() {
  const { getAccessToken, defaultCurrency, setDefaultCurrency } = useOutletContext<ShellOutletContext>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(currency: DisplayCurrency) {
    if (currency === defaultCurrency || saving) return;
    setSaving(true);
    setError(null);
    try {
      const me = await patchMe(getAccessToken, { defaultCurrency: currency });
      setDefaultCurrency(normalizeDisplayCurrency(me.defaultCurrency));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-emerald-700">Preferencias</p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Ajustes</h1>
        <p className="mt-1 text-sm text-zinc-500">Moneda en la que quieres ver los importes.</p>
      </header>

      <SectionCard
        title="Moneda"
        subtitle="Solo cambia el formato en pantalla; no convierte entre divisas"
      >
        <fieldset disabled={saving} className="space-y-3">
          <legend className="sr-only">Moneda de visualización</legend>
          {options.map(({ value, label, hint }) => {
            const id = `currency-${value}`;
            const checked = defaultCurrency === value;
            return (
              <label
                key={value}
                htmlFor={id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                  checked
                    ? 'border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                } ${saving ? 'opacity-70' : ''}`}
              >
                <input
                  id={id}
                  type="radio"
                  name="displayCurrency"
                  value={value}
                  checked={checked}
                  onChange={() => void choose(value)}
                  className="mt-1 h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-900">{label}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {saving ? (
          <p className="mt-3 text-xs text-zinc-500">Guardando…</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </SectionCard>

      <div className="mt-6">
        <SectionCard title="General" subtitle="Próximamente">
          <p className="text-sm text-zinc-600">Idioma, notificaciones y formato de fechas.</p>
        </SectionCard>
      </div>
    </div>
  );
}
