import { Button, Stack, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { fetchCategories } from '../api/fetchCategories';
import type { CategoryRow } from '../api/categoryTypes';
import { confirmRecurringCharge, fetchUpcomingCharges, type UpcomingCharge } from '../api/fetchRecurringExpenses';
import { SectionCard } from '../components/SectionCard';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';
import { usePendingChatInsightStore } from '../stores/pendingChatInsightStore';
import { AddRecurringExpenseDialog } from './AddRecurringExpenseDialog';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  balanceRevision: number;
  onMutation: () => void;
};

export function UpcomingChargesWidget({
  getAccessToken,
  defaultCurrency,
  balanceRevision,
  onMutation,
}: Props) {
  const [rows, setRows] = useState<UpcomingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [up, cats, accs] = await Promise.all([
        fetchUpcomingCharges(getAccessToken, 7),
        fetchCategories(getAccessToken),
        fetchAccounts(getAccessToken),
      ]);
      setRows(up);
      setCategories(cats);
      setAccounts(accs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los cargos.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load, balanceRevision]);

  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  async function onConfirm(id: string) {
    setConfirmingId(id);
    try {
      const result = await confirmRecurringCharge(getAccessToken, id);
      const pending = usePendingChatInsightStore.getState();
      if (result.interestRiskMessage?.trim()) {
        pending.enqueueChatMessage(result.interestRiskMessage.trim());
      }
      if (result.spendingInsight?.message?.trim()) {
        pending.enqueueChatMessage(result.spendingInsight.message.trim());
      }
      await refreshBalancesAfterMutation(getAccessToken);
      onMutation();
      await load();
    } finally {
      setConfirmingId(null);
    }
  }

  const cur = defaultCurrency.toUpperCase().slice(0, 3);

  return (
    <SectionCard title="Próximos cargos" subtitle="Suscripciones y cargos recurrentes en los próximos 7 días">
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setDialogOpen(true)}
          >
            Agregar
          </Button>
        </div>

        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando…
          </Typography>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay cargos programados en los próximos 7 días. Agrega una suscripción para verla aquí.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
              >
                <div>
                  <Typography variant="body2" fontWeight={600}>
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.chargeDateLabel}
                    {r.daysFromToday === 0
                      ? ' · Hoy'
                      : r.daysFromToday === 1
                        ? ' · Mañana'
                        : ` · En ${r.daysFromToday} días`}{' '}
                    · {r.categoryName} · {r.accountName}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Typography variant="body2" fontWeight={600}>
                    {formatMoney(r.amount, r.currency || cur)}
                  </Typography>
                  {r.daysFromToday === 0 ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      disabled={confirmingId === r.id}
                      onClick={() => void onConfirm(r.id)}
                    >
                      {confirmingId === r.id ? '…' : 'Confirmar cargo'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </Stack>
        )}
      </div>

      <AddRecurringExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        getAccessToken={getAccessToken}
        categories={categories}
        accounts={accounts}
        defaultCurrency={defaultCurrency}
        onCreated={() => {
          onMutation();
          void load();
        }}
      />
    </SectionCard>
  );
}
