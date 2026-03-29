import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { patchCreditCardAccount, type AccountRow } from '../api/fetchAccounts';

/**
 * Acepta 45, 45%, 0.45 → decimal anual para API (0–5 en fracción).
 * Si el valor es > 1 se interpreta como porcentaje (45 → 0.45).
 */
function parseAnnualCat(raw: string): number | null {
  const s = String(raw).replace(/\s/g, '').replace('%', '').replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= 1) {
    if (n > 5) return null;
    return n;
  }
  if (n <= 100) {
    const dec = n / 100;
    return dec <= 5 ? dec : null;
  }
  return null;
}

export type EditCreditCardDialogProps = {
  open: boolean;
  onClose: () => void;
  account: AccountRow | null;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function EditCreditCardDialog({
  open,
  onClose,
  account,
  getAccessToken,
  onSaved,
}: EditCreditCardDialogProps) {
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [catText, setCatText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !account || account.type !== 'CREDIT_CARD') return;
    setName(account.name);
    setCreditLimit(
      account.creditLimit != null ? String(Number(account.creditLimit)) : '',
    );
    const pct = account.creditCard
      ? Number(account.creditCard.annualInterestRatePct) * 100
      : 45;
    setCatText(Number.isFinite(pct) ? String(pct) : '45');
    setError(null);
  }, [open, account]);

  async function handleSubmit() {
    if (!account || account.type !== 'CREDIT_CARD') return;
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Indica un nombre para la tarjeta.');
      return;
    }
    const limit = Number(String(creditLimit).replace(/,/g, '').replace(',', '.'));
    if (!Number.isFinite(limit) || limit < 0) {
      setError('Indica un límite de crédito válido (≥ 0).');
      return;
    }
    const annual = parseAnnualCat(catText);
    if (annual == null) {
      setError('Indica el CAT anual (ej. 45 o 45% o 0.45).');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading('Guardando…');
    try {
      await patchCreditCardAccount(getAccessToken, account.id, {
        name: trimmed,
        creditLimit: limit,
        annualInterestRatePct: annual,
      });
      toast.success('Tarjeta actualizada', { id: tid });
      await onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar.';
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
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(8px)' },
        },
      }}
      PaperProps={{
        elevation: 0,
        sx: { borderRadius: 2, border: 1, borderColor: 'divider' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <CreditCard size={22} strokeWidth={2} aria-hidden />
        Editar tarjeta
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Nombre de la tarjeta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            disabled={submitting}
          />
          <TextField
            label="Límite de crédito"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            inputProps={{ min: 0, step: 'any' }}
          />
          <TextField
            label="CAT (tasa anual)"
            value={catText}
            onChange={(e) => setCatText(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            placeholder="Ej. 45 o 45%"
            helperText="Costo anual total; puedes escribir 45 (se interpreta como 45%)."
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={submitting} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
