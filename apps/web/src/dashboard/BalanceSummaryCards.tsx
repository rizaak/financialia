import { Card, CardContent, Typography } from '@mui/material';
import { Building2, CreditCard, Landmark, PiggyBank } from 'lucide-react';
import { MoneyText } from '../components/shared/MoneyText';
import type { DashboardDataSnapshot } from '../hooks/useDashboard';
import { formatMoney } from '../lib/formatMoney';

type Props = {
  data: DashboardDataSnapshot;
};

const radius = '16px';

const cardBase = {
  borderRadius: radius,
  height: '100%',
  borderLeftWidth: 4,
  borderLeftStyle: 'solid' as const,
} as const;

export function BalanceSummaryCards({ data }: Props) {
  const cur = data.defaultCurrency;

  return (
    <div className="col-span-12 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        variant="outlined"
        sx={{
          ...cardBase,
          borderLeftColor: 'primary.main',
        }}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Total en bancos
            </Typography>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-800 dark:text-blue-200">
              <Building2 size={20} strokeWidth={2} />
            </span>
          </div>
          <Typography variant="h5" component="p" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            <MoneyText>{formatMoney(data.totalBanks, cur)}</MoneyText>
          </Typography>
        </CardContent>
      </Card>
      <Card
        variant="outlined"
        sx={{
          ...cardBase,
          borderLeftColor: 'success.main',
        }}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Total invertido
            </Typography>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              <PiggyBank size={20} strokeWidth={2} />
            </span>
          </div>
          <Typography variant="h5" component="p" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            <MoneyText>{formatMoney(data.totalInvestedTiered, cur)}</MoneyText>
          </Typography>
        </CardContent>
      </Card>
      <Card
        variant="outlined"
        sx={{
          ...cardBase,
          borderLeftColor: 'warning.main',
        }}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Deuda total
            </Typography>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200">
              <CreditCard size={20} strokeWidth={2} />
            </span>
          </div>
          <Typography variant="h5" component="p" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            <MoneyText>{formatMoney(data.totalCreditDebt, cur)}</MoneyText>
          </Typography>
        </CardContent>
      </Card>
      <Card
        variant="outlined"
        sx={{
          ...cardBase,
          borderLeftColor: 'grey.500',
          bgcolor: 'action.hover',
        }}
      >
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Saldo neto
            </Typography>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/12 text-blue-800 dark:text-blue-200">
              <Landmark size={20} strokeWidth={2} />
            </span>
          </div>
          <Typography variant="h5" component="p" fontWeight={800} sx={{ lineHeight: 1.2 }}>
            <MoneyText>{formatMoney(data.totalNetBalance, cur)}</MoneyText>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            Bancos + inversiones a tramos − deuda en tarjetas. No coincide con «Total en bancos» ni con el
            disponible real del bloque superior.
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
