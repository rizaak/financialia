import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useEffect, useState } from 'react';
import { createAccount, type AccountRow } from '../../api/fetchAccounts';
import { VI_SUCCESS_MESSAGE } from '../../config/brandConfig';
import { useTransaction } from '../../hooks/useTransaction';
import { Spinner } from '../ui/spinner';

const inputSx = { '& .MuiInputBase-root': { borderRadius: 1.5 } };

export type NewAccountDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onCreated: () => void | Promise<void>;
};

export function NewAccountDialog({
  open,
  onClose,
  getAccessToken,
  defaultCurrency,
  onCreated,
}: NewAccountDialogProps) {
  const { run } = useTransaction();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountRow['type']>('BANK');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [paymentDueDaysAfterClosing, setPaymentDueDaysAfterClosing] = useState('20');
  const [annualInterestRatePct, setAnnualInterestRatePct] = useState('0.45');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCreateErr(null);
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    const name = newName.trim();
    if (!name) {
      setCreateErr('Escribe un nombre.');
      return;
    }
    if (newType === 'CREDIT_CARD') {
      const lim = Number(String(creditLimit).replace(',', '.'));
      if (!Number.isFinite(lim) || lim < 0) {
        setCreateErr('Indica un límite de crédito válido (≥ 0).');
        return;
      }
      const cd = Number(String(closingDay).trim());
      if (!Number.isFinite(cd) || cd < 1 || cd > 31) {
        setCreateErr('Indica un día de corte válido (1–31).');
        return;
      }
      const dueDays = Number(String(paymentDueDaysAfterClosing).trim());
      if (!Number.isFinite(dueDays) || dueDays < 1 || dueDays > 60) {
        setCreateErr('Indica días hasta el pago después del corte (1–60).');
        return;
      }
      const cat = Number(String(annualInterestRatePct).replace(',', '.'));
      if (!Number.isFinite(cat) || cat < 0 || cat > 5) {
        setCreateErr('Indica la tasa anual CAT (0–5, ej. 0.45 = 45%).');
        return;
      }
    }
    setCreating(true);
    try {
      const result = await run(
        () =>
          createAccount(getAccessToken, {
            name,
            type: newType,
            currency: defaultCurrency,
            ...(newType === 'CREDIT_CARD'
              ? {
                  creditLimit: Number(String(creditLimit).replace(',', '.')),
                  closingDay: Number(String(closingDay).trim()),
                  paymentDueDaysAfterClosing: Number(String(paymentDueDaysAfterClosing).trim()),
                  annualInterestRatePct: Number(String(annualInterestRatePct).replace(',', '.')),
                }
              : {}),
          }),
        {
          loadingMessage: 'Creando cuenta…',
          successMessage: VI_SUCCESS_MESSAGE,
          successDescription: `Cuenta creada: ${name}`,
        },
      );
      if (result !== undefined) {
        setNewName('');
        setCreditLimit('');
        setClosingDay('');
        setPaymentDueDaysAfterClosing('20');
        setAnnualInterestRatePct('0.45');
        setNewType('BANK');
        await onCreated();
        onClose();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!creating) onClose();
      }}
      disableEscapeKeyDown={creating}
      fullWidth
      maxWidth="sm"
    >
      <form onSubmit={(e) => void onSubmit(e)}>
        <DialogTitle>Nueva cuenta</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <TextField
              label="Nombre"
              placeholder="Ej. BBVA, Visa Oro"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={creating}
              required
              fullWidth
              inputProps={{ maxLength: 120 }}
              sx={inputSx}
            />
            <FormControl fullWidth sx={inputSx}>
              <InputLabel id="new-acc-type">Tipo</InputLabel>
              <Select
                labelId="new-acc-type"
                label="Tipo"
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountRow['type'])}
                disabled={creating}
              >
                <MenuItem value="BANK">Banco</MenuItem>
                <MenuItem value="WALLET">Cartera</MenuItem>
                <MenuItem value="CASH">Efectivo</MenuItem>
                <MenuItem value="CREDIT_CARD">Tarjeta de crédito</MenuItem>
              </Select>
            </FormControl>

            {newType === 'CREDIT_CARD' ? (
              <Stack spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Datos de la tarjeta
                </Typography>
                <TextField
                  label="Límite de crédito"
                  inputMode="decimal"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  disabled={creating}
                  required
                  fullWidth
                  placeholder="Ej. 50000"
                  sx={inputSx}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Día de corte (1–31)"
                    inputMode="numeric"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    disabled={creating}
                    required
                    fullWidth
                    placeholder="Ej. 15"
                    sx={inputSx}
                  />
                  <TextField
                    label="Días hasta pago (tras corte)"
                    inputMode="numeric"
                    value={paymentDueDaysAfterClosing}
                    onChange={(e) => setPaymentDueDaysAfterClosing(e.target.value)}
                    disabled={creating}
                    required
                    fullWidth
                    placeholder="Ej. 20"
                    sx={inputSx}
                  />
                </Stack>
                <TextField
                  label="Tasa anual CAT (0–1)"
                  inputMode="decimal"
                  value={annualInterestRatePct}
                  onChange={(e) => setAnnualInterestRatePct(e.target.value)}
                  disabled={creating}
                  required
                  fullWidth
                  helperText="Ej. 0.45 = 45% anual"
                  placeholder="0.45"
                  sx={inputSx}
                />
              </Stack>
            ) : null}

            {createErr ? (
              <Typography variant="body2" color="error">
                {createErr}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button type="button" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={creating} sx={{ gap: 1 }}>
            {creating ? <Spinner className="text-white" sizeClassName="size-4" /> : null}
            {creating ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
