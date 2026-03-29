import { Snackbar } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import type { AccountRow } from '../api/fetchAccounts';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchCategories } from '../api/fetchCategories';
import {
  deleteTransaction,
  listTransactions,
  type TransactionWithCategory,
} from '../api/fetchTransactions';
import { fetchTransfers, type TransferRecord } from '../api/fetchTransfers';
import { EditTransactionDialog } from '../components/shared/EditTransactionDialog';
import { MoneyText } from '../components/shared/MoneyText';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';

function txSignedAmountForFeed(tx: TransactionWithCategory): number {
  if (tx.type === 'ADJUSTMENT') {
    const s = tx.metadata?.signedDelta;
    if (typeof s === 'string') return Number(s);
    return 0;
  }
  const amt = Number(tx.amount);
  return tx.type === 'EXPENSE' ? -amt : amt;
}

type Merged =
  | { kind: 'transfer'; at: number; transfer: TransferRecord }
  | { kind: 'tx'; at: number; tx: TransactionWithCategory };

function parseIso(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function mergeRows(
  transfers: TransferRecord[],
  txs: TransactionWithCategory[],
  maxItems: number,
): Merged[] {
  const out: Merged[] = [];
  for (const tr of transfers) {
    out.push({ kind: 'transfer', at: parseIso(tr.occurredAt), transfer: tr });
  }
  for (const tx of txs) {
    out.push({ kind: 'tx', at: parseIso(tx.occurredAt), tx });
  }
  out.sort((a, b) => b.at - a.at);
  return out.slice(0, maxItems);
}

function TxFeedActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="flex shrink-0 items-start gap-0.5 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        onClick={() => onEdit()}
        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        aria-label="Editar transacción"
      >
        <Pencil size={16} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => void onDelete()}
        className="rounded-md p-1 text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
        aria-label="Eliminar transacción"
      >
        <Trash2 size={16} strokeWidth={2} />
      </button>
    </span>
  );
}

export type RecentActivityFeedProps = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  balanceRevision: number;
  accounts: AccountRow[];
  onMutation?: () => void;
};

export function RecentActivityFeed({
  getAccessToken,
  defaultCurrency,
  balanceRevision,
  accounts,
  onMutation,
}: RecentActivityFeedProps) {
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);
  const [rows, setRows] = useState<Merged[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editTx, setEditTx] = useState<TransactionWithCategory | null>(null);
  const [saveSnackOpen, setSaveSnackOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [transfers, txs] = await Promise.all([
        fetchTransfers(getAccessToken, 40),
        listTransactions(getAccessToken, 40),
      ]);
      setRows(mergeRows(transfers, txs, 25));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'No se pudo cargar la actividad');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchCategories(getAccessToken);
        if (!cancelled) setCategories(cats);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  const handleDeleteTx = useCallback(
    async (tx: TransactionWithCategory) => {
      if (
        !window.confirm(
          '¿Estás seguro? El saldo de tu cuenta se ajustará automáticamente.',
        )
      ) {
        return;
      }
      try {
        await deleteTransaction(getAccessToken, tx.id);
        await refreshBalancesAfterMutation(getAccessToken);
        await load();
        onMutation?.();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'No se pudo eliminar.');
      }
    },
    [getAccessToken, load, onMutation, refreshBalancesAfterMutation],
  );

  const revisionSyncReady = useRef(false);
  useEffect(() => {
    if (!revisionSyncReady.current) {
      revisionSyncReady.current = true;
      return;
    }
    void load();
  }, [balanceRevision, load]);

  const cur = defaultCurrency.toUpperCase().slice(0, 3);

  const subtitle = useMemo(
    () => 'Transferencias (neutral), gastos e ingresos recientes.',
    [],
  );

  const sharedDialogs = (
    <>
      <EditTransactionDialog
        open={editTx != null}
        onClose={() => setEditTx(null)}
        transaction={editTx}
        getAccessToken={getAccessToken}
        accounts={accounts}
        categories={categories}
        defaultCurrency={defaultCurrency}
        onSaved={async () => {
          await load();
          onMutation?.();
          setSaveSnackOpen(true);
        }}
      />
      <Snackbar
        open={saveSnackOpen}
        autoHideDuration={5000}
        onClose={() => setSaveSnackOpen(false)}
        message="Transacción y saldos actualizados correctamente."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );

  if (loading && rows.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Actividad reciente</h3>
          <p className="mt-2 text-sm text-zinc-500">Cargando…</p>
        </div>
        {sharedDialogs}
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
        {sharedDialogs}
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Actividad reciente</h3>
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          <p className="mt-3 text-sm text-zinc-500">Aún no hay movimientos.</p>
        </div>
        {sharedDialogs}
      </>
    );
  }

  return (
    <>
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Actividad reciente</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Actualizar
        </button>
      </div>
      <ul className="mt-3 divide-y divide-zinc-100">
        {rows.map((row) => {
          if (row.kind === 'transfer') {
            const t = row.transfer;
            const amt = Number(t.amount);
            const fee = Number(t.fee);
            return (
              <li key={`tr-${t.id}`} className="flex gap-3 py-2.5 text-sm first:pt-0">
                <span className="text-lg leading-none" title="Transferencia">
                  ↔️
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">
                    {t.originAccount.name} → {t.destinationAccount.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(t.occurredAt).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                    {fee > 0 ? (
                      <>
                        {' '}
                        · Comisión{' '}
                        <MoneyText>{formatMoney(String(fee), t.originAccount.currency)}</MoneyText>
                      </>
                    ) : (
                      ''
                    )}
                  </p>
                  {t.notes ? <p className="mt-0.5 text-xs text-zinc-600">{t.notes}</p> : null}
                </div>
                <span className="shrink-0 tabular-nums text-zinc-700">
                  <MoneyText>{formatMoney(String(amt), t.originAccount.currency)}</MoneyText>
                </span>
              </li>
            );
          }

          const tx = row.tx;
          if (tx.type === 'ADJUSTMENT') {
            const signed = txSignedAmountForFeed(tx);
            const accName = tx.account?.name ?? 'Cuenta';
            return (
              <li
                key={`tx-${tx.id}`}
                className="group flex gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50 py-2.5 pl-2 pr-1 text-sm first:pt-2"
              >
                <span className="mt-0.5 shrink-0 text-zinc-500" title="Ajuste manual">
                  <Wrench size={18} strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-800">{tx.concept}</p>
                  <p className="text-xs text-zinc-500">
                    Ajuste manual · {accName} ·{' '}
                    {new Date(tx.occurredAt).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <span className="shrink-0 tabular-nums text-zinc-600">
                    {signed >= 0 ? '+' : '−'}
                    <MoneyText>{formatMoney(String(Math.abs(signed)), tx.currency ?? cur)}</MoneyText>
                  </span>
                  <TxFeedActions
                    onEdit={() => setEditTx(tx)}
                    onDelete={() => void handleDeleteTx(tx)}
                  />
                </div>
              </li>
            );
          }

          const isExp = tx.type === 'EXPENSE';
          const icon = isExp ? '↓' : '↑';
          const title = isExp ? 'Gasto' : 'Ingreso';
          const accName = tx.account?.name ?? 'Cuenta';
          const catName = tx.category?.name ?? (isExp ? 'Gasto' : 'Ingreso');

          return (
            <li key={`tx-${tx.id}`} className="group flex gap-3 py-2.5 text-sm first:pt-0">
              <span className="text-lg leading-none" title={title}>
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{tx.concept}</p>
                <p className="text-xs text-zinc-500">
                  {catName} · {accName} ·{' '}
                  {new Date(tx.occurredAt).toLocaleString('es-MX', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <span
                  className={`shrink-0 tabular-nums ${isExp ? 'text-rose-700' : 'text-emerald-700'}`}
                >
                  {isExp ? '−' : '+'}
                  <MoneyText>{formatMoney(tx.amount, tx.currency ?? cur)}</MoneyText>
                </span>
                <TxFeedActions
                  onEdit={() => setEditTx(tx)}
                  onDelete={() => void handleDeleteTx(tx)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
    {sharedDialogs}
    </>
  );
}
