import {
  Alert,
  Button,
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
import { fetchAccounts, patchAccountStatus, type AccountRow } from '../api/fetchAccounts';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';

function accountTypeLabel(t: AccountRow['type']): string {
  switch (t) {
    case 'BANK':
      return 'Banco';
    case 'WALLET':
      return 'Cartera';
    case 'CASH':
      return 'Efectivo';
    case 'CREDIT_CARD':
      return 'Tarjeta de crédito';
    default:
      return t;
  }
}

type Props = {
  getAccessToken: () => Promise<string>;
  notifyTransactionSaved: () => void;
};

export function ArchivedAccountsSettingsPanel({ getAccessToken, notifyTransactionSaved }: Props) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAccounts(getAccessToken, { includeArchived: true });
      setRows(all.filter((a) => a.status === 'ARCHIVED'));
    } catch (e) {
      setError(formatDashboardLoadError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unarchive(a: AccountRow) {
    setBusyId(a.id);
    try {
      await patchAccountStatus(getAccessToken, a.id, { status: 'ACTIVE' });
      notifyTransactionSaved();
      await useFinanceStore.getState().refreshBalancesAfterMutation(getAccessToken);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desarchivar.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Cuentas y tarjetas que archivaste desde «Mis cuentas». Al desarchivar, vuelven a aparecer en el listado
        principal y en los cálculos de patrimonio.
      </Typography>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Typography color="text.secondary">Cargando…</Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay cuentas archivadas.
        </Typography>
      ) : (
        <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Moneda</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="right" width={140}>
                  Acción
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                  <TableCell>{accountTypeLabel(a.type)}</TableCell>
                  <TableCell>{a.currency}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(a.balance, a.currency)}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busyId === a.id}
                      onClick={() => void unarchive(a)}
                    >
                      Desarchivar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
