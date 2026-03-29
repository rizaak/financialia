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
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createAccount } from '../api/fetchAccounts';

const CLOSING_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export type AddCreditCardDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onCreated: () => void | Promise<void>;
};

/** Extrae 1–60 de "20", "20 días después del corte", etc. */
function parseDaysAfterClosing(raw: string): number | null {
  const m = raw.trim().match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1 || n > 60) return null;
  return n;
}

/**
 * Acepta 45, 45%, 0.45 → decimal anual para API (0–5).
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

export function AddCreditCardDialog({
  open,
  onClose,
  getAccessToken,
  defaultCurrency,
  onCreated,
}: AddCreditCardDialogProps) {
  const [alias, setAlias] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState<number>(15);
  const [paymentDaysText, setPaymentDaysText] = useState('20 días después del corte');
  const [catText, setCatText] = useState('45');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAlias('');
    setCreditLimit('');
    setClosingDay(15);
    setPaymentDaysText('20 días después del corte');
    setCatText('45');
    setError(null);
  }, [open]);

  function handleClosingChange(e: SelectChangeEvent<number>) {
    setClosingDay(Number(e.target.value));
  }

  async function handleSubmit() {
    setError(null);
    const name = alias.trim();
    if (!name) {
      setError('Indica un alias para la tarjeta.');
      return;
    }
    const limit = Number(String(creditLimit).replace(/,/g, '').replace(',', '.'));
    if (!Number.isFinite(limit) || limit < 0) {
      setError('Indica un límite de crédito válido (≥ 0).');
      return;
    }
    const dueDays = parseDaysAfterClosing(paymentDaysText);
    if (dueDays == null) {
      setError('Indica cuántos días después del corte vence el pago (número entre 1 y 60).');
      return;
    }
    const annual = parseAnnualCat(catText);
    if (annual == null) {
      setError('Indica la tasa anual CAT (ej. 45 o 45% o 0.45).');
      return;
    }

    const cur = defaultCurrency.toUpperCase().slice(0, 3);
    setSubmitting(true);
    const id = toast.loading('Creando tarjeta…');
    try {
      await createAccount(getAccessToken, {
        name,
        type: 'CREDIT_CARD',
        currency: cur,
        creditLimit: limit,
        closingDay,
        paymentDueDaysAfterClosing: dueDays,
        annualInterestRatePct: annual,
      });
      toast.success(`Tarjeta “${name}” registrada`, { id });
      onClose();
      await onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear la tarjeta.';
      setError(msg);
      toast.error(msg, { id });
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
        Agregar tarjeta de crédito
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Alias de la tarjeta"
            placeholder='Ej. "BBVA Platinum", "Amex Gold"'
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            fullWidth
            required
            autoFocus
            disabled={submitting}
          />
          <TextField
            label="Límite de crédito"
            type="number"
            placeholder="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            inputProps={{ min: 0, step: 'any' }}
            helperText={`Monto total disponible en ${defaultCurrency.toUpperCase().slice(0, 3)}.`}
          />
          <FormControl fullWidth required>
            <InputLabel id="add-cc-closing-label">Día de corte</InputLabel>
            <Select
              labelId="add-cc-closing-label"
              label="Día de corte"
              value={closingDay}
              onChange={handleClosingChange}
              disabled={submitting}
            >
              {CLOSING_DAYS.map((d) => (
                <MenuItem key={d} value={d}>
                  Día {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Día límite de pago"
            placeholder="20 días después del corte"
            value={paymentDaysText}
            onChange={(e) => setPaymentDaysText(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            helperText="Escribe el número de días naturales después del corte (ej. 20 o el texto sugerido)."
          />
          <TextField
            label="Tasa de interés anual (CAT)"
            placeholder="Ej. 45%"
            value={catText}
            onChange={(e) => setCatText(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            helperText="Puedes escribir 45, 45% o 0.45 (45% anual)."
          />

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Vantix no realiza pagos automáticos. Usa estos datos para recordarte cuándo pagar en tu app bancaria.
          </Alert>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'action.hover' }}>
        <Button onClick={onClose} disabled={submitting} color="inherit">
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar tarjeta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
