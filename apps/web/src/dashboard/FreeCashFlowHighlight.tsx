import CreditCardIcon from '@mui/icons-material/CreditCard';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SubscriptionsOutlinedIcon from '@mui/icons-material/SubscriptionsOutlined';
import { Box, Button, Card, CardContent, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { FreeCashFlowBreakdown } from '../api/fetchAccounts';
import { CommitmentsManageDialog } from '../components/commitments/CommitmentsManageDialog';
import { MoneyText } from '../components/shared/MoneyText';
import type { DashboardDataSnapshot } from '../hooks/useDashboard';
import { formatMoney } from '../lib/formatMoney';

type Props = {
  data: DashboardDataSnapshot;
  getAccessToken: () => Promise<string>;
  onCommitmentsChanged: () => void | Promise<void>;
};

const deductionRows: Array<{
  key: Exclude<keyof FreeCashFlowBreakdown, 'bankBalance'>;
  label: string;
  short: string;
  Icon: typeof CreditCardIcon;
}> = [
  { key: 'msiThisMonth', label: 'MSI del mes', short: 'MSI', Icon: CreditCardIcon },
  { key: 'subscriptionsRemaining', label: 'Suscripciones', short: 'Suscripciones', Icon: SubscriptionsOutlinedIcon },
  { key: 'housingUtilitiesPending', label: 'Renta / servicios', short: 'Renta', Icon: HomeOutlinedIcon },
  { key: 'recurringEventsExpensePending', label: 'Eventos recurrentes', short: 'Eventos', Icon: EventRepeatIcon },
];

function isZeroish(s: string): boolean {
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) < 0.005;
}

export function FreeCashFlowHighlight({ data, getAccessToken, onCommitmentsChanged }: Props) {
  const cur = data.defaultCurrency;
  const b = data.freeCashFlowBreakdown;
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <Card variant="outlined" className="col-span-12 overflow-hidden border-emerald-500/40 shadow-none">
      <CardContent
        className="p-5 sm:p-6"
        sx={{
          borderRadius: '20px',
          background:
            'linear-gradient(145deg, rgba(16,185,129,0.14) 0%, rgba(2,6,23,0.35) 42%, rgba(2,6,23,0.55) 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(16, 185, 129, 0.2)',
                  color: 'success.dark',
                }}
              >
                <Sparkles size={22} strokeWidth={2} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                Disponible real (liberado de compromisos)
              </Typography>
            </Stack>
            <Typography
              variant="h3"
              component="p"
              fontWeight={800}
              sx={{
                lineHeight: 1.1,
                color: 'success.dark',
                fontSize: { xs: '1.95rem', sm: '2.35rem' },
                letterSpacing: '-0.02em',
              }}
            >
              <MoneyText>{formatMoney(data.freeCashFlow, cur)}</MoneyText>
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.25,
                mt: 0.5,
                maxWidth: 560,
              }}
            >
              {deductionRows.map(({ key, label, short, Icon }) => {
                const raw = b[key];
                const zero = isZeroish(raw);
                return (
                  <Tooltip key={key} title={`${label}: −${formatMoney(raw, cur)}`} arrow placement="top">
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'rgba(255,255,255,0.04)',
                        px: 1.25,
                        py: 1,
                        minHeight: 48,
                      }}
                    >
                      <Icon sx={{ fontSize: 22, color: zero ? 'action.disabled' : 'text.secondary', flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap display="block">
                          {short}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          color={zero ? 'text.disabled' : 'text.primary'}
                          sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}
                        >
                          {zero ? (
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <Box component="span" sx={{ color: 'success.main', fontSize: '1rem' }}>
                                ✓
                              </Box>
                              {formatMoney(raw, cur)}
                            </Box>
                          ) : (
                            <>−{formatMoney(raw, cur)}</>
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </Tooltip>
                );
              })}
            </Box>
          </Stack>

          <Box
            sx={{
              width: '100%',
              maxWidth: { sm: 340 },
              flexShrink: 0,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'rgba(255,255,255,0.04)',
              px: 2,
              py: 1.75,
            }}
          >
            <Stack spacing={1.25} sx={{ m: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  En bancos
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  <MoneyText>{formatMoney(b.bankBalance, cur)}</MoneyText>
                </Typography>
              </Stack>
              {!isZeroish(b.liquidTieredPrincipal) ? (
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Inversión líquida (tramos)
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <MoneyText>{formatMoney(b.liquidTieredPrincipal, cur)}</MoneyText>
                  </Typography>
                </Stack>
              ) : null}
              {!isZeroish(b.frozenTieredPrincipal) ? (
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                  <Typography variant="body2" color="warning.dark" fontWeight={600}>
                    Congelado en tramos
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="warning.dark" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <MoneyText>{formatMoney(b.frozenTieredPrincipal, cur)}</MoneyText>
                  </Typography>
                </Stack>
              ) : null}
              <Divider sx={{ borderStyle: 'dashed' }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ flexWrap: 'wrap' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.03 }}
                >
                  Compromisos del mes
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setManageOpen(true)} sx={{ flexShrink: 0 }}>
                  Gestionar
                </Button>
              </Stack>
              {deductionRows.map(({ key, label }) => {
                const raw = b[key];
                const zero = isZeroish(raw);
                return (
                  <Stack key={key} direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="body2" color={zero ? 'text.disabled' : 'text.primary'} sx={{ pr: 1 }}>
                      − {label}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                      {zero ? (
                        <Typography component="span" sx={{ color: 'success.main', fontSize: '1rem', lineHeight: 1 }}>
                          ✓
                        </Typography>
                      ) : null}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={zero ? 'text.disabled' : 'text.primary'}
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        <MoneyText>{formatMoney(raw, cur)}</MoneyText>
                      </Typography>
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
      <CommitmentsManageDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        getAccessToken={getAccessToken}
        onChanged={onCommitmentsChanged}
      />
    </Card>
  );
}
