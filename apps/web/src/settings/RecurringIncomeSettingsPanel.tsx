import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { fetchCategories } from '../api/fetchCategories';
import type { CategoryRow } from '../api/categoryTypes';
import {
  confirmRecurringIncomeDeposit,
  createRecurringIncome,
  deleteRecurringIncome,
  fetchRecurringIncomes,
  type RecurringIncomeFrequency,
  type RecurringIncomeListRow,
} from '../api/fetchRecurringIncomes';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';
import { usePendingChatInsightStore } from '../stores/pendingChatInsightStore';

const NOMINA_SLUG = 'salario';

function parsePaymentDaysInput(raw: string): number[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
  return [...new Set(parts.filter((n) => Number.isInteger(n) && n >= 1 && n <= 31))].sort((a, b) => a - b);
}

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
};

export function RecurringIncomeSettingsPanel({ getAccessToken, defaultCurrency }: Props) {
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const refreshBalances = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  const [rows, setRows] = useState<RecurringIncomeListRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('Nómina');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringIncomeFrequency>('QUINCENAL');
  const [paymentDaysInput, setPaymentDaysInput] = useState('15, 30');
  const [accountId, setAccountId] = useState('');

  const nominaCategory = useMemo(
    () => categories.find((c) => c.slug === NOMINA_SLUG && c.kind === 'INCOME'),
    [categories],
  );
  const accountsInCur = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur),
    [accounts, cur],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [list, cats, accs] = await Promise.all([
        fetchRecurringIncomes(getAccessToken),
        fetchCategories(getAccessToken),
        fetchAccounts(getAccessToken),
      ]);
      setRows(list);
      setCategories(cats);
      setAccounts(accs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (accountsInCur.length === 1 && !accountId) {
      setAccountId(accountsInCur[0].id);
    }
  }, [accountsInCur, accountId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nominaCategory) {
      setError('No existe la categoría "Salario / nómina" en tu cuenta.');
      return;
    }
    const amt = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Indica un monto válido.');
      return;
    }
    const paymentDays = parsePaymentDaysInput(paymentDaysInput);
    if (paymentDays.length === 0) {
      setError('Indica al menos un día de pago (ej. 15 y 30).');
      return;
    }
    if (!accountId) {
      setError('Elige la cuenta donde depositan.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRecurringIncome(getAccessToken, {
        label: label.trim() || 'Nómina',
        amount: amt,
        frequency,
        paymentDays,
        categoryId: nominaCategory.id,
        accountId,
        currency: cur,
      });
      setAmount('');
      setPaymentDaysInput(frequency === 'QUINCENAL' ? '15, 30' : '1');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm('¿Archivar esta configuración de ingreso recurrente?')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRecurringIncome(getAccessToken, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar.');
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDeposit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const result = await confirmRecurringIncomeDeposit(getAccessToken, id);
      const pending = usePendingChatInsightStore.getState();
      if (result.interestRiskMessage?.trim()) {
        pending.enqueueChatMessage(result.interestRiskMessage.trim());
      }
      if (result.spendingInsight?.message?.trim()) {
        pending.enqueueChatMessage(result.spendingInsight.message.trim());
      }
      await refreshBalances(getAccessToken);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el ingreso.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Typography color="text.secondary">Cargando Mis Ingresos Fijos…</Typography>;
  }

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h6" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
          Mis Ingresos Fijos
        </Typography>
        <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
          Nómina
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Indica el monto estimado y si te pagan en días fijos (15 y 30) o una sola vez al mes. Si hoy toca
          quincena y aún no registraste el depósito, el chat lateral te recordará con un enlace para
          sumarlo a tu saldo.
        </Typography>
      </div>

      {!nominaCategory ? (
        <Alert severity="warning">
          No se encontró la categoría de ingreso &quot;Salario / nómina&quot;. Usa las categorías por defecto
          o crea una con slug <code>salario</code>.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Stack
        component="form"
        onSubmit={(e) => void onSubmit(e)}
        spacing={2}
        sx={{ maxWidth: 480 }}
      >
        <TextField
          label="Nombre (opcional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          size="small"
          fullWidth
          helperText="Ej. Nómina principal, empresa…"
        />
        <TextField
          label="Monto de la nómina"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          fullWidth
          required
          inputProps={{ inputMode: 'decimal' }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel id="freq-inc-label">Frecuencia</InputLabel>
          <Select
            labelId="freq-inc-label"
            label="Frecuencia"
            value={frequency}
            onChange={(e) => {
              const f = e.target.value as RecurringIncomeFrequency;
              setFrequency(f);
              setPaymentDaysInput(f === 'QUINCENAL' ? '15, 30' : '1');
            }}
          >
            <MenuItem value="QUINCENAL">Quincenal (días 15 y 30)</MenuItem>
            <MenuItem value="MONTHLY">Mensual (un día al mes)</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Días de pago en el mes"
          value={paymentDaysInput}
          onChange={(e) => setPaymentDaysInput(e.target.value)}
          size="small"
          fullWidth
          required
          helperText={
            frequency === 'QUINCENAL'
              ? 'Típico: 15 y 30. Separa con coma: 15, 30'
              : 'Ej. 1 o 28. Un solo día para pago mensual.'
          }
        />
        <FormControl size="small" fullWidth>
          <InputLabel id="cat-inc-label">Categoría</InputLabel>
          <Select
            labelId="cat-inc-label"
            label="Categoría"
            value={nominaCategory?.id ?? ''}
            disabled
          >
            {nominaCategory ? (
              <MenuItem value={nominaCategory.id}>{nominaCategory.name}</MenuItem>
            ) : null}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel id="acc-inc-label">Cuenta destino</InputLabel>
          <Select
            labelId="acc-inc-label"
            label="Cuenta destino"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accountsInCur.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" disabled={saving || !nominaCategory}>
          Guardar nómina
        </Button>
      </Stack>

      {rows.length > 0 ? (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
            Nóminas configuradas
          </Typography>
          <Stack spacing={1}>
            {rows.map((r) => (
              <Stack
                key={r.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <div>
                  <Typography variant="body2" fontWeight={600}>
                    {r.label} · {formatMoney(r.amount, r.currency)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.frequency === 'QUINCENAL' ? 'Quincenal' : 'Mensual'} · días {r.paymentDays.join(', ')} ·{' '}
                    {r.account.name}
                  </Typography>
                </div>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {r.dueToday && !r.hasIncomeRegisteredToday ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={saving}
                      onClick={() => void onConfirmDeposit(r.id)}
                    >
                      Registrar depósito
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={saving}
                    startIcon={<Trash2 size={16} />}
                    onClick={() => void onDelete(r.id)}
                  >
                    Archivar
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
