import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { CalendarClock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccountRow } from '../api/fetchAccounts';
import { fetchCreditCardStatement, type CreditCardStatementApi } from '../api/fetchCreditCard';
import { SectionCard } from '../components/SectionCard';
import { formatMoney } from '../lib/formatMoney';
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
  const [byCard, setByCard] = useState<Record<string, StmtState>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<AccountRow | null>(null);
  const [payStatement, setPayStatement] = useState<CreditCardStatementApi | null>(null);

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
  }, [getAccessToken, accountIdsKey, balanceRevision]);

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
              const payAmount = stmt.lastClosedStatementPaymentAmount ?? '0';
              const amtNum = Number(payAmount);
              const hasClosed = stmt.statementClosedThisMonth;
              const showPaymentDue =
                hasClosed && stmt.inPaymentWindow && amtNum > 0 && Boolean(dueIso);
              const showOverdue = hasClosed && stmt.paymentPastDue && amtNum > 0 && Boolean(dueIso);

              return (
                <Box key={card.id}>
                  {!hasClosed ? (
                    <Typography variant="body2" color="text.secondary">
                      <strong>{card.name}</strong>: el corte de este mes aún no cierra; el aviso de pago aparecerá
                      entre la fecha de corte y la fecha límite.
                    </Typography>
                  ) : showPaymentDue ? (
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
                        Debes pagar <strong>{formatMoney(payAmount, stmt.currency || cur)}</strong> de tu tarjeta{' '}
                        <strong>{card.name}</strong>. Límite: <strong>{formatDueLong(dueIso!)}</strong>.
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
                        {formatDueLong(dueIso!)}). Revisa tu banco y{' '}
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
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      <strong>{card.name}</strong>: el último corte no tiene saldo pendiente en este periodo o el monto
                      recomendado es cero.
                    </Typography>
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
          suggestedAmount={payStatement.lastClosedStatementPaymentAmount}
          maxPayAmount={payStatement.currentDebt}
          debitAccounts={debitAccounts}
          onSuccess={async () => {
            await onPaid();
          }}
        />
      ) : null}
    </>
  );
}
