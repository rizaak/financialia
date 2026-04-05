import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { VI_SUCCESS_MESSAGE } from '../config/brandConfig';
import {
  confirmUnifiedRecurringEvent,
  fetchUpcomingRecurringEvents,
  patchRecurringEvent,
  type UpcomingRecurringEventItem,
} from '../api/fetchRecurringEvents';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';
import { formatRelativeOccurrenceLabel, getCategoryIcon } from './upcomingEventsDisplay';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  balanceRevision: number;
  onMutation: () => void;
};

type PendingConfirm = {
  item: UpcomingRecurringEventItem;
};

export function UpcomingEventsWidget({
  getAccessToken,
  defaultCurrency,
  balanceRevision,
  onMutation,
}: Props) {
  const [items, setItems] = useState<UpcomingRecurringEventItem[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);
  const cur = defaultCurrency.toUpperCase().slice(0, 3);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [up, accs] = await Promise.all([
        fetchUpcomingRecurringEvents(getAccessToken, 7),
        fetchAccounts(getAccessToken),
      ]);
      setItems(up.items);
      setAccounts(accs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los movimientos.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load, balanceRevision]);

  const expenseTotalWeek = useMemo(() => {
    let sum = 0;
    for (const { event } of items) {
      if (event.type === 'EXPENSE') {
        const n = Number(event.amount);
        if (Number.isFinite(n)) sum += n;
      }
    }
    return sum;
  }, [items]);

  const openConfirm = (item: UpcomingRecurringEventItem) => {
    setPending({ item });
    setAccountId(item.event.defaultAccountId);
  };

  const handleCloseDialog = () => {
    if (submitting) return;
    setPending(null);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { event } = pending.item;
    if (!accountId) {
      toast.error('Selecciona una cuenta.');
      return;
    }
    setSubmitting(true);
    try {
      if (accountId !== event.defaultAccountId) {
        await patchRecurringEvent(getAccessToken, event.id, { defaultAccountId: accountId });
      }
      await confirmUnifiedRecurringEvent(getAccessToken, event.id);
      toast.success(VI_SUCCESS_MESSAGE, { description: `${event.name} registrado.` });
      await refreshBalancesAfterMutation(getAccessToken);
      onMutation();
      setPending(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo confirmar.');
    } finally {
      setSubmitting(false);
    }
  };

  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase().slice(0, 3) === cur),
    [accounts, cur],
  );

  const onAccountChange = (e: SelectChangeEvent<string>) => {
    setAccountId(e.target.value);
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Próximos Movimientos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pagos e ingresos recurrentes en los próximos 7 días.
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Cargando…
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          ¡Todo al corriente! No hay pagos pendientes esta semana.
        </Typography>
      ) : (
        <List disablePadding dense>
          {items.map((row) => {
            const ev = row.event;
            const Icon = getCategoryIcon(ev.category?.slug, ev.name);
            const catLabel = ev.category?.name ?? 'Categoría';
            const rel = formatRelativeOccurrenceLabel(row.nextOccurrenceLocal);
            const isExpense = ev.type === 'EXPENSE';
            const key = `${ev.id}-${row.nextOccurrenceLocal}`;

            return (
              <ListItem
                key={key}
                sx={{
                  py: 1.25,
                  alignItems: 'flex-start',
                  gap: 1,
                  flexWrap: 'nowrap',
                }}
              >
                <ListItemIcon sx={{ minWidth: 44, mt: 0.25 }}>
                  <Icon color="action" fontSize="medium" />
                </ListItemIcon>
                <ListItemText
                  sx={{ flex: '1 1 auto', minWidth: 0, m: 0 }}
                  primary={
                    <Typography component="span" variant="body2" fontWeight={600}>
                      {ev.name}
                    </Typography>
                  }
                  secondary={
                    <Typography component="span" variant="caption" color="text.secondary">
                      {rel} · {catLabel}
                    </Typography>
                  }
                />
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      textAlign: 'right',
                      color: isExpense ? 'error.main' : 'success.main',
                    }}
                  >
                    {isExpense ? '−' : '+'}
                    {formatMoney(ev.amount, ev.currency || cur)}
                  </Typography>
                  <IconButton
                    aria-label="Confirmar movimiento"
                    size="small"
                    onClick={() => openConfirm(row)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </ListItem>
            );
          })}
        </List>
      )}

      {!loading && !error && items.length > 0 ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          Total comprometido esta semana:{' '}
          <Box component="span" fontWeight={700} color="error.main">
            {formatMoney(expenseTotalWeek, cur)}
          </Box>{' '}
          <Box component="span" color="text.disabled">
            (solo gastos)
          </Box>
        </Typography>
      ) : null}

      <Dialog open={Boolean(pending)} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        {pending ? (
          <>
            <DialogTitle>Confirmar movimiento</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {pending.item.event.type === 'EXPENSE'
                    ? '¿Confirmas que se realizó el pago de '
                    : '¿Confirmas que recibiste el ingreso de '}
                  <strong>{pending.item.event.name}</strong>
                  {' por '}
                  <strong>{formatMoney(pending.item.event.amount, pending.item.event.currency || cur)}</strong>?
                </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel id="upcoming-event-account">Cuenta</InputLabel>
                  <Select
                    labelId="upcoming-event-account"
                    label="Cuenta"
                    value={accountId}
                    onChange={onAccountChange}
                    disabled={submitting}
                  >
                    {bankAccounts.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={() => void handleConfirm()}
                disabled={submitting || !accountId}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              >
                Confirmar
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Paper>
  );
}
