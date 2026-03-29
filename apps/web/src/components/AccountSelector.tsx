import type { AccountRow } from '../api/fetchAccounts';
import { formatMoney } from '../lib/formatMoney';

const selectClass =
  'mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:ring-2';

const typeLabel: Record<AccountRow['type'], string> = {
  BANK: 'Banco',
  WALLET: 'Cartera',
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta',
};

export type AccountSelectorProps = {
  id: string;
  label?: string;
  accounts: AccountRow[];
  value: string;
  onChange: (accountId: string) => void;
  disabled?: boolean;
  /** Si se indica, solo se listan cuentas en esa moneda (3 letras). */
  currency?: string;
  className?: string;
};

export function AccountSelector({
  id,
  label = 'Cuenta',
  accounts,
  value,
  onChange,
  disabled,
  currency,
  className = '',
}: AccountSelectorProps) {
  const cur = currency?.toUpperCase().slice(0, 3);
  const active = accounts.filter((a) => a.status !== 'ARCHIVED');
  const list = cur ? active.filter((a) => a.currency.toUpperCase() === cur) : active;

  if (list.length === 0) {
    return (
      <div className={className}>
        <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
          {label}
        </label>
        <p id={id} className="mt-1 text-sm text-zinc-500">
          {cur ? `No tienes cuentas en ${cur}.` : 'No tienes cuentas registradas.'}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Selecciona…</option>
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {typeLabel[a.type]} ·{' '}
            {a.type === 'CREDIT_CARD'
              ? `Deuda ${formatMoney(a.balance, a.currency)}`
              : formatMoney(a.balance, a.currency)}
          </option>
        ))}
      </select>
    </div>
  );
}
