import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { reconcileAccount, type AccountRow } from '../../api/fetchAccounts';
import { formatMoney } from '../../lib/formatMoney';

export type AdjustBalanceDialogProps = {
  open: boolean;
  onClose: () => void;
  account: AccountRow | null;
  getAccessToken: () => Promise<string>;
  /** Tras un ajuste aplicado (o sin cambios si coincide el saldo). */
  onSuccess: () => void | Promise<void>;
};

export function AdjustBalanceDialog({
  open,
  onClose,
  account,
  getAccessToken,
  onSuccess,
}: AdjustBalanceDialogProps) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !account) return;
    setValue(String(Number(account.balance)));
  }, [open, account]);

  const cur = account?.currency ?? 'MXN';

  const parsedTarget = useMemo(() => {
    const n = Number(String(value).replace(/,/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }, [value]);

  const registered = account ? Number(account.balance) : null;
  const delta =
    registered != null && parsedTarget != null ? parsedTarget - registered : null;

  async function handleSubmit() {
    if (!account) return;
    if (parsedTarget == null) {
      toast.error('Indica un número válido.');
      return;
    }
    setSubmitting(true);
    const tid = toast.loading('Aplicando ajuste…');
    try {
      const r = await reconcileAccount(getAccessToken, account.id, parsedTarget);
      if (r.skipped) {
        toast.success('Sin diferencia con el saldo registrado.', { id: tid });
      } else {
        toast.success('Ajuste registrado. El saldo coincide con tu realidad.', { id: tid });
      }
      await onSuccess();
      onClose();
      setValue('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo aplicar el ajuste.', { id: tid });
    } finally {
      setSubmitting(false);
    }
  }

  const isCredit = account?.type === 'CREDIT_CARD';

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>Ajustar saldo</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          ¿Cuál es el saldo real que ves en tu banco?
        </Typography>
        {account ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cuenta: <strong>{account.name}</strong>
            <br />
            Saldo en la app hoy: <strong>{formatMoney(account.balance, cur)}</strong>
          </Typography>
        ) : null}
        {isCredit ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            En tarjetas, indica la <strong>deuda</strong> que ves en el banco (misma convención que el saldo de la
            cuenta).
          </Typography>
        ) : null}
        <TextField
          label={isCredit ? 'Deuda real (saldo tarjeta)' : 'Saldo real'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fullWidth
          disabled={submitting}
          inputProps={{ inputMode: 'decimal' }}
          autoFocus
        />
        {delta != null && Math.abs(delta) > 1e-9 ? (
          <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
            Diferencia a registrar:{' '}
            <strong>
              {delta > 0 ? '+' : '−'}
              {formatMoney(String(Math.abs(delta)), cur)}
            </strong>{' '}
            {isCredit
              ? delta > 0
                ? '(aumenta la deuda registrada)'
                : '(reduce la deuda registrada)'
              : delta > 0
                ? '(aumenta el saldo en la app)'
                : '(reduce el saldo en la app)'}
          </Typography>
        ) : delta != null && Math.abs(delta) <= 1e-9 ? (
          <Typography variant="body2" sx={{ mt: 1.5 }} color="success.main">
            Sin diferencia: no se creará movimiento de ajuste.
          </Typography>
        ) : null}
        <Alert severity="warning" sx={{ mt: 2 }}>
          Se creará una transacción automática de tipo <strong>Ajuste</strong> para alinear el saldo de Vantix con el
          valor que indiques.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={submitting || !account} onClick={() => void handleSubmit()}>
          Aplicar ajuste
        </Button>
      </DialogActions>
    </Dialog>
  );
}
