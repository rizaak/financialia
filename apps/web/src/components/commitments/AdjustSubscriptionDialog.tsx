import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  patchRecurringExpense,
  type RecurringExpenseListRow,
} from '../../api/fetchRecurringExpenses';
import { formatMoney } from '../../lib/formatMoney';

function amountLabel(f: RecurringExpenseListRow['frequency']): string {
  return f === 'MONTHLY' ? 'Monto por cargo (mensual)' : 'Monto por cargo (anual)';
}

export type AdjustSubscriptionDialogProps = {
  open: boolean;
  onClose: () => void;
  row: RecurringExpenseListRow | null;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function AdjustSubscriptionDialog({
  open,
  onClose,
  row,
  getAccessToken,
  onSaved,
}: AdjustSubscriptionDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setName(row.name);
    setAmount(String(Number(row.amount)));
    setError(null);
  }, [open, row]);

  async function save(alsoCancel: boolean) {
    if (!row) return;
    setError(null);
    if (alsoCancel) {
      setSubmitting(true);
      const tid = toast.loading('Cancelando suscripción…');
      try {
        await patchRecurringExpense(getAccessToken, row.id, { isArchived: true });
        toast.success('Suscripción archivada', { id: tid });
        await onSaved();
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error';
        setError(msg);
        toast.error(msg, { id: tid });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const n = name.trim();
    if (!n) {
      setError('Indica un nombre.');
      return;
    }
    const a = Number(String(amount).replace(/,/g, '').replace(',', '.'));
    if (!Number.isFinite(a) || a <= 0) {
      setError('Indica un monto válido.');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading('Guardando…');
    try {
      await patchRecurringExpense(getAccessToken, row.id, { name: n, amount: a });
      toast.success('Suscripción actualizada', { id: tid });
      await onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Ajustar suscripción</DialogTitle>
      <DialogContent>
        {row ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {row.account.name} · {row.category.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Día de cargo: {row.billingDay}
              {row.frequency === 'ANNUAL' && row.billingMonth != null
                ? ` · Mes ${row.billingMonth}`
                : ''}{' '}
              · {row.frequency === 'MONTHLY' ? 'Mensual' : 'Anual'}
            </Typography>
            <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth disabled={submitting} />
            <TextField
              label={amountLabel(row.frequency)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              disabled={submitting}
              inputProps={{ inputMode: 'decimal' }}
              helperText={`Referencia: ${formatMoney(row.amount, row.currency)}`}
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
        <Button onClick={() => onClose()} disabled={submitting} color="inherit">
          Cerrar
        </Button>
        <Button color="error" onClick={() => void save(true)} disabled={submitting || !row}>
          Cancelar compromiso
        </Button>
        <Button variant="contained" onClick={() => void save(false)} disabled={submitting || !row}>
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
