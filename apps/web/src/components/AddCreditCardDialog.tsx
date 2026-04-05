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
} from '@mui/material';
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createAccount } from '../api/fetchAccounts';
import { APP_NAME, VI_SUCCESS_MESSAGE } from '../config/brandConfig';

const CLOSING_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export type AddCreditCardDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onCreated: () => void | Promise<void>;
};

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
  /** Días naturales después del corte hasta la fecha límite de pago (1–60). */
  const [paymentDueDays, setPaymentDueDays] = useState<number | ''>(20);
  const [catText, setCatText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAlias('');
    setCreditLimit('');
    setClosingDay(15);
    setPaymentDueDays(20);
    setCatText('');
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
    const dueDays = paymentDueDays === '' ? NaN : Number(paymentDueDays);
    if (!Number.isFinite(dueDays) || dueDays < 1 || dueDays > 60) {
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
      toast.success(VI_SUCCESS_MESSAGE, { id, description: `Tarjeta “${name}” registrada.` });
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
            label="Días hasta el pago (después del corte)"
            type="number"
            placeholder="Ej. 20 días después del corte"
            value={paymentDueDays}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                setPaymentDueDays('');
                return;
              }
              const n = Number(v);
              if (Number.isFinite(n)) {
                setPaymentDueDays(n);
              }
            }}
            onBlur={() => {
              if (paymentDueDays === '' || !Number.isFinite(paymentDueDays)) {
                setPaymentDueDays(20);
                return;
              }
              if (paymentDueDays < 1) {
                setPaymentDueDays(1);
              } else if (paymentDueDays > 60) {
                setPaymentDueDays(60);
              }
            }}
            fullWidth
            required
            disabled={submitting}
            inputProps={{ min: 1, max: 60, step: 1 }}
            helperText="Número de días naturales entre el corte y la fecha límite de pago (1–60)."
          />
          <TextField
            label="Tasa de interés anual (CAT)"
            placeholder="Ej. 45% o 0.45"
            value={catText}
            onChange={(e) => setCatText(e.target.value)}
            fullWidth
            required
            disabled={submitting}
            helperText="Ejemplo: 45, 45% o 0.45 para 45% anual."
          />

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {APP_NAME} no realiza pagos automáticos. Usa estos datos para recordarte cuándo pagar en tu app bancaria.
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
