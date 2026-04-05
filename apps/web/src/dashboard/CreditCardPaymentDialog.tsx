import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Landmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { AccountRow } from '../api/fetchAccounts';
import { createTransfer } from '../api/fetchTransfers';
import { VI_SUCCESS_MESSAGE } from '../config/brandConfig';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';

export type CreditCardPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  creditCardId: string;
  creditCardName: string;
  currency: string;
  /** Pago sugerido (p. ej. monto del último corte + MSI). */
  suggestedAmount: string;
  /** Deuda actual en la tarjeta (tope del pago). */
  maxPayAmount: string;
  /** Cuentas de débito (misma moneda). */
  debitAccounts: AccountRow[];
  onSuccess?: () => void | Promise<void>;
};

function parseMoney(s: string): number {
  return Number(String(s).replace(/,/g, '').replace(',', '.'));
}

export function CreditCardPaymentDialog({
  open,
  onClose,
  getAccessToken,
  creditCardId,
  creditCardName,
  currency,
  suggestedAmount,
  maxPayAmount,
  debitAccounts,
  onSuccess,
}: CreditCardPaymentDialogProps) {
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);
  const [fromId, setFromId] = useState('');
  const [amount, setAmount] = useState('');
  const [bankCharges, setBankCharges] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cur = currency.toUpperCase().slice(0, 3);
  const maxDebt = parseMoney(maxPayAmount);

  useEffect(() => {
    if (!open) return;
    setFromId(debitAccounts[0]?.id ?? '');
    setAmount(suggestedAmount ? String(parseMoney(suggestedAmount)) : '');
    setBankCharges('');
    setError(null);
  }, [open, suggestedAmount, debitAccounts]);

  const selectedDebit = useMemo(
    () => debitAccounts.find((a) => a.id === fromId) ?? null,
    [debitAccounts, fromId],
  );
  const maxFromBalance = selectedDebit ? Number(selectedDebit.balance) : 0;

  async function handleSubmit() {
    setError(null);
    const amt = parseMoney(amount);
    const extra = parseMoney(bankCharges);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Indica un monto válido mayor que cero.');
      return;
    }
    if (!Number.isFinite(extra) || extra < 0) {
      setError('Los cargos adicionales no pueden ser negativos.');
      return;
    }
    if (!fromId) {
      setError('Selecciona la cuenta de débito.');
      return;
    }
    const maxAfterCharges = maxDebt + extra;
    if (amt > maxAfterCharges) {
      setError(
        'El pago no puede ser mayor que la deuda registrada más los cargos del banco que indiques.',
      );
      return;
    }
    if (amt > maxFromBalance) {
      setError('Saldo insuficiente en la cuenta seleccionada.');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading('Registrando pago…');
    try {
      await createTransfer(getAccessToken, {
        fromAccountId: fromId,
        toAccountId: creditCardId,
        amount: amt,
        ...(extra > 0 ? { creditCardBankCharges: extra } : {}),
        notes: `Pago tarjeta ${creditCardName}`,
      });
      await refreshBalancesAfterMutation(getAccessToken);
      toast.success(VI_SUCCESS_MESSAGE, {
        id: tid,
        description: `Pago de ${formatMoney(amt, cur)} registrado.`,
      });
      await onSuccess?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo registrar el pago.';
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Landmark size={22} aria-hidden />
        Registrar pago realizado
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={700}>
            ¿Cuánto pagaste en tu banco?
          </Typography>
          <TextField
            label="Monto del pago"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            inputProps={{ inputMode: 'decimal', min: 0 }}
            helperText={`Máximo (deuda + cargos opcionales abajo): ${formatMoney(String(maxDebt), cur)} + cargos · Disponible origen: ${formatMoney(String(maxFromBalance), cur)}`}
          />
          <TextField
            label="Cargos adicionales / Intereses del banco (opcional)"
            value={bankCharges}
            onChange={(e) => setBankCharges(e.target.value)}
            fullWidth
            disabled={submitting}
            inputProps={{ inputMode: 'decimal', min: 0 }}
            helperText="Si el banco cargó intereses o comisiones que aún no tenías en la app, indícalos aquí: primero se suman a la deuda y luego se aplica tu pago."
          />
          <Typography variant="subtitle2" fontWeight={700}>
            ¿De qué cuenta salió el dinero?
          </Typography>
          <FormControl fullWidth required>
            <InputLabel id="pay-from-label">Cuenta de débito</InputLabel>
            <Select
              labelId="pay-from-label"
              label="Cuenta de débito"
              value={fromId}
              onChange={(e: SelectChangeEvent<string>) => setFromId(e.target.value)}
              disabled={submitting}
            >
              {debitAccounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name} — {formatMoney(a.balance, cur)} disponible
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Al confirmar se registra una <strong>transferencia</strong>: se resta el monto de la cuenta de débito y se
            reduce la deuda de <strong>{creditCardName}</strong> (sin conexión a tu banco). Si indicaste cargos del
            banco, primero se registran como gasto en la tarjeta y después el abono.
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting || debitAccounts.length === 0}>
          {submitting ? 'Guardando…' : 'Confirmar pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
