import {
  Box,
  Button,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ArrowLeftRight,
  CalendarClock,
  Pencil,
  Repeat,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { CategoryRow } from '../api/categoryTypes';
import { fetchAccounts, type AccountRow } from '../api/fetchAccounts';
import { fetchCategories } from '../api/fetchCategories';
import { fetchAllActiveInstallmentPlans } from '../api/fetchInstallmentPlansMgmt';
import { fetchUpcomingCharges } from '../api/fetchRecurringExpenses';
import {
  listTransactions,
  type TransactionWithCategory,
  TRANSACTION_LIST_MAX,
} from '../api/fetchTransactions';
import { EditTransactionDialog } from '../components/shared/EditTransactionDialog';
import { MsiRegisterDialog } from '../components/shared/MsiRegisterDialog';
import { NewSubscriptionDialog } from '../components/shared/NewSubscriptionDialog';
import { TransactionDialog, type TransactionDialogMode } from '../components/shared/TransactionDialog';
import { buildExpenseCategoryUsageOrder } from '../lib/expenseCategoryUsage';
import { formatDashboardLoadError } from '../lib/formatDashboardLoadError';
import { formatMoney } from '../lib/formatMoney';
import type { ShellOutletContext } from '../layouts/shellContext';

function todayYmdLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function txDateYmd(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function isCreditCardMsiChargeToday(
  account: AccountRow | undefined,
  planCurrency: string,
  defaultCur: string,
): boolean {
  if (!account || account.type !== 'CREDIT_CARD' || !account.creditCard) return false;
  if (planCurrency.toUpperCase().slice(0, 3) !== defaultCur.toUpperCase().slice(0, 3)) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const dom = now.getDate();
  const closing = account.creditCard.closingDay;
  const eff = Math.min(closing, daysInMonth(y, m0));
  return dom === eff;
}

type FabDialog =
  | { kind: 'transaction'; mode: TransactionDialogMode }
  | { kind: 'msi' }
  | { kind: 'subscription' }
  | null;

const registerBody = '#E2E8F0';

function RegisterStatMini({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Box
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: 1,
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ textTransform: 'uppercase', letterSpacing: 0.04, color: 'rgba(255, 255, 255, 0.7)' }}
          >
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={800} sx={{ mt: 0.75, lineHeight: 1.2, color: '#ffffff' }}>
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: registerBody }}>
              {hint}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

const ACTION_CARD_SX = {
  height: '100%',
  borderRadius: '20px',
  bgcolor: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: 1,
  borderColor: 'divider',
  boxShadow: 'none',
  transition: 'box-shadow 0.2s, transform 0.15s',
  '&:hover': {
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  },
} as const;

function txTypeLabel(t: TransactionWithCategory): string {
  if (t.type === 'EXPENSE') return 'Gasto';
  if (t.type === 'INCOME') return 'Ingreso';
  if (t.type === 'ADJUSTMENT') return 'Ajuste';
  return t.type;
}

const registerActivityTableSx = {
  backgroundColor: 'transparent',
  border: 'none',
  borderCollapse: 'collapse' as const,
  '& .MuiTableCell-root': {
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  '& .MuiTableCell-root:focus': {
    outline: 'none',
  },
  '& .MuiTableBody-root .MuiTableRow-root': {
    backgroundColor: 'transparent',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05) !important',
    },
  },
  '& .MuiTableBody-root .MuiTableCell-root': {
    color: registerBody,
  },
  '& .MuiTableBody-root .MuiTableCell-root[data-amount="1"]': {
    color: '#ffffff',
    fontWeight: 600,
  },
} as const;

export function RegisterPage() {
  const { getAccessToken, configHint, defaultCurrency, notifyTransactionSaved } = useOutletContext<ShellOutletContext>();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [expenseCategoryUsageOrder, setExpenseCategoryUsageOrder] = useState<string[]>([]);
  const [upcoming, setUpcoming] = useState<Awaited<ReturnType<typeof fetchUpcomingCharges>>>([]);
  const [msiPlans, setMsiPlans] = useState<Awaited<ReturnType<typeof fetchAllActiveInstallmentPlans>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fabDialog, setFabDialog] = useState<FabDialog>(null);
  const [editTx, setEditTx] = useState<TransactionWithCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, accs, txs, up, plans] = await Promise.all([
        fetchCategories(getAccessToken),
        fetchAccounts(getAccessToken),
        listTransactions(getAccessToken, TRANSACTION_LIST_MAX),
        fetchUpcomingCharges(getAccessToken, 7),
        fetchAllActiveInstallmentPlans(getAccessToken),
      ]);
      setCategories(rows);
      setAccounts(accs);
      setTransactions(txs);
      setExpenseCategoryUsageOrder(buildExpenseCategoryUsageOrder(txs));
      setUpcoming(up);
      setMsiPlans(plans);
    } catch (e) {
      setCategories([]);
      setAccounts([]);
      setTransactions([]);
      setExpenseCategoryUsageOrder([]);
      setUpcoming([]);
      setMsiPlans([]);
      setError(formatDashboardLoadError(e));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const todayYmd = useMemo(() => todayYmdLocal(), []);

  const { expenseToday, incomeToday, upcomingTodayTotal } = useMemo(() => {
    const txsToday = transactions.filter((t) => txDateYmd(t.occurredAt) === todayYmd);
    let exp = 0;
    let inc = 0;
    for (const t of txsToday) {
      if (t.type === 'EXPENSE') exp += Number(t.amount);
      else if (t.type === 'INCOME') inc += Number(t.amount);
    }

    const subToday = upcoming
      .filter((u) => u.daysFromToday === 0 && u.currency.toUpperCase().slice(0, 3) === cur)
      .reduce((s, u) => s + Number(u.amount), 0);

    let msiToday = 0;
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    for (const p of msiPlans) {
      if (p.currency.toUpperCase().slice(0, 3) !== cur) continue;
      const acc = accountById.get(p.accountId);
      if (isCreditCardMsiChargeToday(acc, p.currency, defaultCurrency)) {
        msiToday += Number(p.monthlyAmount);
      }
    }

    return {
      expenseToday: exp,
      incomeToday: inc,
      upcomingTodayTotal: subToday + msiToday,
    };
  }, [transactions, todayYmd, upcoming, msiPlans, accounts, cur, defaultCurrency]);

  const recentFive = useMemo(() => transactions.slice(0, 5), [transactions]);

  function openTransaction(mode: TransactionDialogMode) {
    setFabDialog({ kind: 'transaction', mode });
  }

  function afterMutation() {
    notifyTransactionSaved();
    void load();
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: 'transparent !important',
        background: 'transparent !important',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-end' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={700}>
              Centro de operaciones
            </Typography>
            <Typography variant="h4" component="h1" fontWeight={800}>
              Registro
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: registerBody }}>
              Acciones rápidas, resumen del día y últimos movimientos.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => void load()} disabled={loading} sx={{ fontWeight: 600 }}>
            Actualizar
          </Button>
        </Stack>

        {configHint}

        {loading ? (
          <Typography sx={{ color: registerBody }}>Cargando…</Typography>
        ) : error ? (
          <Box
            sx={{
              borderRadius: '20px',
              border: 1,
              borderColor: 'error.light',
              bgcolor: 'rgba(244, 63, 94, 0.12)',
              p: 2,
            }}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RegisterStatMini
                  icon={<TrendingDown size={28} strokeWidth={2} />}
                  label="Gastos del día"
                  value={formatMoney(expenseToday, defaultCurrency)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RegisterStatMini
                  icon={<TrendingUp size={28} strokeWidth={2} />}
                  label="Ingresos del día"
                  value={formatMoney(incomeToday, defaultCurrency)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RegisterStatMini
                  icon={<Wallet size={28} strokeWidth={2} />}
                  label="Próximos cargos (hoy)"
                  value={formatMoney(upcomingTodayTotal, defaultCurrency)}
                  hint="Suscripciones con cargo hoy + cuota MSI si hoy es día de corte (tarjeta)."
                />
              </Grid>
            </Grid>

            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.06, color: '#ffffff' }}
            >
              Acciones rápidas
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card elevation={0} sx={ACTION_CARD_SX}>
                  <CardActionArea onClick={() => openTransaction('expense')} sx={{ p: 2.5, alignItems: 'stretch', minHeight: 168 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ color: 'success.main' }}>
                        <TrendingDown size={40} strokeWidth={2} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                        Gasto
                      </Typography>
                      <Typography variant="body2" sx={{ color: registerBody }}>
                        Registra un gasto en cuenta o tarjeta con categoría y validación de saldo.
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card elevation={0} sx={ACTION_CARD_SX}>
                  <CardActionArea onClick={() => openTransaction('income')} sx={{ p: 2.5, alignItems: 'stretch', minHeight: 168 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ color: 'info.main' }}>
                        <TrendingUp size={40} strokeWidth={2} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                        Ingreso
                      </Typography>
                      <Typography variant="body2" sx={{ color: registerBody }}>
                        Registra un abono o ingreso en efectivo o cuenta.
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card elevation={0} sx={ACTION_CARD_SX}>
                  <CardActionArea onClick={() => openTransaction('transfer')} sx={{ p: 2.5, alignItems: 'stretch', minHeight: 168 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ color: 'secondary.main' }}>
                        <ArrowLeftRight size={40} strokeWidth={2} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                        Transferencia
                      </Typography>
                      <Typography variant="body2" sx={{ color: registerBody }}>
                        Mueve dinero entre tus cuentas en la misma moneda.
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card elevation={0} sx={ACTION_CARD_SX}>
                  <CardActionArea onClick={() => setFabDialog({ kind: 'msi' })} sx={{ p: 2.5, alignItems: 'stretch', minHeight: 168 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ color: 'warning.main' }}>
                        <CalendarClock size={40} strokeWidth={2} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                        Nuevo MSI
                      </Typography>
                      <Typography variant="body2" sx={{ color: registerBody }}>
                        Compra a meses sin intereses en tarjeta: monto total y plazo en mensualidades.
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                <Card elevation={0} sx={ACTION_CARD_SX}>
                  <CardActionArea onClick={() => setFabDialog({ kind: 'subscription' })} sx={{ p: 2.5, alignItems: 'stretch', minHeight: 168 }}>
                    <Stack spacing={1.25}>
                      <Box sx={{ color: 'error.main' }}>
                        <Repeat size={40} strokeWidth={2} />
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff' }}>
                        Nueva suscripción
                      </Typography>
                      <Typography variant="body2" sx={{ color: registerBody }}>
                        Cargo recurrente: frecuencia, monto y día de cobro.
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            </Grid>

            <Box
              sx={{
                borderRadius: '20px',
                bgcolor: 'transparent' as const,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: 'none',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: 'transparent' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#ffffff' }}>
                  Actividad reciente
                </Typography>
                <Typography variant="caption" sx={{ color: registerBody }}>
                  Últimos 5 movimientos registrados
                </Typography>
              </Box>
              <TableContainer
                sx={{
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                }}
              >
                <Table size="small" sx={registerActivityTableSx}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Concepto</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="right" width={100}>
                        Acción
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentFive.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" sx={{ py: 2, color: registerBody }}>
                            Aún no hay movimientos.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentFive.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{txDateYmd(t.occurredAt)}</TableCell>
                          <TableCell>{txTypeLabel(t)}</TableCell>
                          <TableCell sx={{ maxWidth: 220, color: registerBody }}>{t.concept}</TableCell>
                          <TableCell>{t.category?.name ?? '—'}</TableCell>
                          <TableCell align="right" data-amount="1" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(t.amount, t.currency)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: registerBody }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Pencil size={16} />}
                              onClick={() => setEditTx(t)}
                              sx={{ fontWeight: 600, color: '#ffffff' }}
                            >
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {fabDialog?.kind === 'transaction' ? (
              <TransactionDialog
                open
                onClose={() => setFabDialog(null)}
                mode={fabDialog.mode}
                getAccessToken={getAccessToken}
                categories={categories}
                accounts={accounts}
                defaultCurrency={defaultCurrency}
                expenseCategoryUsageOrder={expenseCategoryUsageOrder}
                onSaved={afterMutation}
              />
            ) : null}
            {fabDialog?.kind === 'msi' ? (
              <MsiRegisterDialog
                open
                onClose={() => setFabDialog(null)}
                getAccessToken={getAccessToken}
                categories={categories}
                accounts={accounts}
                defaultCurrency={defaultCurrency}
                expenseCategoryUsageOrder={expenseCategoryUsageOrder}
                onSaved={afterMutation}
              />
            ) : null}
            {fabDialog?.kind === 'subscription' ? (
              <NewSubscriptionDialog
                open
                onClose={() => setFabDialog(null)}
                getAccessToken={getAccessToken}
                categories={categories}
                accounts={accounts}
                defaultCurrency={defaultCurrency}
                onSaved={afterMutation}
              />
            ) : null}

            <EditTransactionDialog
              open={editTx != null}
              onClose={() => setEditTx(null)}
              transaction={editTx}
              getAccessToken={getAccessToken}
              accounts={accounts}
              categories={categories}
              defaultCurrency={defaultCurrency}
              onSaved={afterMutation}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
