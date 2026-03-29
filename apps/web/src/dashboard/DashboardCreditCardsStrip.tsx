import { Box, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AccountRow } from '../api/fetchAccounts';
import { fetchCreditCardStatement, type CreditCardStatementApi } from '../api/fetchCreditCard';
import { formatMoney } from '../lib/formatMoney';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; data: CreditCardStatementApi }
  | { status: 'err'; message: string };

function creditCardAccountKey(accounts: AccountRow[]): string {
  return [...accounts].map((a) => a.id).sort().join(',');
}

export type DashboardCreditCardsStripProps = {
  getAccessToken: () => Promise<string>;
  accounts: AccountRow[];
  defaultCurrency: string;
  /** Se incrementa al refrescar saldos; vuelve a pedir el estado de cuenta sin reiniciar todo a “cargando”. */
  balanceRevision?: number;
};

export function DashboardCreditCardsStrip({
  getAccessToken,
  accounts,
  defaultCurrency,
  balanceRevision = 0,
}: DashboardCreditCardsStripProps) {
  const [byId, setById] = useState<Record<string, LoadState>>({});
  const accountIdsKey = useMemo(() => creditCardAccountKey(accounts), [accounts]);
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    const list = accountsRef.current;
    if (list.length === 0) return;

    let cancelled = false;

    setById((prev) => {
      const next: Record<string, LoadState> = {};
      for (const a of list) {
        const prior = prev[a.id];
        next[a.id] = prior?.status === 'ok' ? prior : { status: 'loading' };
      }
      return next;
    });

    void Promise.all(
      list.map(async (a) => {
        try {
          const data = await fetchCreditCardStatement(getAccessToken, a.id);
          if (!cancelled) {
            setById((prev) => ({ ...prev, [a.id]: { status: 'ok', data } }));
          }
        } catch (e) {
          if (!cancelled) {
            setById((prev) => ({
              ...prev,
              [a.id]: { status: 'err', message: e instanceof Error ? e.message : 'Error' },
            }));
          }
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, accountIdsKey, balanceRevision]);

  if (accounts.length === 0) return null;

  const cur = defaultCurrency.toUpperCase().slice(0, 3);

  return (
    <div className="col-span-12">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Tarjetas</p>
          <h2 className="text-lg font-bold text-zinc-900">Próximo pago y disponible</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => {
          const st = byId[a.id];
          const showSkeleton = !st || st.status === 'loading';
          const data = st?.status === 'ok' ? st.data : null;

          return (
            <Paper
              key={a.id}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                background: (t) =>
                  t.palette.mode === 'dark'
                    ? 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(15,23,42,0.9) 100%)'
                    : 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, #fff 100%)',
              }}
            >
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {a.name}
                  </Typography>
                  {data ? (
                    <Chip
                      size="small"
                      color={data.daysUntilPaymentDue <= 7 ? 'warning' : 'default'}
                      label={`${data.daysUntilPaymentDue} días para pagar`}
                    />
                  ) : null}
                </Box>

                {showSkeleton ? (
                  <Stack spacing={1} sx={{ py: 0.5 }}>
                    <Skeleton variant="text" width="88%" height={28} />
                    <Skeleton variant="text" width="72%" height={22} />
                    <Skeleton variant="text" width="92%" height={18} />
                  </Stack>
                ) : st?.status === 'err' ? (
                  <Typography variant="body2" color="error">
                    {st.message}
                  </Typography>
                ) : data ? (
                  <>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      Próximo pago: {formatMoney(data.paymentToAvoidInterest ?? '0', data.currency || cur)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Disponible:{' '}
                      <Box component="span" fontWeight={700} color="text.primary">
                        {formatMoney(data.availableCredit ?? '0', data.currency || cur)}
                      </Box>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Deuda actual {formatMoney(data.currentDebt ?? '0', data.currency || cur)} · Límite{' '}
                      {formatMoney(data.creditLimit ?? '0', data.currency || cur)}
                    </Typography>
                  </>
                ) : null}
              </Stack>
            </Paper>
          );
        })}
      </div>
    </div>
  );
}
