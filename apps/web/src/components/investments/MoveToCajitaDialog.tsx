'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { moveToCajita } from '../../api/fetchAccounts';
import { formatMoney } from '../../lib/formatMoney';

type Props = {
  open: boolean;
  onClose: () => void;
  accountId: string;
  currencyCode: string;
  availableBalance: number;
  getAccessToken: () => Promise<string>;
  onDone: () => void | Promise<void>;
};

export function MoveToCajitaDialog({
  open,
  onClose,
  accountId,
  currencyCode,
  availableBalance,
  getAccessToken,
  onDone,
}: Props) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAmount('');
    setError(null);
  }

  async function submit() {
    setError(null);
    const n = Number(String(amount).replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      setError('Indica un monto válido.');
      return;
    }
    if (n > availableBalance + 1e-6) {
      setError('El monto supera el saldo disponible.');
      return;
    }
    setBusy(true);
    try {
      await moveToCajita(getAccessToken, accountId, n);
      reset();
      await onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al mover a cajita');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Mover a cajita</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Disponible: {formatMoney(String(availableBalance), currencyCode)}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Monto a apartar"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        {error ? (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
