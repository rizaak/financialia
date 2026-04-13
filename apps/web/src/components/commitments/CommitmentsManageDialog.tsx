import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchAllActiveInstallmentPlans,
  patchInstallmentPlan,
  type InstallmentPlanCommitmentRow,
} from '../../api/fetchInstallmentPlansMgmt';
import {
  fetchRecurringExpensesList,
  patchRecurringExpense,
  recurringExpenseFrequencyLabel,
  type RecurringExpenseListRow,
} from '../../api/fetchRecurringExpenses';
import { VI_SUCCESS_MESSAGE } from '../../config/brandConfig';
import { formatDashboardLoadError } from '../../lib/formatDashboardLoadError';
import { formatMoney } from '../../lib/formatMoney';
import { AdjustInstallmentPlanDialog } from './AdjustInstallmentPlanDialog';
import { AdjustSubscriptionDialog } from './AdjustSubscriptionDialog';
import { InstallmentProgressCell } from './InstallmentProgressCell';

export type CommitmentsManageDialogProps = {
  open: boolean;
  onClose: () => void;
  getAccessToken: () => Promise<string>;
  /** Tras editar o eliminar: refrescar dashboard / disponible real. */
  onChanged: () => void | Promise<void>;
};

export function CommitmentsManageDialog({
  open,
  onClose,
  getAccessToken,
  onChanged,
}: CommitmentsManageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msi, setMsi] = useState<InstallmentPlanCommitmentRow[]>([]);
  const [subs, setSubs] = useState<RecurringExpenseListRow[]>([]);
  const [msiEdit, setMsiEdit] = useState<InstallmentPlanCommitmentRow | null>(null);
  const [subEdit, setSubEdit] = useState<RecurringExpenseListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([
        fetchAllActiveInstallmentPlans(getAccessToken),
        fetchRecurringExpensesList(getAccessToken),
      ]);
      setMsi(p);
      setSubs(r.filter((x) => !x.isArchived));
    } catch (e) {
      setError(formatDashboardLoadError(e));
      setMsi([]);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const afterMutation = useCallback(async () => {
    await onChanged();
    await load();
  }, [onChanged, load]);

  async function removeMsi(row: InstallmentPlanCommitmentRow) {
    if (
      !window.confirm(
        `¿Eliminar el plan MSI «${row.label}»? Se marcará como cancelado y dejará de contar en el disponible real.`,
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    const tid = toast.loading('Eliminando plan…');
    try {
      await patchInstallmentPlan(getAccessToken, row.id, { cancel: true });
      toast.success(VI_SUCCESS_MESSAGE, { id: tid, description: 'Plan MSI eliminado.' });
      await afterMutation();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      toast.error(msg, { id: tid });
    } finally {
      setDeleteBusy(false);
    }
  }

  async function removeSub(row: RecurringExpenseListRow) {
    if (
      !window.confirm(
        `¿Eliminar la suscripción «${row.name}»? Dejará de contar en el disponible real.`,
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    const tid = toast.loading('Archivando suscripción…');
    try {
      await patchRecurringExpense(getAccessToken, row.id, { isArchived: true });
      toast.success(VI_SUCCESS_MESSAGE, { id: tid, description: 'Suscripción eliminada.' });
      await afterMutation();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      toast.error(msg, { id: tid });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onClose={deleteBusy ? undefined : onClose} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>Gestionar compromisos activos</DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          {error ? (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          ) : null}

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            MSI y compras a meses
          </Typography>
          <TableContainer sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Tarjeta</TableCell>
                  <TableCell align="right">Cuota / mes</TableCell>
                  <TableCell align="center">Restantes</TableCell>
                  <TableCell align="right">Pendiente</TableCell>
                  <TableCell align="center">Progreso</TableCell>
                  <TableCell align="right" width={200} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        Cargando…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : msi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary">
                        No hay MSI activos.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  msi.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                      <TableCell>{row.accountName}</TableCell>
                      <TableCell align="right">{formatMoney(row.monthlyAmount, row.currency)}</TableCell>
                      <TableCell align="center">{row.remainingInstallments}</TableCell>
                      <TableCell align="right">{formatMoney(row.remainingToPay, row.currency)}</TableCell>
                      <TableCell align="center">
                        <InstallmentProgressCell row={row} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setMsiEdit(row)}
                            disabled={deleteBusy}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => void removeMsi(row)}
                            disabled={deleteBusy}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Suscripciones y pagos recurrentes
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Frecuencia</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell align="right" width={200} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        Cargando…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : subs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        No hay suscripciones activas.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  subs.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell>{row.account.name}</TableCell>
                      <TableCell>{recurringExpenseFrequencyLabel(row.frequency)}</TableCell>
                      <TableCell align="right">{formatMoney(row.amount, row.currency)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSubEdit(row)}
                            disabled={deleteBusy}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => void removeSub(row)}
                            disabled={deleteBusy}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={deleteBusy}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <AdjustInstallmentPlanDialog
        open={msiEdit != null}
        onClose={() => setMsiEdit(null)}
        plan={msiEdit}
        getAccessToken={getAccessToken}
        onSaved={afterMutation}
      />
      <AdjustSubscriptionDialog
        open={subEdit != null}
        onClose={() => setSubEdit(null)}
        row={subEdit}
        getAccessToken={getAccessToken}
        onSaved={afterMutation}
      />
    </>
  );
}
