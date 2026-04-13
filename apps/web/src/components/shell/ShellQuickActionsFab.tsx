import { Fab, Menu, MenuItem, useTheme } from '@mui/material';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { ArrowLeftRight, CalendarClock, Plus, Receipt, Repeat, TrendingUp } from 'lucide-react';
import type { CategoryRow } from '../../api/categoryTypes';
import { fetchAccounts, type AccountRow } from '../../api/fetchAccounts';
import { fetchCategories } from '../../api/fetchCategories';
import { listTransactions, TRANSACTION_LIST_MAX } from '../../api/fetchTransactions';
import { buildExpenseCategoryUsageOrder } from '../../lib/expenseCategoryUsage';
import { formatDashboardLoadError } from '../../lib/formatDashboardLoadError';
import { MsiRegisterDialog } from '../shared/MsiRegisterDialog';
import { NewSubscriptionDialog } from '../shared/NewSubscriptionDialog';
import { TransactionDialog, type TransactionDialogMode } from '../shared/TransactionDialog';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
};

export function ShellQuickActionsFab({ getAccessToken, defaultCurrency }: Props) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [expenseCategoryUsageOrder, setExpenseCategoryUsageOrder] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fabDialog, setFabDialog] = useState<
    | { type: 'transaction'; mode: TransactionDialogMode }
    | { type: 'msi' }
    | { type: 'subscription' }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [cats, accs, txs] = await Promise.all([
        fetchCategories(getAccessToken),
        fetchAccounts(getAccessToken),
        listTransactions(getAccessToken, TRANSACTION_LIST_MAX),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setExpenseCategoryUsageOrder(buildExpenseCategoryUsageOrder(txs));
    } catch (e) {
      setCategories([]);
      setAccounts([]);
      setExpenseCategoryUsageOrder([]);
      setLoadError(formatDashboardLoadError(e));
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openMenu(e: MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
  }

  function closeMenu() {
    setAnchorEl(null);
  }

  function openTransactionDialog(mode: TransactionDialogMode) {
    closeMenu();
    if (loadError && accounts.length === 0) {
      return;
    }
    setFabDialog({ type: 'transaction', mode });
  }

  function openMsiDialog() {
    closeMenu();
    if (loadError && accounts.length === 0) {
      return;
    }
    setFabDialog({ type: 'msi' });
  }

  function openSubscriptionDialog() {
    closeMenu();
    if (loadError && accounts.length === 0) {
      return;
    }
    setFabDialog({ type: 'subscription' });
  }

  function closeDialog() {
    setFabDialog(null);
  }

  return (
    <>
      <Fab
        color="primary"
        aria-label="Acciones rápidas de movimientos"
        onClick={openMenu}
        sx={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: theme.zIndex.drawer + 2,
        }}
      >
        <Plus size={26} strokeWidth={2.25} />
      </Fab>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { mt: -1, minWidth: 260 },
          },
        }}
      >
        <MenuItem
          onClick={() => openTransactionDialog('expense')}
          disabled={Boolean(loadError) && accounts.length === 0}
        >
          <span className="mr-2 inline-flex text-[#3b82f6]">
            <Receipt size={18} strokeWidth={2} />
          </span>
          Registrar gasto
        </MenuItem>
        <MenuItem
          onClick={() => openTransactionDialog('income')}
          disabled={Boolean(loadError) && accounts.length === 0}
        >
          <span className="mr-2 inline-flex text-sky-400">
            <TrendingUp size={18} />
          </span>
          Ingresar dinero
        </MenuItem>
        <MenuItem
          onClick={() => openTransactionDialog('transfer')}
          disabled={Boolean(loadError) && accounts.length === 0}
        >
          <span className="mr-2 inline-flex text-violet-700">
            <ArrowLeftRight size={18} />
          </span>
          Transferir entre cuentas
        </MenuItem>
        <MenuItem
          onClick={() => openMsiDialog()}
          disabled={Boolean(loadError) && accounts.length === 0}
        >
          <span className="mr-2 inline-flex text-[#3b82f6]">
            <CalendarClock size={18} />
          </span>
          Registrar MSI
        </MenuItem>
        <MenuItem
          onClick={() => openSubscriptionDialog()}
          disabled={Boolean(loadError) && accounts.length === 0}
        >
          <span className="mr-2 inline-flex text-[#3b82f6]">
            <Repeat size={18} strokeWidth={2} />
          </span>
          Nueva suscripción
        </MenuItem>
      </Menu>

      {fabDialog?.type === 'transaction' ? (
        <TransactionDialog
          open
          onClose={closeDialog}
          mode={fabDialog.mode}
          getAccessToken={getAccessToken}
          categories={categories}
          accounts={accounts}
          defaultCurrency={defaultCurrency}
          expenseCategoryUsageOrder={expenseCategoryUsageOrder}
          onSaved={async () => {
            await load();
          }}
        />
      ) : null}
      {fabDialog?.type === 'msi' ? (
        <MsiRegisterDialog
          open
          onClose={closeDialog}
          getAccessToken={getAccessToken}
          categories={categories}
          accounts={accounts}
          defaultCurrency={defaultCurrency}
          expenseCategoryUsageOrder={expenseCategoryUsageOrder}
          onSaved={async () => {
            await load();
          }}
        />
      ) : null}
      {fabDialog?.type === 'subscription' ? (
        <NewSubscriptionDialog
          open
          onClose={closeDialog}
          getAccessToken={getAccessToken}
          categories={categories}
          accounts={accounts}
          defaultCurrency={defaultCurrency}
          onSaved={async () => {
            await load();
          }}
        />
      ) : null}
    </>
  );
}
