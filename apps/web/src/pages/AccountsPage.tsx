import AddIcon from '@mui/icons-material/Add';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { fetchAccounts as fetchAccountsApi, patchAccountStatus, type AccountRow } from '../api/fetchAccounts';
import { AddCreditCardDialog } from '../components/AddCreditCardDialog';
import { LiquidByTypeDonut } from '../components/accounts/LiquidByTypeDonut';
import { NewAccountDialog } from '../components/accounts/NewAccountDialog';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { TransferForm } from '../components/TransferForm';
import { CreditCardPaymentDialog } from '../dashboard/CreditCardPaymentDialog';
import type { ShellOutletContext } from '../layouts/shellContext';
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

function creditUtilizationPct(account: AccountRow): number {
  if (account.type !== 'CREDIT_CARD') return 0;
  const limit = Number(account.creditLimit ?? 0);
  const debt = Number(account.balance);
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((debt / limit) * 1000) / 10);
}

/** Uso del límite: >80% rojo, >50% naranja, si no verde. */
function creditUtilizationBarColor(pct: number): string {
  if (pct > 80) return '#e11d48';
  if (pct > 50) return '#d97706';
  return '#059669';
}

function accountHasNonZeroBalance(a: AccountRow): boolean {
  const n = Number(a.balance);
  return Number.isFinite(n) && Math.abs(n) > 1e-9;
}

export function AccountsPage() {
  const navigate = useNavigate();
  const { getAccessToken, defaultCurrency, notifyTransactionSaved } = useOutletContext<ShellOutletContext>();
  const summary = useFinanceStore((s) => s.accountsSummary);
  const loading = useFinanceStore((s) => s.accountsLoading);
  const error = useFinanceStore((s) => s.accountsError);
  const fetchAccounts = useFinanceStore((s) => s.fetchAccounts);
  const balanceRevision = useFinanceStore((s) => s.balancesRevision);

  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [addCreditCardOpen, setAddCreditCardOpen] = useState(false);
  const [payCard, setPayCard] = useState<AccountRow | null>(null);
  const [accountsAll, setAccountsAll] = useState<AccountRow[] | null>(null);
  const [archiveDialog, setArchiveDialog] = useState<'idle' | 'balance' | 'confirm'>('idle');
  const [archiveTarget, setArchiveTarget] = useState<AccountRow | null>(null);

  const refreshAllAccounts = useCallback(async () => {
    await fetchAccounts(getAccessToken);
    const all = await fetchAccountsApi(getAccessToken, { includeArchived: true });
    setAccountsAll(all);
  }, [getAccessToken, fetchAccounts]);

  useEffect(() => {
    void refreshAllAccounts();
  }, [refreshAllAccounts, balanceRevision]);

  const creditAccounts = useMemo(() => {
    const src = accountsAll ?? summary?.accounts ?? [];
    return src.filter((a) => a.type === 'CREDIT_CARD' && a.status !== 'ARCHIVED');
  }, [accountsAll, summary?.accounts]);

  const otherAccounts = useMemo(() => {
    const src = accountsAll ?? summary?.accounts ?? [];
    return src.filter((a) => a.type !== 'CREDIT_CARD' && a.status !== 'ARCHIVED');
  }, [accountsAll, summary?.accounts]);

  const archivedAccounts = useMemo(
    () => accountsAll?.filter((a) => a.status === 'ARCHIVED') ?? [],
    [accountsAll],
  );

  const cur = summary?.defaultCurrency ?? defaultCurrency;

  const debitAccountsForPayment = useMemo(() => {
    const c = cur.toUpperCase().slice(0, 3);
    const src = accountsAll ?? summary?.accounts ?? [];
    return src.filter(
      (a) =>
        a.status !== 'ARCHIVED' &&
        a.currency.toUpperCase().slice(0, 3) === c &&
        (a.type === 'BANK' || a.type === 'WALLET' || a.type === 'CASH'),
    );
  }, [accountsAll, summary?.accounts, cur]);

  const beginArchiveAccount = useCallback((a: AccountRow) => {
    setArchiveTarget(a);
    if (accountHasNonZeroBalance(a)) {
      setArchiveDialog('balance');
    } else {
      setArchiveDialog('confirm');
    }
  }, []);

  const closeArchiveDialogs = useCallback(() => {
    setArchiveDialog('idle');
    setArchiveTarget(null);
  }, []);

  const executeArchive = useCallback(async () => {
    if (!archiveTarget) return;
    const a = archiveTarget;
    try {
      await patchAccountStatus(getAccessToken, a.id, { status: 'ARCHIVED' });
      notifyTransactionSaved();
      await refreshAllAccounts();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'No se pudo archivar.');
    } finally {
      closeArchiveDialogs();
    }
  }, [archiveTarget, getAccessToken, notifyTransactionSaved, refreshAllAccounts, closeArchiveDialogs]);

  const goToTransferFromArchiveDialog = useCallback(() => {
    closeArchiveDialogs();
    void navigate('/cuentas#transferir-entre-cuentas');
    window.setTimeout(() => {
      document.getElementById('transferir-entre-cuentas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [closeArchiveDialogs, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Patrimonio</p>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Mis cuentas</h1>
            <p className="mt-1 text-sm text-zinc-500">Saldos y totales en {cur} (estado global sincronizado).</p>
          </div>
          <Stack direction="row" spacing={1} alignItems="center" className="self-start">
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewAccountOpen(true)}>
              Nueva cuenta
            </Button>
            <Button variant="outlined" onClick={() => void refreshAllAccounts()}>
              Actualizar
            </Button>
          </Stack>
        </header>

        {loading && !summary ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : error && !summary ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : summary ? (
          <div className="space-y-8">
          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard compact label="Total en bancos" value={formatMoney(summary.totalBanks, cur)} />
            <StatCard compact label="Total invertido" value={formatMoney(summary.totalInvestedTiered, cur)} />
            <StatCard compact label="Deuda total (tarjetas)" value={formatMoney(summary.totalCreditDebt, cur)} />
            <StatCard
              compact
              variant="highlight"
              label="Saldo neto total"
              value={formatMoney(summary.totalNetBalance, cur)}
              hint="(Efectivo + bancos + inversiones) − deuda en tarjetas"
            />
          </div>

          <SectionCard title="Líquido por tipo" subtitle="Distribución entre bancos, carteras y efectivo">
            <LiquidByTypeDonut
              totalBanks={summary.totalBanks}
              totalWallets={summary.totalWallets}
              totalCash={summary.totalCash}
              totalLiquid={summary.totalLiquid}
              currencyCode={cur}
            />
          </SectionCard>

          <div id="transferir-entre-cuentas">
            <SectionCard title="Transferir entre cuentas">
              <TransferForm
                getAccessToken={getAccessToken}
                defaultCurrency={cur}
                onSaved={() => {
                  void refreshAllAccounts();
                }}
              />
            </SectionCard>
          </div>

          <SectionCard
            title="Pasivos / Tarjetas"
            subtitle="La deuda de tarjeta reduce tu patrimonio neto. Proyecta cortes y tasas sin conexión bancaria."
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-600">
                Registra cortes y CAT para recordatorios; los pagos se confirman aquí a mano.
              </p>
              <button
                type="button"
                onClick={() => setAddCreditCardOpen(true)}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
              >
                Agregar tarjeta
              </button>
            </div>
            {creditAccounts.length === 0 ? (
              <p className="text-sm text-zinc-500">Aún no tienes tarjetas. Usa el botón para dar de alta una nueva.</p>
            ) : (
              <div className="space-y-6">
                {creditAccounts.map((a) => {
                  const pct = creditUtilizationPct(a);
                  const debt = Number(a.balance);
                  const limitNum = Number(a.creditLimit ?? 0);
                  const hasDebt = Number.isFinite(debt) && debt > 0;
                  const barColor = creditUtilizationBarColor(pct);
                  const barWidth = limitNum > 0 ? Math.min(100, pct) : 0;
                  return (
                    <Box
                      key={a.id}
                      sx={{
                        bgcolor: 'background.paper',
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <div>
                        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                          {a.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Corte: día {a.creditCard?.closingDay ?? '—'} · Pago:{' '}
                          {a.creditCard != null
                            ? `${a.creditCard.paymentDueDaysAfterClosing} días después del corte`
                            : '—'}{' '}
                          · CAT:{' '}
                          {a.creditCard != null
                            ? `${(Number(a.creditCard.annualInterestRatePct) * 100).toFixed(1)}%`
                            : '—'}
                        </Typography>
                      </div>

                      <Box
                        sx={{
                          mt: 2,
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <div>
                          <Typography variant="caption" color="text.secondary">
                            Límite
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {a.creditLimit != null ? formatMoney(a.creditLimit, a.currency) : '—'}
                          </Typography>
                        </div>
                        <div className="text-right">
                          <Typography variant="caption" color="text.secondary">
                            Deuda
                          </Typography>
                          <Typography variant="body1" fontWeight={800} color="text.primary" sx={{ display: 'block' }}>
                            {formatMoney(a.balance, a.currency)}
                          </Typography>
                        </div>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Gastado {formatMoney(a.balance, a.currency)} de{' '}
                          {a.creditLimit != null ? formatMoney(a.creditLimit, a.currency) : '—'} de límite
                        </Typography>
                        <div className="mb-1 flex justify-between text-xs text-zinc-600">
                          <span>Uso del límite</span>
                          <span>{pct}%</span>
                        </div>
                        <Box
                          sx={{
                            height: 10,
                            width: '100%',
                            borderRadius: 999,
                            bgcolor: 'grey.200',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${barWidth}%`,
                              borderRadius: 999,
                              bgcolor: barColor,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          mt: 2,
                          pt: 2,
                          borderTop: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Tooltip title="Archivar">
                          <IconButton
                            size="small"
                            aria-label={`Archivar ${a.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              beginArchiveAccount(a);
                            }}
                          >
                            <Inventory2OutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {hasDebt ? (
                          <Button variant="contained" size="small" onClick={() => setPayCard(a)}>
                            Registrar pago
                          </Button>
                        ) : null}
                      </Box>
                    </Box>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <AddCreditCardDialog
            open={addCreditCardOpen}
            onClose={() => setAddCreditCardOpen(false)}
            getAccessToken={getAccessToken}
            defaultCurrency={cur}
            onCreated={async () => {
              notifyTransactionSaved();
              await refreshAllAccounts();
            }}
          />

          {payCard ? (
            <CreditCardPaymentDialog
              open
              onClose={() => setPayCard(null)}
              getAccessToken={getAccessToken}
              creditCardId={payCard.id}
              creditCardName={payCard.name}
              currency={payCard.currency}
              suggestedAmount={payCard.balance}
              maxPayAmount={payCard.balance}
              debitAccounts={debitAccountsForPayment}
              onSuccess={async () => {
                notifyTransactionSaved();
                await refreshAllAccounts();
                setPayCard(null);
              }}
            />
          ) : null}

          <SectionCard title="Cuentas (efectivo y depósitos)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-4">Nombre</th>
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Moneda</th>
                    <th className="pb-2 pr-3 text-right tabular-nums">Saldo</th>
                    <th className="pb-2 w-12 text-right" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {otherAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-zinc-500">
                        No hay cuentas en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    otherAccounts.map((a) => (
                      <tr
                        key={a.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/cuentas/${a.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/cuentas/${a.id}`);
                          }
                        }}
                        className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/90"
                      >
                        <td className="py-2.5 pr-4 font-medium text-zinc-900">{a.name}</td>
                        <td className="py-2.5 pr-4 text-zinc-600">{accountTypeLabel(a.type)}</td>
                        <td className="py-2.5 pr-4 text-zinc-600">{a.currency}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums tracking-tight text-zinc-900">
                          {formatMoney(a.balance, a.currency)}
                        </td>
                        <td className="py-2.5 text-right">
                          <Tooltip title="Archivar">
                            <IconButton
                              size="small"
                              aria-label={`Archivar ${a.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                beginArchiveAccount(a);
                              }}
                            >
                              <Inventory2OutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {archivedAccounts.length > 0 ? (
            <SectionCard title="Cuentas archivadas" subtitle="No se incluyen en patrimonio ni en selectores de movimientos.">
              <ul className="space-y-2 text-sm text-zinc-700">
                {archivedAccounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2">
                    <span>
                      <span className="font-medium text-zinc-900">{a.name}</span>
                      {' · '}
                      {accountTypeLabel(a.type)} · {a.currency} · {formatMoney(a.balance, a.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      <NewAccountDialog
        open={newAccountOpen}
        onClose={() => setNewAccountOpen(false)}
        getAccessToken={getAccessToken}
        defaultCurrency={defaultCurrency}
        onCreated={async () => {
          notifyTransactionSaved();
          await refreshAllAccounts();
        }}
      />

      <Dialog open={archiveDialog === 'balance'} onClose={closeArchiveDialogs} fullWidth maxWidth="sm">
        <DialogTitle>⚠️ Cuenta con saldo activo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Para archivar esta cuenta, primero debes dejar su saldo en cero mediante una transferencia o un ajuste
            manual.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-start', gap: 1 }}>
          <Button variant="contained" onClick={goToTransferFromArchiveDialog}>
            Ir a Transferir
          </Button>
          <Button onClick={closeArchiveDialogs}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={archiveDialog === 'confirm'} onClose={closeArchiveDialogs} fullWidth maxWidth="xs">
        <DialogTitle>Archivar cuenta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Estás seguro de que quieres archivar esta cuenta?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeArchiveDialogs}>Cancelar</Button>
          <Button variant="contained" onClick={() => void executeArchive()}>
            Archivar
          </Button>
        </DialogActions>
      </Dialog>
      </div>
    </div>
  );
}
