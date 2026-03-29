import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AccountRow } from '../../api/fetchAccounts';
import { fetchAccounts } from '../../api/fetchAccounts';
import { createTieredInvestmentWithStrategy } from '../../api/fetchInvestments';
import { InvestmentTierFields, type TierFieldRow } from './InvestmentTierFields';

function newTier(): TierFieldRow {
  return { id: crypto.randomUUID(), upperLimit: '', annualRatePct: '' };
}

type Props = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onCreated: () => void | Promise<void>;
};

export function NewInvestmentDialog({
  open,
  onClose,
  getAccessToken,
  defaultCurrency,
  onCreated,
}: Props) {
  const [name, setName] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [tiers, setTiers] = useState<TierFieldRow[]>([newTier()]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [payoutFrequency, setPayoutFrequency] = useState<'DAILY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [autoReinvest, setAutoReinvest] = useState(false);
  /** true = dinero disponible de inmediato (API `isLiquid`). */
  const [isLiquid, setIsLiquid] = useState(true);
  const [maturityDate, setMaturityDate] = useState('');
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setInitialDeposit('');
    setTiers([newTier()]);
    setAccount(null);
    setPayoutFrequency('MONTHLY');
    setAutoReinvest(false);
    setIsLiquid(true);
    setMaturityDate('');
    setSubmitErr(null);
    void (async () => {
      try {
        const list = await fetchAccounts(getAccessToken);
        setAccounts(list);
      } catch {
        setAccounts([]);
      }
    })();
  }, [open, getAccessToken]);

  function addTier() {
    setTiers((rows) => [...rows, newTier()]);
  }

  function removeTier(id: string) {
    setTiers((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)));
  }

  function patchTier(id: string, patch: Partial<TierFieldRow>) {
    setTiers((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    setSubmitErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setSubmitErr('Indica el nombre de la inversión.');
      return;
    }
    if (!account) {
      setSubmitErr('Selecciona la cuenta de origen.');
      return;
    }
    const dep = Number(initialDeposit.replace(/,/g, '').replace(',', '.'));
    if (!Number.isFinite(dep) || dep <= 0) {
      setSubmitErr('Indica un monto inicial válido.');
      return;
    }
    for (let i = 0; i < tiers.length; i++) {
      const pct = parseFloat(tiers[i].annualRatePct.replace(',', '.'));
      if (!Number.isFinite(pct) || pct < 0) {
        setSubmitErr(`Tramo ${i + 1}: indica un porcentaje anual válido (0 o mayor).`);
        return;
      }
    }
    for (let i = 0; i < tiers.length; i++) {
      const isLast = i === tiers.length - 1;
      const raw = tiers[i].upperLimit.trim().replace(/,/g, '');
      if (!isLast) {
        const ul = Number(raw);
        if (!Number.isFinite(ul) || ul < 0) {
          setSubmitErr(`Tramo ${i + 1}: indica el límite superior acumulado.`);
          return;
        }
      }
    }

    if (!isLiquid) {
      const md = maturityDate.trim();
      if (!md) {
        setSubmitErr('Indica la fecha de vencimiento cuando el capital no está disponible de inmediato.');
        return;
      }
    }

    const tiersPayload = tiers.map((row, i) => {
      const isLast = i === tiers.length - 1;
      const raw = row.upperLimit.trim().replace(/,/g, '');
      const annualRatePct = parseFloat(row.annualRatePct.replace(',', '.'));
      if (!isLast) {
        return { annualRatePct, upperLimit: Number(raw) };
      }
      return { annualRatePct, upperLimit: null };
    });

    setSubmitting(true);
    try {
      const created = await createTieredInvestmentWithStrategy(getAccessToken, {
        strategyName: trimmed,
        name: trimmed,
        originAccountId: account.id,
        initialDeposit: dep,
        currency: account.currency ?? defaultCurrency,
        payoutFrequency,
        autoReinvest,
        isLiquid,
        ...(isLiquid ? {} : { maturityDate: `${maturityDate.trim()}T12:00:00.000Z` }),
        tiers: tiersPayload,
      });
      toast.success(
        `✅ Inversión '${trimmed}' creada correctamente. Saldo descontado de ${created.originAccount.name}`,
      );
      await onCreated();
      onClose();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : 'No se pudo crear la inversión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva inversión por tramos</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Nombre de la inversión"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Monto inicial"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value)}
            fullWidth
            required
            inputProps={{ inputMode: 'decimal' }}
          />

          <Autocomplete
            options={accounts}
            value={account}
            onChange={(_, v) => setAccount(v)}
            getOptionLabel={(o) => `${o.name} · ${o.balance} ${o.currency}`}
            renderInput={(params) => <TextField {...params} label="Cuenta de origen" required />}
          />

          <TextField
            select
            label="Frecuencia de pago"
            value={payoutFrequency}
            onChange={(e) =>
              setPayoutFrequency(e.target.value as 'DAILY' | 'MONTHLY' | 'ANNUAL')
            }
            fullWidth
          >
            <MenuItem value="DAILY">Diaria</MenuItem>
            <MenuItem value="MONTHLY">Mensual</MenuItem>
            <MenuItem value="ANNUAL">Anual</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch checked={autoReinvest} onChange={(e) => setAutoReinvest(e.target.checked)} />
            }
            label="Reinvertir intereses automáticamente"
          />

          <FormControlLabel
            control={
              <Switch
                checked={isLiquid}
                onChange={(e) => {
                  setIsLiquid(e.target.checked);
                  if (e.target.checked) setMaturityDate('');
                }}
              />
            }
            label="¿Dinero disponible de inmediato?"
          />
          {!isLiquid ? (
            <TextField
              label="Fecha de vencimiento (liberación del capital)"
              type="date"
              value={maturityDate}
              onChange={(e) => setMaturityDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          ) : null}

          {submitErr ? (
            <Alert severity="error" variant="outlined">
              {submitErr}
            </Alert>
          ) : null}

          <InvestmentTierFields
            tiers={tiers}
            onAdd={addTier}
            onRemove={removeTier}
            onPatch={patchTier}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear inversión'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
