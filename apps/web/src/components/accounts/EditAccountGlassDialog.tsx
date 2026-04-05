import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  patchAccount,
  patchCreditCardAccount,
  type AccountRow,
} from '../../api/fetchAccounts';
import { VI_SUCCESS_MESSAGE } from '../../config/brandConfig';

const CLOSING_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const glassBackdrop = {
  sx: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
};

const glassPaper = {
  sx: {
    borderRadius: 2,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.88) 100%)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
  },
};

const glassFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.14)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.22)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(255, 255, 255, 0.35)' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'rgba(255, 255, 255, 0.85)' },
  '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.45)' },
};

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

export type EditAccountGlassDialogProps = {
  open: boolean;
  onClose: () => void;
  account: AccountRow | null;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function EditAccountGlassDialog({
  open,
  onClose,
  account,
  getAccessToken,
  onSaved,
}: EditAccountGlassDialogProps) {
  const [name, setName] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [catStr, setCatStr] = useState('');
  const [closingDay, setClosingDay] = useState(15);
  const [paymentDueDays, setPaymentDueDays] = useState<number | ''>(20);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCredit = account?.type === 'CREDIT_CARD';

  useEffect(() => {
    if (!open || !account) return;
    setError(null);
    setName(account.name);
    const b = Number(account.balance);
    setBalanceStr(b === 0 && Number.isFinite(b) ? '' : String(b));
    if (account.type === 'CREDIT_CARD') {
      setLimitStr(String(Number(account.creditLimit ?? 0)));
      const pct = account.creditCard
        ? (Number(account.creditCard.annualInterestRatePct) * 100).toFixed(2).replace(/\.?0+$/, '')
        : '';
      setCatStr(pct);
      setClosingDay(account.creditCard?.closingDay ?? 15);
    }
  }, [open, account]);

  async function handleUpdate() {
    if (!account) return;
    setError(null);

    if (isCredit) {
      const lim = Number(String(limitStr).replace(/,/g, '').replace(',', '.'));
      if (!Number.isFinite(lim) || lim < 0) {
        setError('El límite de crédito no puede ser negativo.');
        return;
      }
      const cat = parseAnnualCat(catStr);
      if (cat == null) {
        setError('Indica la tasa anual (ej. 45 o 45% o 0.45).');
        return;
      }
      if (closingDay < 1 || closingDay > 31) {
        setError('El día de corte debe estar entre 1 y 31.');
        return;
      }
      const dueDays = paymentDueDays === '' ? NaN : Number(paymentDueDays);
      if (!Number.isFinite(dueDays) || dueDays < 1 || dueDays > 60) {
        setError('Los días hasta el pago deben ser un número entre 1 y 60.');
        return;
      }
      const n = name.trim();
      if (!n) {
        setError('Indica un nombre para la tarjeta.');
        return;
      }
      setSubmitting(true);
      try {
        await patchCreditCardAccount(getAccessToken, account.id, {
          name: n,
          creditLimit: lim,
          annualInterestRatePct: cat,
          closingDay,
          paymentDueDaysAfterClosing: dueDays,
        });
        toast.success(VI_SUCCESS_MESSAGE, { description: 'He actualizado los datos de tu cuenta.' });
        await onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const n = name.trim();
    if (!n) {
      setError('Indica el nombre de la cuenta.');
      return;
    }
    const bal = Number(String(balanceStr).replace(/,/g, '').replace(',', '.'));
    if (!Number.isFinite(bal) || bal < 0) {
      setError('El saldo no puede ser negativo.');
      return;
    }
    const patch: Parameters<typeof patchAccount>[2] = {};
    if (n !== account.name) patch.name = n;
    const prevBal = Number(account.balance);
    if (!Number.isFinite(prevBal) || Math.abs(bal - prevBal) > 1e-9) {
      patch.actualBalance = bal;
    }
    if (Object.keys(patch).length === 0) {
      toast.message('Sin cambios por guardar.');
      return;
    }
    setSubmitting(true);
    try {
      await patchAccount(getAccessToken, account.id, patch);
      toast.success(VI_SUCCESS_MESSAGE, { description: 'He actualizado los datos de tu cuenta.' });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open && account != null}
      onClose={() => !submitting && onClose()}
      fullWidth
      maxWidth="sm"
      slotProps={{ backdrop: glassBackdrop }}
      PaperProps={glassPaper}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
        {isCredit ? 'Editar tarjeta de crédito' : 'Editar cuenta'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <TextField
            label={isCredit ? 'Nombre de la tarjeta' : 'Nombre de la cuenta'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            disabled={submitting}
            sx={glassFieldSx}
          />
          {!isCredit ? (
            <>
              <TextField
                label="Saldo actual"
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                fullWidth
                disabled={submitting}
                sx={glassFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                      $
                    </InputAdornment>
                  ),
                }}
                inputProps={{ inputMode: 'decimal' }}
              />
            </>
          ) : (
            <>
              <TextField
                label="Límite de crédito"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                fullWidth
                disabled={submitting}
                sx={glassFieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                      $
                    </InputAdornment>
                  ),
                }}
                inputProps={{ inputMode: 'decimal', min: 0 }}
              />
              <TextField
                label="Tasa de interés anual (CAT)"
                value={catStr}
                onChange={(e) => setCatStr(e.target.value)}
                fullWidth
                disabled={submitting}
                sx={glassFieldSx}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                      %
                    </InputAdornment>
                  ),
                }}
                placeholder="Ej. 45"
              />
              <FormControl
                fullWidth
                disabled={submitting}
                sx={{
                  ...glassFieldSx,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.14)' },
                  '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.55)' },
                }}
              >
                <InputLabel id="edit-cc-closing">Día de corte</InputLabel>
                <Select
                  labelId="edit-cc-closing"
                  label="Día de corte"
                  value={closingDay}
                  onChange={(e: SelectChangeEvent<number>) => setClosingDay(Number(e.target.value))}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: 'rgba(15, 23, 42, 0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiMenuItem-root': { color: '#fff' },
                      },
                    },
                  }}
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
                placeholder="Ej. 20"
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
                  } else if (paymentDueDays < 1) {
                    setPaymentDueDays(1);
                  } else if (paymentDueDays > 60) {
                    setPaymentDueDays(60);
                  }
                }}
                fullWidth
                disabled={submitting}
                sx={glassFieldSx}
                inputProps={{ min: 1, max: 60, step: 1 }}
                helperText="Días naturales entre el corte y la fecha límite de pago (1–60)."
              />
            </>
          )}
          {error ? (
            <Alert severity="error" sx={{ bgcolor: 'rgba(127, 29, 29, 0.35)', color: '#fecaca' }}>
              {error}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleUpdate()} disabled={submitting || !account}>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
