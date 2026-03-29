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
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { CategoryRow } from '../api/categoryTypes';
import type { AccountRow } from '../api/fetchAccounts';
import {
  createRecurringExpense,
  type CreateRecurringExpenseBody,
  type RecurringFrequency,
} from '../api/fetchRecurringExpenses';

type Props = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  categories: CategoryRow[];
  accounts: AccountRow[];
  defaultCurrency: string;
  onCreated: () => void;
};

export function AddRecurringExpenseDialog({
  open,
  onClose,
  getAccessToken,
  categories,
  accounts,
  defaultCurrency,
  onCreated,
}: Props) {
  const expenseCats = useMemo(
    () =>
      [...categories].filter((c) => c.kind === 'EXPENSE').sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories],
  );
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const inCur = useMemo(() => accounts.filter((a) => a.currency.toUpperCase() === cur), [accounts, cur]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [frequency, setFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [billingMonth, setBillingMonth] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setAmount('');
    setBillingDay('1');
    setFrequency('MONTHLY');
    setBillingMonth('1');
    setCategoryId('');
    setAccountId(inCur.length === 1 ? inCur[0].id : '');
  }, [open, inCur]);

  async function submit() {
    const amt = Number(amount.replace(/,/g, ''));
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) return;
    const bd = Number(billingDay);
    if (!Number.isInteger(bd) || bd < 1 || bd > 31) return;
    if (!categoryId || !accountId) return;

    const body: CreateRecurringExpenseBody = {
      name: name.trim(),
      amount: amt,
      billingDay: bd,
      frequency,
      categoryId,
      accountId,
      currency: cur,
    };
    if (frequency === 'ANNUAL') {
      const bm = Number(billingMonth);
      if (!Number.isInteger(bm) || bm < 1 || bm > 12) return;
      body.billingMonth = bm;
    }

    setSubmitting(true);
    try {
      await createRecurringExpense(getAccessToken, body);
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nuevo cargo recurrente</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Netflix"
            fullWidth
            size="small"
            required
          />
          <TextField
            label="Monto"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            size="small"
            required
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="freq-label">Frecuencia</InputLabel>
            <Select
              labelId="freq-label"
              label="Frecuencia"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
            >
              <MenuItem value="MONTHLY">Mensual</MenuItem>
              <MenuItem value="ANNUAL">Anual</MenuItem>
            </Select>
          </FormControl>
          {frequency === 'ANNUAL' ? (
            <TextField
              label="Mes del cobro (1–12)"
              type="number"
              inputProps={{ min: 1, max: 12 }}
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              size="small"
              fullWidth
            />
          ) : null}
          <TextField
            label="Día de cargo (1–31)"
            type="number"
            inputProps={{ min: 1, max: 31 }}
            value={billingDay}
            onChange={(e) => setBillingDay(e.target.value)}
            size="small"
            fullWidth
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="cat-label">Categoría</InputLabel>
            <Select
              labelId="cat-label"
              label="Categoría"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {expenseCats.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="acc-label">Cuenta</InputLabel>
            <Select
              labelId="acc-label"
              label="Cuenta"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {inCur.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={submitting}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
