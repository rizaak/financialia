import { Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { fetchCategories } from '../api/fetchCategories';
import { listTransactions, TRANSACTION_LIST_MAX } from '../api/fetchTransactions';
import { CustomButton } from '../components/shared/CustomButton';
import { TransactionDialog, type TransactionDialogMode } from '../components/shared/TransactionDialog';
import { buildExpenseCategoryUsageOrder } from '../lib/expenseCategoryUsage';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import type { ShellOutletContext } from '../layouts/shellContext';

export function RegisterPage() {
  const { getAccessToken, configHint, defaultCurrency } = useOutletContext<ShellOutletContext>();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [expenseCategoryUsageOrder, setExpenseCategoryUsageOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TransactionDialogMode>('expense');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, accs, txs] = await Promise.all([
        fetchCategories(getAccessToken),
        fetchAccounts(getAccessToken),
        listTransactions(getAccessToken, TRANSACTION_LIST_MAX),
      ]);
      setCategories(rows);
      setAccounts(accs);
      setExpenseCategoryUsageOrder(buildExpenseCategoryUsageOrder(txs));
    } catch (e) {
      setCategories([]);
      setAccounts([]);
      setExpenseCategoryUsageOrder([]);
      setError(formatDashboardLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openDialog(mode: TransactionDialogMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={700}>
            Operaciones
          </Typography>
          <Typography variant="h4" component="h1" fontWeight={800}>
            Registro
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gastos, ingresos y transferencias con validación de saldo.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      {configHint}

      {loading ? (
        <Typography color="text.secondary">Cargando…</Typography>
      ) : error ? (
        <Box sx={{ borderRadius: 2, border: 1, borderColor: 'error.light', bgcolor: 'error.50', p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <CustomButton operationVariant="expense" onClick={() => openDialog('expense')} fullWidth>
              Nuevo gasto
            </CustomButton>
            <CustomButton operationVariant="income" onClick={() => openDialog('income')} fullWidth>
              Nuevo ingreso
            </CustomButton>
            <CustomButton operationVariant="transfer" onClick={() => openDialog('transfer')} fullWidth>
              Transferencia
            </CustomButton>
          </Stack>

          <TransactionDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            mode={dialogMode}
            getAccessToken={getAccessToken}
            categories={categories}
            accounts={accounts}
            defaultCurrency={defaultCurrency}
            expenseCategoryUsageOrder={expenseCategoryUsageOrder}
            onSaved={() => {
              void load();
            }}
          />
        </>
      )}
    </Box>
  );
}
