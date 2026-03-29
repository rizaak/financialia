import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import SendIcon from '@mui/icons-material/Send';
import {
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { formatMoney } from '../lib/formatMoney';
import { localDateInputToIsoMidday } from '../lib/localCalendarRange';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Spinner } from './ui/spinner';

const typeLabel: Record<AccountRow['type'], string> = {
  BANK: 'Banco',
  WALLET: 'Cartera',
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta',
};

/** Montos desde este valor (misma moneda) piden confirmación explícita. */
const TRANSFER_CONFIRM_THRESHOLD = 5000;

function todayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
  defaultCurrency: string;
};

const textFieldSx = { '& .MuiInputBase-root': { borderRadius: 1.5 } };

export function TransferForm({ getAccessToken, onSaved, defaultCurrency }: Props) {
  const { postTransfer } = useTransactions(getAccessToken);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [onDate, setOnDate] = useState(todayInputDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAmt, setPendingAmt] = useState<number | null>(null);
  const [pendingFee, setPendingFee] = useState(0);

  const cur = defaultCurrency.toUpperCase().slice(0, 3);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAccounts(getAccessToken);
        if (cancelled) return;
        setAccounts(list);
        const inCur = list.filter((a) => a.currency.toUpperCase() === cur);
        const fromEligible = inCur.filter((a) => a.type !== 'CREDIT_CARD');
        setFromId((prev) => {
          if (prev && fromEligible.some((a) => a.id === prev)) return prev;
          return fromEligible.length >= 1 ? fromEligible[0].id : '';
        });
        setToId((prev) => {
          if (prev && inCur.some((a) => a.id === prev)) return prev;
          const firstFrom = fromEligible[0]?.id;
          const other = inCur.find((a) => a.id !== firstFrom);
          return other?.id ?? '';
        });
      } catch {
        if (!cancelled) {
          setAccounts([]);
          setFromId('');
          setToId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, cur]);

  const fromPool = useMemo(
    () => accounts.filter((a) => a.currency.toUpperCase() === cur && a.type !== 'CREDIT_CARD'),
    [accounts, cur],
  );

  const destOptions = useMemo(() => {
    const inCur = accounts.filter((a) => a.currency.toUpperCase() === cur);
    if (!fromId) return inCur;
    return inCur.filter((a) => a.id !== fromId);
  }, [accounts, fromId, cur]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  async function performTransfer(amt: number, feeNum: number) {
    setSubmitting(true);
    try {
      const amountLabel = formatMoney(amt, cur);
      const result = await postTransfer(
        {
          fromAccountId: fromId,
          toAccountId: toId,
          amount: amt,
          fee: feeNum > 0 ? feeNum : undefined,
          notes: notes.trim() || undefined,
          occurredAt: localDateInputToIsoMidday(onDate),
        },
        {
          loadingMessage: 'Procesando transferencia…',
          successMessage: `💸 Transferencia de ${amountLabel} realizada correctamente`,
          successDescription:
            fromAccount && toAccount ? `${fromAccount.name} → ${toAccount.name}` : undefined,
        },
      );
      if (result !== undefined) {
        setAmount('');
        setFee('');
        setNotes('');
        await onSaved();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Indica un monto válido mayor que cero.');
      return;
    }
    if (!fromId || !toId) {
      setError('Elige cuenta de origen y destino.');
      return;
    }
    if (fromId === toId) {
      setError('Origen y destino deben ser distintos.');
      return;
    }
    let feeNum = 0;
    if (fee.trim()) {
      feeNum = Number(String(fee).replace(',', '.'));
      if (!Number.isFinite(feeNum) || feeNum < 0) {
        setError('La comisión debe ser un número mayor o igual a cero.');
        return;
      }
    }

    if (amt >= TRANSFER_CONFIRM_THRESHOLD) {
      setPendingAmt(amt);
      setPendingFee(feeNum);
      setConfirmOpen(true);
      return;
    }
    await performTransfer(amt, feeNum);
  }

  function handleConfirmTransfer() {
    setConfirmOpen(false);
    if (pendingAmt === null) return;
    const amt = pendingAmt;
    const feeNum = pendingFee;
    setPendingAmt(null);
    void performTransfer(amt, feeNum);
  }

  const confirmAmountLabel = pendingAmt !== null ? formatMoney(pendingAmt, cur) : '';
  const confirmFrom = fromAccount?.name ?? 'origen';
  const confirmTo = toAccount?.name ?? 'destino';

  const adorn = (icon: ReactNode) => (
    <InputAdornment position="start" sx={{ ml: 0.5 }}>
      {icon}
    </InputAdornment>
  );

  return (
    <>
      <form onSubmit={(e) => void onSubmit(e)}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            {fromPool.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tienes cuentas de débito en {cur}.
              </Typography>
            ) : (
              <TextField
                select
                fullWidth
                label="Desde"
                value={fromId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFromId(id);
                  setToId((prev) => (prev === id ? '' : prev));
                }}
                disabled={submitting}
                sx={textFieldSx}
                InputProps={{
                  startAdornment: adorn(<AccountBalanceIcon fontSize="small" color="action" />),
                }}
              >
                {fromPool.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} · {typeLabel[a.type]} · {formatMoney(a.balance, a.currency)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {destOptions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay cuenta de destino disponible.
              </Typography>
            ) : (
              <TextField
                select
                fullWidth
                label="Hacia"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                disabled={submitting}
                sx={textFieldSx}
                InputProps={{
                  startAdornment: adorn(<AccountBalanceIcon fontSize="small" color="action" />),
                }}
              >
                {destOptions.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name} · {typeLabel[a.type]} ·{' '}
                    {a.type === 'CREDIT_CARD'
                      ? `Deuda ${formatMoney(a.balance, a.currency)}`
                      : formatMoney(a.balance, a.currency)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Monto a mover"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              autoComplete="off"
              sx={textFieldSx}
              InputProps={{
                startAdornment: adorn(<AttachMoneyIcon fontSize="small" color="action" />),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Comisión (opcional)"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0 — se registra como gasto en Comisiones bancarias"
              disabled={submitting}
              autoComplete="off"
              sx={textFieldSx}
              InputProps={{
                startAdornment: adorn(<AttachMoneyIcon fontSize="small" color="action" />),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Fecha"
              value={onDate}
              onChange={(e) => setOnDate(e.target.value)}
              disabled={submitting}
              InputLabelProps={{ shrink: true }}
              sx={textFieldSx}
              InputProps={{
                startAdornment: adorn(<EventIcon fontSize="small" color="action" />),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. SPEI, retiro"
              inputProps={{ maxLength: 2000 }}
              disabled={submitting}
              sx={textFieldSx}
            />
          </Grid>
        </Grid>

        {error ? (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : null}

        <Button
          type="submit"
          variant="contained"
          disabled={submitting || destOptions.length === 0}
          startIcon={submitting ? undefined : <SendIcon />}
          sx={{ mt: 2, width: 'fit-content' }}
        >
          {submitting ? <Spinner className="text-white" sizeClassName="size-4" /> : null}
          {submitting ? 'Transfiriendo…' : 'Transferir'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', maxWidth: 560 }}>
          El monto solo cambia de cuenta; no cuenta como ingreso ni gasto. La comisión del banco, si la indicas, se
          registra como gasto real.
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'warning.dark' }}>
          Transferencias de {formatMoney(TRANSFER_CONFIRM_THRESHOLD, cur)} o más piden confirmación.
        </Typography>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar transferencia</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              ¿Estás seguro de mover <strong className="font-semibold text-zinc-900">{confirmAmountLabel}</strong>{' '}
              de <strong className="font-semibold text-zinc-900">{confirmFrom}</strong> a{' '}
              <strong className="font-semibold text-zinc-900">{confirmTo}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingAmt(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => void handleConfirmTransfer()}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow hover:bg-emerald-800"
            >
              Sí, transferir
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
