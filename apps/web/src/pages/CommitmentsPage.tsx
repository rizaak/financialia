import {
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CalendarClock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchAllActiveInstallmentPlans, type InstallmentPlanCommitmentRow } from '../api/fetchInstallmentPlansMgmt';
import {
  fetchRecurringExpensesList,
  recurringExpenseFrequencyLabel,
  type RecurringExpenseListRow,
} from '../api/fetchRecurringExpenses';
import { AdjustInstallmentPlanDialog } from '../components/commitments/AdjustInstallmentPlanDialog';
import { AdjustSubscriptionDialog } from '../components/commitments/AdjustSubscriptionDialog';
import { InstallmentProgressCell } from '../components/commitments/InstallmentProgressCell';
import { formatMoney } from '../lib/formatMoney';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import type { ShellOutletContext } from '../layouts/shellContext';

function freqLabel(f: RecurringExpenseListRow['frequency']): string {
  return recurringExpenseFrequencyLabel(f);
}

/** Redondeo equilibrado; el Paper recorta el contenido para alinear cabecera y borde exterior. */
const commitmentsTablePaperSx = {
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'transparent !important',
  backgroundImage: 'none !important',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: 'none',
  overflow: 'hidden',
} as const;

const commitmentsTableContainerSx = {
  backgroundColor: 'transparent',
  borderRadius: '12px',
  overflow: 'hidden',
} as const;

const commitmentsTableSx = {
  borderRadius: '12px',
  borderCollapse: 'collapse' as const,
  backgroundColor: 'transparent',
  width: '100%',
  '& .MuiTableHead-root .MuiTableCell-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: '#94a3b8',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: 'normal',
    lineHeight: 1.3,
    padding: '15px 16px',
    minHeight: 52,
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    borderRadius: 0,
    padding: '12px 16px',
    fontSize: '0.9rem',
    color: '#ffffff',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    verticalAlign: 'middle',
  },
} as const;

const commitmentsBodyRowSx = {
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  '& td': { borderRadius: 0 },
} as const;

export function CommitmentsPage() {
  const { getAccessToken, notifyTransactionSaved } = useOutletContext<ShellOutletContext>();
  const [msi, setMsi] = useState<InstallmentPlanCommitmentRow[]>([]);
  const [subs, setSubs] = useState<RecurringExpenseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msiEdit, setMsiEdit] = useState<InstallmentPlanCommitmentRow | null>(null);
  const [subEdit, setSubEdit] = useState<RecurringExpenseListRow | null>(null);

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
    void load();
  }, [load]);

  const onSaved = useCallback(async () => {
    notifyTransactionSaved();
    await load();
  }, [notifyTransactionSaved, load]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <div className="mb-6 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-800 dark:text-blue-200">
          <CalendarClock size={22} strokeWidth={2} aria-hidden />
        </span>
        <div>
          <Typography variant="overline" color="primary" fontWeight={700}>
            Finanzas
          </Typography>
          <Typography variant="h4" component="h1" fontWeight={800}>
            Gestión de compromisos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            MSI y diferidos en tarjetas, y suscripciones recurrentes. Ajusta montos o cancela lo que ya no
            aplica.
          </Typography>
        </div>
      </div>

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        MSI y compras a meses (activos)
      </Typography>
      <Paper elevation={0} sx={{ ...commitmentsTablePaperSx, mb: 4 }}>
        <TableContainer sx={commitmentsTableContainerSx}>
          <Table size="small" sx={commitmentsTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Concepto</TableCell>
                <TableCell>Tarjeta</TableCell>
                <TableCell align="right">Cuota / mes</TableCell>
                <TableCell align="center">Restantes</TableCell>
                <TableCell align="right">Pendiente</TableCell>
                <TableCell align="center">Progreso</TableCell>
                <TableCell align="right" />
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
                      No hay planes a meses activos.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                msi.map((row) => (
                  <TableRow key={row.id} sx={commitmentsBodyRowSx}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell align="right">{formatMoney(row.monthlyAmount, row.currency)}</TableCell>
                    <TableCell align="center">{row.remainingInstallments}</TableCell>
                    <TableCell align="right">{formatMoney(row.remainingToPay, row.currency)}</TableCell>
                    <TableCell align="center">
                      <InstallmentProgressCell row={row} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setMsiEdit(row)}>
                        Ajustar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        Suscripciones y pagos recurrentes
      </Typography>
      <Paper elevation={0} sx={commitmentsTablePaperSx}>
        <TableContainer sx={commitmentsTableContainerSx}>
          <Table size="small" sx={commitmentsTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Cuenta</TableCell>
                <TableCell>Frecuencia</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right" />
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
                  <TableRow key={row.id} sx={commitmentsBodyRowSx}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                    <TableCell>{row.account.name}</TableCell>
                    <TableCell>{freqLabel(row.frequency)}</TableCell>
                    <TableCell align="right">{formatMoney(row.amount, row.currency)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => setSubEdit(row)}>
                        Ajustar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <AdjustInstallmentPlanDialog
        open={msiEdit != null}
        onClose={() => setMsiEdit(null)}
        plan={msiEdit}
        getAccessToken={getAccessToken}
        onSaved={onSaved}
      />
      <AdjustSubscriptionDialog
        open={subEdit != null}
        onClose={() => setSubEdit(null)}
        row={subEdit}
        getAccessToken={getAccessToken}
        onSaved={onSaved}
      />
    </Container>
  );
}
