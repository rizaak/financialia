import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { VI_SUCCESS_MESSAGE } from '../config/brandConfig';
import { localDateInputToIsoMidday } from '../lib/localCalendarRange';
import { AccountSelector } from './AccountSelector';
import { Spinner } from './ui/spinner';

const inputClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2';

function todayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  categories: CategoryRow[];
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
  defaultCurrency: string;
};

type TxKind = 'EXPENSE' | 'INCOME';

export function QuickExpenseForm({
  categories,
  getAccessToken,
  onSaved,
  defaultCurrency,
}: Props) {
  const { postTransaction } = useTransactions(getAccessToken);
  const [kind, setKind] = useState<TxKind>('EXPENSE');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [notes, setNotes] = useState('');
  const [spentOn, setSpentOn] = useState(todayInputDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpense = kind === 'EXPENSE';

  const sorted = useMemo(() => {
    const want: TxKind = kind;
    return [...categories]
      .filter((c) => c.kind === want)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [categories, kind]);

  useEffect(() => {
    setCategoryId('');
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAccounts(getAccessToken);
        if (cancelled) return;
        setAccounts(list);
        const cur = defaultCurrency.toUpperCase().slice(0, 3);
        const inCur = list.filter((a) => a.currency.toUpperCase() === cur);
        setAccountId((prev) => {
          if (prev && inCur.some((a) => a.id === prev)) return prev;
          return inCur.length === 1 ? inCur[0].id : '';
        });
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setAccountId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, defaultCurrency]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accountId) {
      setError('Elige la cuenta donde aplica el movimiento.');
      return;
    }
    if (!categoryId) {
      setError('Elige una categoría.');
      return;
    }
    const amt = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Monto inválido.');
      return;
    }
    const c = concept.trim();
    if (!c) {
      setError(isExpense ? 'Describe el gasto.' : 'Describe el ingreso.');
      return;
    }

    const accName = accounts.find((a) => a.id === accountId)?.name ?? 'tu cuenta';
    setSubmitting(true);
    try {
      const result = await postTransaction(
        {
          accountId,
          categoryId,
          type: kind,
          amount: amt,
          concept: c,
          notes: notes.trim() || undefined,
          occurredAt: localDateInputToIsoMidday(spentOn),
          source: 'MANUAL',
        },
        {
          loadingMessage: 'Guardando movimiento…',
          successMessage: VI_SUCCESS_MESSAGE,
          successDescription: `${isExpense ? 'Gasto' : 'Ingreso'} en ${accName}: ${c}`,
        },
      );
      if (result !== undefined) {
        setAmount('');
        setConcept('');
        setNotes('');
        setSpentOn(todayInputDate());
        await onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        {isExpense
          ? 'No hay categorías de gasto disponibles. Actualiza la página o vuelve más tarde.'
          : 'No hay categorías de ingreso disponibles. Actualiza la página o vuelve más tarde.'}
      </p>
    );
  }

  const toggleBtn = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
      active
        ? 'bg-white text-zinc-900 shadow-sm'
        : 'text-zinc-500 hover:text-zinc-800'
    }`;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">Movimiento rápido</h4>
        </div>
        <div
          className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-1"
          role="group"
          aria-label="Tipo de movimiento"
        >
          <button
            type="button"
            className={toggleBtn(isExpense)}
            aria-pressed={isExpense}
            onClick={() => setKind('EXPENSE')}
            disabled={submitting}
          >
            Gasto
          </button>
          <button
            type="button"
            className={toggleBtn(!isExpense)}
            aria-pressed={!isExpense}
            onClick={() => setKind('INCOME')}
            disabled={submitting}
          >
            Ingreso
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <AccountSelector
            id="qe-account"
            label="Cuenta"
            accounts={accounts}
            value={accountId}
            onChange={setAccountId}
            disabled={submitting}
            currency={defaultCurrency}
          />
        </div>
        <div className="lg:col-span-2">
          <label className="text-xs font-medium text-zinc-600" htmlFor="qe-cat">
            Categoría
          </label>
          <select
            id="qe-cat"
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Selecciona…</option>
            {sorted.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="qe-amt">
            Monto
          </label>
          <input
            id="qe-amt"
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="350.50"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="qe-date">
            Fecha
          </label>
          <input
            id="qe-date"
            type="date"
            className={inputClass}
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="text-xs font-medium text-zinc-600" htmlFor="qe-concept">
            Concepto
          </label>
          <input
            id="qe-concept"
            className={inputClass}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={
              isExpense
                ? 'Ej. Supermercado, Uber, Netflix'
                : 'Ej. Nómina, freelance, reembolso'
            }
            maxLength={500}
            disabled={submitting}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-medium text-zinc-600" htmlFor="qe-notes">
            Notas (opcional)
          </label>
          <input
            id="qe-notes"
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            disabled={submitting}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow disabled:opacity-50 ${
              isExpense
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-sky-700 hover:bg-sky-800'
            }`}
          >
            {submitting ? <Spinner className="text-white" /> : null}
            {submitting
              ? 'Guardando…'
              : isExpense
                ? 'Registrar gasto'
                : 'Registrar ingreso'}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </form>
  );
}
