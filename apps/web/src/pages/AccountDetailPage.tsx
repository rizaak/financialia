import BuildOutlined from '@mui/icons-material/BuildOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import StraightenOutlined from '@mui/icons-material/StraightenOutlined';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  fetchCreditCardStatement,
  fetchInstallmentPlans,
  type CreditCardStatementApi,
  type InstallmentPlanRowApi,
} from '../api/fetchCreditCard';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchCategories } from '../api/fetchCategories';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import {
  deleteTransaction,
  listTransactions,
  TRANSACTION_LIST_MAX,
  type TransactionWithCategory,
} from '../api/fetchTransactions';
import { fetchTransfers, type TransferRecord } from '../api/fetchTransfers';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import { formatMoney } from '../lib/formatMoney';
import type { ShellOutletContext } from '../layouts/shellContext';
import { AdjustBalanceDialog } from '../components/accounts/AdjustBalanceDialog';
import { CreditCardInstallmentPlansSection } from '../components/CreditCardInstallmentPlansSection';
import { EditCreditCardDialog } from '../components/EditCreditCardDialog';
import { EditTransactionDialog } from '../components/shared/EditTransactionDialog';
import { toast } from 'sonner';
import { useFinanceStore } from '../stores/financeStore';

function txSignedAmount(tx: TransactionWithCategory): number {
  if (tx.type === 'ADJUSTMENT') {
    const s = tx.metadata?.signedDelta;
    if (typeof s === 'string') return Number(s);
    return 0;
  }
  const amt = Number(tx.amount);
  return tx.type === 'INCOME' ? amt : -amt;
}

function txTipoLabel(tx: TransactionWithCategory): string {
  if (tx.type === 'ADJUSTMENT') return 'Ajuste';
  return tx.type === 'INCOME' ? 'Ingreso' : 'Gasto';
}

export type MovementRow = {
  id: string;
  occurredAt: string;
  tipo: string;
  concepto: string;
  monto: number;
  moneda: string;
  /** Para estilo de fila (ajuste manual vs movimiento normal). */
  rowVariant: 'adjustment' | 'normal' | 'transfer';
  /** Solo filas de transacción (no transferencias). */
  sourceTxId?: string;
};

function mergeMovements(
  accountId: string,
  txs: TransactionWithCategory[],
  transfers: TransferRecord[],
): MovementRow[] {
  const rows: MovementRow[] = [];
  for (const tx of txs) {
    const isAdjustment = tx.type === 'ADJUSTMENT';
    rows.push({
      id: `tx-${tx.id}`,
      occurredAt: tx.occurredAt,
      tipo: txTipoLabel(tx),
      concepto: tx.category ? `${tx.concept} · ${tx.category.name}` : tx.concept,
      monto: txSignedAmount(tx),
      moneda: tx.currency,
      rowVariant: isAdjustment ? 'adjustment' : 'normal',
      sourceTxId: tx.id,
    });
  }
  for (const tr of transfers) {
    if (tr.originAccountId === accountId) {
      const amt = Number(tr.amount);
      rows.push({
        id: `tr-${tr.id}-out`,
        occurredAt: tr.occurredAt,
        tipo: 'Transferencia (salida)',
        concepto: `Hacia ${tr.destinationAccount.name}${tr.notes ? ` · ${tr.notes}` : ''}`,
        monto: -amt,
        moneda: tr.originAccount.currency,
        rowVariant: 'transfer',
      });
    }
    if (tr.destinationAccountId === accountId) {
      const amt = Number(tr.amount);
      rows.push({
        id: `tr-${tr.id}-in`,
        occurredAt: tr.occurredAt,
        tipo: 'Transferencia (entrada)',
        concepto: `Desde ${tr.originAccount.name}${tr.notes ? ` · ${tr.notes}` : ''}`,
        monto: amt,
        moneda: tr.destinationAccount.currency,
        rowVariant: 'transfer',
      });
    }
  }
  rows.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return rows;
}

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { getAccessToken, defaultCurrency, notifyTransactionSaved } = useOutletContext<ShellOutletContext>();
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  const [account, setAccount] = useState<AccountRow | null>(null);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState(0);
  const [ccStatement, setCcStatement] = useState<CreditCardStatementApi | null>(null);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanRowApi[]>([]);
  const [syncOpen, setSyncOpen] = useState(false);
  const [accountTxs, setAccountTxs] = useState<TransactionWithCategory[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editTx, setEditTx] = useState<TransactionWithCategory | null>(null);
  const [saveSnackOpen, setSaveSnackOpen] = useState(false);
  const [editCardOpen, setEditCardOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const [accounts, txs, transfers, cats] = await Promise.all([
        fetchAccounts(getAccessToken),
        listTransactions(getAccessToken, { limit: TRANSACTION_LIST_MAX, accountId }),
        fetchTransfers(getAccessToken, { limit: 100, accountId }),
        fetchCategories(getAccessToken),
      ]);
      setCategories(cats);
      setAccountTxs(txs);
      setAllAccounts(accounts);
      const acc = accounts.find((a) => a.id === accountId) ?? null;
      setAccount(acc);
      if (!acc) {
        setError('No encontramos esta cuenta o no te pertenece.');
        setRows([]);
        setAccountTxs([]);
        setCcStatement(null);
        setInstallmentPlans([]);
        return;
      }
      setRows(mergeMovements(accountId, txs, transfers));
      if (acc.type === 'CREDIT_CARD') {
        const [rStmt, rPlans] = await Promise.allSettled([
          fetchCreditCardStatement(getAccessToken, accountId),
          fetchInstallmentPlans(getAccessToken, accountId),
        ]);
        setCcStatement(rStmt.status === 'fulfilled' ? rStmt.value : null);
        setInstallmentPlans(rPlans.status === 'fulfilled' ? rPlans.value : []);
      } else {
        setCcStatement(null);
        setInstallmentPlans([]);
      }
    } catch (e) {
      setError(formatDashboardLoadError(e));
      setRows([]);
      setAccountTxs([]);
      setAccount(null);
      setCcStatement(null);
      setInstallmentPlans([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setDetailTab(0);
  }, [accountId]);

  const handleDeleteTx = useCallback(
    async (tx: TransactionWithCategory) => {
      if (
        !window.confirm(
          '¿Estás seguro? El saldo de tu cuenta se ajustará automáticamente.',
        )
      ) {
        return;
      }
      try {
        await deleteTransaction(getAccessToken, tx.id);
        await refreshBalancesAfterMutation(getAccessToken);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo eliminar.');
      }
    },
    [getAccessToken, load, refreshBalancesAfterMutation],
  );

  const columns: GridColDef<MovementRow>[] = useMemo(
    () => [
      {
        field: 'occurredAt',
        headerName: 'Fecha',
        width: 170,
        valueFormatter: (value: string) =>
          new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      },
      {
        field: 'tipo',
        headerName: 'Tipo',
        width: 200,
        renderCell: (params: GridRenderCellParams<MovementRow, string>) => {
          if (params.row.rowVariant === 'adjustment') {
            return (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <BuildOutlined sx={{ fontSize: 18, color: 'rgba(255,255,255,0.45)' }} aria-hidden />
                <Typography variant="body2" fontWeight={600} sx={{ color: '#FFFFFF' }}>
                  Ajuste manual
                </Typography>
              </Stack>
            );
          }
          return (
            <Typography variant="body2" sx={{ color: '#FFFFFF' }}>
              {params.value}
            </Typography>
          );
        },
      },
      { field: 'concepto', headerName: 'Concepto', flex: 1, minWidth: 220 },
      {
        field: 'monto',
        headerName: 'Monto',
        width: 140,
        type: 'number',
        renderCell: (params: GridRenderCellParams<MovementRow, number>) => {
          const v = params.value ?? 0;
          const adj = params.row.rowVariant === 'adjustment';
          const formatted = formatMoney(String(Math.abs(v)), params.row.moneda);
          const prefix = v < 0 ? '− ' : v > 0 ? '+ ' : '';
          return (
            <Typography variant="body2" sx={{ fontWeight: adj ? 500 : 600, color: '#FFFFFF' }} component="span">
              {prefix}
              {formatted}
            </Typography>
          );
        },
      },
      { field: 'moneda', headerName: 'Moneda', width: 90 },
      {
        field: 'actions',
        headerName: '',
        width: 96,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const id = params.row.sourceTxId;
          if (!id) return null;
          const tx = accountTxs.find((t) => t.id === id);
          if (!tx) return null;
          return (
            <Stack direction="row" spacing={0} justifyContent="flex-end">
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => setEditTx(tx)} aria-label="Editar transacción">
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => void handleDeleteTx(tx)}
                  aria-label="Eliminar transacción"
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [accountTxs, handleDeleteTx],
  );

  const movementsGridSx = {
    '& .MuiDataGrid-row.row-adjustment': {
      bgcolor: 'rgba(255, 255, 255, 0.06)',
      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.09)' },
    },
  } as const;

  const getMovementRowClassName = (params: { row: MovementRow }) =>
    params.row.rowVariant === 'adjustment' ? 'row-adjustment' : '';

  const cur = account?.currency ?? defaultCurrency;

  if (!accountId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">Falta el identificador de cuenta.</Typography>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Button
        component={RouterLink}
        to="/dashboard"
        startIcon={<ArrowLeft size={18} />}
        color="inherit"
        sx={{ mb: 2 }}
      >
        Volver al panel
      </Button>

      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" color="primary" fontWeight={700}>
          Detalle de cuenta
        </Typography>
        <Typography variant="h4" component="h1" fontWeight={800}>
          {account?.name ?? (loading ? 'Cargando…' : 'Cuenta')}
        </Typography>
        {account ? (
          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" component="span">
              Saldo actual: {formatMoney(account.balance, cur)} · {account.type}
              {account.status === 'ARCHIVED' ? ' · Archivada' : ''}
            </Typography>
            {account.status === 'ACTIVE' ? (
              <>
                {account.type === 'CREDIT_CARD' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<EditOutlined sx={{ fontSize: 18 }} />}
                    onClick={() => setEditCardOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Editar
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<StraightenOutlined sx={{ fontSize: 18 }} />}
                  onClick={() => setSyncOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Ajustar Saldo
                </Button>
              </>
            ) : null}
          </Box>
        ) : null}
      </Box>

      {account?.type === 'CREDIT_CARD' && ccStatement ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Pago para no generar intereses:{' '}
          <strong>{formatMoney(ccStatement.paymentToAvoidInterest, ccStatement.currency)}</strong>
          {' · '}Cargos del periodo: {formatMoney(ccStatement.balanceAtStatement, ccStatement.currency)}
          {Number(ccStatement.installmentRecurringPortion) > 0 ? (
            <>
              {' · '}
              Mensualidades MSI en curso:{' '}
              {formatMoney(ccStatement.installmentRecurringPortion, ccStatement.currency)}
            </>
          ) : null}
        </Alert>
      ) : null}

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {account?.type === 'CREDIT_CARD' ? (
        <>
          <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
            <Tab label="Movimientos" />
            <Tab label="Planes activos" />
          </Tabs>
          {detailTab === 0 ? (
            <Box sx={{ width: '100%', minHeight: 420 }}>
              <DataGrid<MovementRow>
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={(r) => r.id}
                getRowClassName={getMovementRowClassName}
                columnHeaderHeight={44}
                rowHeight={48}
                disableColumnMenu
                sx={movementsGridSx}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25, page: 0 } },
                  sorting: { sortModel: [{ field: 'occurredAt', sort: 'desc' }] },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                autoHeight
                localeText={{
                  noRowsLabel: loading ? 'Cargando movimientos…' : 'Sin movimientos para esta cuenta.',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              <CreditCardInstallmentPlansSection plans={installmentPlans} />
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ width: '100%', minHeight: 420 }}>
          <DataGrid<MovementRow>
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(r) => r.id}
            getRowClassName={getMovementRowClassName}
            columnHeaderHeight={44}
            rowHeight={48}
            disableColumnMenu
            sx={movementsGridSx}
            initialState={{
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
              sorting: { sortModel: [{ field: 'occurredAt', sort: 'desc' }] },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            disableRowSelectionOnClick
            autoHeight
            localeText={{
              noRowsLabel: loading ? 'Cargando movimientos…' : 'Sin movimientos para esta cuenta.',
            }}
          />
        </Box>
      )}

      <Button variant="outlined" onClick={() => navigate('/cuentas')} sx={{ mt: 2 }}>
        Ir a todas las cuentas
      </Button>

      <AdjustBalanceDialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        account={account?.status === 'ACTIVE' ? account : null}
        getAccessToken={getAccessToken}
        onSuccess={async () => {
          await refreshBalancesAfterMutation(getAccessToken);
          await load();
        }}
      />
    </Container>
    <EditCreditCardDialog
      open={editCardOpen}
      onClose={() => setEditCardOpen(false)}
      account={account?.type === 'CREDIT_CARD' ? account : null}
      getAccessToken={getAccessToken}
      onSaved={async () => {
        notifyTransactionSaved();
        await load();
      }}
    />
    <EditTransactionDialog
      open={editTx != null}
      onClose={() => setEditTx(null)}
      transaction={editTx}
      getAccessToken={getAccessToken}
      accounts={allAccounts}
      categories={categories}
      defaultCurrency={cur}
      onSaved={async () => {
        await load();
        setSaveSnackOpen(true);
      }}
    />
    <Snackbar
      open={saveSnackOpen}
      autoHideDuration={5000}
      onClose={() => setSaveSnackOpen(false)}
      message="Transacción y saldos actualizados correctamente."
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
    </>
  );
}
