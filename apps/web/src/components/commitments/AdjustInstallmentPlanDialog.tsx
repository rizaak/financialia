import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  patchInstallmentPlan,
  type InstallmentPlanCommitmentRow,
} from '../../api/fetchInstallmentPlansMgmt';
import { formatMoney } from '../../lib/formatMoney';

export type AdjustInstallmentPlanDialogProps = {
  open: boolean;
  onClose: () => void;
  plan: InstallmentPlanCommitmentRow | null;
  getAccessToken: () => Promise<string>;
  onSaved: () => void | Promise<void>;
};

export function AdjustInstallmentPlanDialog({
  open,
  onClose,
  plan,
  getAccessToken,
  onSaved,
}: AdjustInstallmentPlanDialogProps) {
  const [monthly, setMonthly] = useState('');
  const [remaining, setRemaining] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !plan) return;
    setMonthly(String(Number(plan.monthlyAmount)));
    setRemaining(String(plan.remainingInstallments));
    setError(null);
  }, [open, plan]);

  async function save(alsoCancel: boolean) {
    if (!plan) return;
    setError(null);
    if (alsoCancel) {
      setSubmitting(true);
      const tid = toast.loading('Cancelando plan…');
      try {
        await patchInstallmentPlan(getAccessToken, plan.id, { cancel: true });
        toast.success('Plan cancelado', { id: tid });
        await onSaved();
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al cancelar';
        setError(msg);
        toast.error(msg, { id: tid });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const m = Number(String(monthly).replace(/,/g, '').replace(',', '.'));
    const r = parseInt(String(remaining).replace(/,/g, '').trim(), 10);
    if (!Number.isFinite(m) || m <= 0) {
      setError('Indica un monto de cuota mensual válido.');
      return;
    }
    if (!Number.isFinite(r) || r < 1) {
      setError('Las mensualidades restantes deben ser un entero ≥ 1.');
      return;
    }

    setSubmitting(true);
    const tid = toast.loading('Guardando…');
    try {
      await patchInstallmentPlan(getAccessToken, plan.id, {
        monthlyAmount: m,
        remainingInstallments: r,
      });
      toast.success('Plan actualizado', { id: tid });
      await onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      setError(msg);
      toast.error(msg, { id: tid });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>Ajustar MSI / diferido</DialogTitle>
      <DialogContent>
        {plan ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {plan.label} · {plan.accountName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cuota {plan.currentInstallment} de {plan.totalInstallments} · Restante estimado{' '}
              {formatMoney(plan.remainingToPay, plan.currency)}
            </Typography>
            <TextField
              label="Cuota mensual"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              fullWidth
              disabled={submitting}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Mensualidades restantes (incluye la actual)"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              fullWidth
              disabled={submitting}
              inputProps={{ inputMode: 'numeric', min: 1, step: 1 }}
              helperText="Número de pagos pendientes desde la cuota en curso."
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
        <Button onClick={() => onClose()} disabled={submitting} color="inherit">
          Cerrar
        </Button>
        <Button color="error" onClick={() => void save(true)} disabled={submitting || !plan}>
          Cancelar compromiso
        </Button>
        <Button variant="contained" onClick={() => void save(false)} disabled={submitting || !plan}>
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
}
