import { Alert, Box, Button, Fade, Skeleton, Stack, Typography } from '@mui/material';
import { CalendarClock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccountRow } from '../api/fetchAccounts';
import { fetchCreditCardStatement, type CreditCardStatementApi } from '../api/fetchCreditCard';
import { VI_CREDIT_PAYMENT_COVERED_STATEMENT } from '../config/brandConfig';
import { SectionCard } from '../components/SectionCard';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';
import { CreditCardPaymentDialog } from './CreditCardPaymentDialog';

type StmtState =
  | { status: 'loading' }
  | { status: 'err'; message: string }
  | { status: 'ok'; data: CreditCardStatementApi };

function creditCardAccountKey(cards: AccountRow[]): string {
  return [...cards].map((c) => c.id).sort().join(',');
}

function formatDueLong(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export type DashboardPaymentCalendarProps = {
  getAccessToken: () => Promise<string>;
  creditCards: AccountRow[];
  allAccounts: AccountRow[];
  defaultCurrency: string;
  balanceRevision?: number;
  onPaid: () => void | Promise<void>;
};

export function DashboardPaymentCalendar({
  getAccessToken,
  creditCards,
  allAccounts,
  defaultCurrency,
  balanceRevision = 0,
  onPaid,
}: DashboardPaymentCalendarProps) {
  const cur = defaultCurrency.toUpperCase().slice(0, 3);
  const balancesRevisionStore = useFinanceStore((s) => s.balancesRevision);
  const [byCard, setByCard] = useState<Record<string, StmtState>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<AccountRow | null>(null);
  const [payStatement, setPayStatement] = useState<CreditCardStatementApi | null>(null);
  const [celebrationCardId, setCelebrationCardId] = useState<string | null>(null);

  const debitAccounts = useMemo(
    () =>
      allAccounts.filter(
        (a) =>
          a.currency.toUpperCase().slice(0, 3) === cur &&
          (a.type === 'BANK' || a.type === 'WALLET' || a.type === 'CASH'),
      ),
    [allAccounts, cur],
  );

  const accountIdsKey = useMemo(() => creditCardAccountKey(creditCards), [creditCards]);
  const creditCardsRef = useRef(creditCards);
  creditCardsRef.current = creditCards;

  useEffect(() => {
    const cards = creditCardsRef.current;
    if (cards.length === 0) return;

    let cancelled = false;

    setByCard((prev) => {
      const next: Record<string, StmtState> = {};
      for (const c of cards) {
        const prior = prev[c.id];
        next[c.id] = prior?.status === 'ok' ? prior : { status: 'loading' };
      }
      return next;
    });

    void Promise.all(
      cards.map(async (c) => {
        try {
          const data = await fetchCreditCardStatement(getAccessToken, c.id);
          if (!cancelled) {
            setByCard((prev) => ({ ...prev, [c.id]: { status: 'ok', data } }));
          }
        } catch (e) {
          if (!cancelled) {
            setByCard((prev) => ({
              ...prev,
              [c.id]: { status: 'err', message: e instanceof Error ? e.message : 'Error' },
            }));
          }
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, accountIdsKey, balanceRevision, balancesRevisionStore]);

  useEffect(() => {
    if (!celebrationCardId) return;
    const t = window.setTimeout(() => setCelebrationCardId(null), 10_000);
    return () => window.clearTimeout(t);
  }, [celebrationCardId]);

  const openPay = useCallback((card: AccountRow, stmt: CreditCardStatementApi) => {
    setPayTarget(card);
    setPayStatement(stmt);
    setPayOpen(true);
  }, []);

  if (creditCards.length === 0) return null;

  return (
    <>
      <div className="col-span-12">
        <SectionCard
          title="Calendario de pagos"
          subtitle="Cortes, saldos y registro de pagos desde tu banco"
        >
          <Stack spacing={2}>
            {creditCards.map((card) => {
              const st = byCard[card.id];
              const loading = !st || st.status === 'loading';

              if (loading) {
                return (
                  <Box key={card.id} sx={{ py: 0.5 }}>
                    <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
                    <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
                  </Box>
                );
              }
              if (st.status === 'err') {
                return (
                  <Alert key={card.id} severity="warning">
                    {card.name}: {st.message}
                  </Alert>
                );
              }

              const stmt = st.data;
              const dueIso = stmt.lastStatementPaymentDueDate;
              const statementDueTotal = stmt.lastClosedStatementPaymentAmount ?? '0';
              const remainingRaw = stmt.remainingLastStatementPaymentAmount ?? statementDueTotal;
              const appliedRaw = stmt.paymentsAppliedSinceLastClosing ?? '0';
              const remainingNum = Number(remainingRaw);
              const appliedNum = Number(appliedRaw);
              const hasClosed = stmt.statementClosedThisMonth;
              const showPaymentDue =
                hasClosed && stmt.inPaymentWindow && remainingNum > 0.004 && Boolean(dueIso);
              const showOverdue =
                hasClosed && stmt.paymentPastDue && remainingNum > 0.004 && Boolean(dueIso);
              const showCelebration = celebrationCardId === card.id;

              return (
                <Box key={card.id}>
                  {!hasClosed ? (
                    <Typography variant="body2" color="text.secondary">
                      <strong>{card.name}</strong>: el corte de este mes aún no cierra; el aviso de pago aparecerá
                      entre la fecha de corte y la fecha límite.
                    </Typography>
                  ) : showCelebration ? (
                    <Fade in timeout={520}>
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Vi:</strong> {VI_CREDIT_PAYMENT_COVERED_STATEMENT}
                        </Typography>
                      </Alert>
                    </Fade>
                  ) : (
                    <>
                      <Fade in={showPaymentDue || showOverdue} timeout={480} unmountOnExit>
                        <Box>
                          {showPaymentDue ? (
                            <Alert
                              severity="warning"
                              icon={<CalendarClock size={22} />}
                              sx={{ alignItems: 'flex-start', borderRadius: 2 }}
                              action={
                                <Button
                                  color="inherit"
                                  size="small"
                                  variant="outlined"
                                  sx={{ flexShrink: 0, mt: 0.5 }}
                                  onClick={() => openPay(card, stmt)}
                                  disabled={debitAccounts.length === 0}
                                >
                                  Registrar pago realizado
                                </Button>
                              }
                            >
                              <Typography variant="body2" component="span" sx={{ display: 'block', pr: 1 }}>
                                Pendiente del corte (pago para no generar intereses):{' '}
                                <strong>{formatMoney(remainingRaw, stmt.currency || cur)}</strong> en{' '}
                                <strong>{card.name}</strong>
                                {appliedNum > 0.004 ? (
                                  <>
                                    . Ya abonaste{' '}
                                    <strong>{formatMoney(appliedRaw, stmt.currency || cur)}</strong> tras el cierre.
                                  </>
                                ) : null}
                                . Límite: <strong>{formatDueLong(dueIso!)}</strong>.
                              </Typography>
                              {debitAccounts.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                  No hay cuenta de débito en {cur} para registrar el pago manual.
                                </Typography>
                              ) : null}
                            </Alert>
                          ) : showOverdue ? (
                            <Alert severity="error" icon={<CalendarClock size={22} />} sx={{ borderRadius: 2 }}>
                              <Typography variant="body2">
                                <strong>{card.name}</strong>: el plazo de pago del último corte ya venció (
                                {formatDueLong(dueIso!)}). Pendiente del corte:{' '}
                                <strong>{formatMoney(remainingRaw, stmt.currency || cur)}</strong>. Revisa tu banco y{' '}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ verticalAlign: 'middle', ml: 0.5 }}
                                  onClick={() => openPay(card, stmt)}
                                  disabled={debitAccounts.length === 0}
                                >
                                  registra el pago aquí
                                </Button>{' '}
                                cuando lo hayas hecho.
                              </Typography>
                            </Alert>
                          ) : null}
                        </Box>
                      </Fade>
                      {!(showPaymentDue || showOverdue) ? (
                        <Typography variant="body2" color="text.secondary">
                          <strong>{card.name}</strong>: el pago para no generar intereses del último corte está cubierto
                          (o no aplica en este periodo).
                        </Typography>
                      ) : null}
                    </>
                  )}
                </Box>
              );
            })}
          </Stack>
        </SectionCard>
      </div>

      {payTarget && payStatement ? (
        <CreditCardPaymentDialog
          open={payOpen}
          onClose={() => {
            setPayOpen(false);
            setPayTarget(null);
            setPayStatement(null);
          }}
          getAccessToken={getAccessToken}
          creditCardId={payTarget.id}
          creditCardName={payTarget.name}
          currency={payStatement.currency || cur}
          suggestedAmount={payStatement.remainingLastStatementPaymentAmount}
          statementRemainingAmount={payStatement.remainingLastStatementPaymentAmount}
          maxPayAmount={payStatement.currentDebt}
          debitAccounts={debitAccounts}
          onSuccess={async (info) => {
            if (info?.statementFullyCovered && payTarget) {
              setCelebrationCardId(payTarget.id);
            }
            await onPaid();
          }}
        />
      ) : null}
    </>
  );
}
