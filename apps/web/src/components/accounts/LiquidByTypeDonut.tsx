import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import LocalAtmOutlinedIcon from '@mui/icons-material/LocalAtmOutlined';
import { Box, Typography } from '@mui/material';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../../lib/formatMoney';

type Row = {
  key: string;
  name: string;
  value: number;
  color: string;
  Icon: typeof AccountBalanceOutlinedIcon;
};

type Props = {
  totalBanks: string;
  totalWallets: string;
  totalCash: string;
  totalLiquid: string;
  currencyCode: string;
};

const COLORS = {
  banks: '#059669',
  wallets: '#0ea5e9',
  cash: '#d97706',
} as const;

export function LiquidByTypeDonut({
  totalBanks,
  totalWallets,
  totalCash,
  totalLiquid,
  currencyCode,
}: Props) {
  const b = Number(totalBanks);
  const w = Number(totalWallets);
  const c = Number(totalCash);
  const sum = b + w + c;

  const rows: Row[] = [
    { key: 'banks', name: 'Bancos', value: Math.max(0, b), color: COLORS.banks, Icon: AccountBalanceOutlinedIcon },
    {
      key: 'wallets',
      name: 'Carteras',
      value: Math.max(0, w),
      color: COLORS.wallets,
      Icon: AccountBalanceWalletOutlinedIcon,
    },
    { key: 'cash', name: 'Efectivo', value: Math.max(0, c), color: COLORS.cash, Icon: LocalAtmOutlinedIcon },
  ];

  const chartData = rows.map((r) => ({ name: r.name, value: r.value, color: r.color }));

  if (!Number.isFinite(sum) || sum <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500">
        Sin saldo líquido registrado para graficar. Crea cuentas y registra movimientos.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
      <div className="mx-auto h-56 w-full min-w-0 max-w-[280px] md:mx-0 md:h-64 md:max-w-[320px] md:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="#fafafa" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => {
                const pct = sum > 0 ? Math.round((value / sum) * 1000) / 10 : 0;
                return [`${formatMoney(String(value), currencyCode)} (${pct}%)`, ''];
              }}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e4e4e7',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          minWidth: 0,
        }}
      >
        {rows.map((r) => {
          const pct = sum > 0 ? Math.round((r.value / sum) * 1000) / 10 : 0;
          const Icon = r.Icon;
          return (
            <Box
              key={r.key}
              component="li"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                py: 1,
                px: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            >
              <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    color: r.color,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Icon sx={{ fontSize: 22 }} />
                </Box>
                <div className="min-w-0">
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    {r.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pct}% del líquido
                  </Typography>
                </div>
              </Box>
              <Typography variant="body2" fontWeight={800} sx={{ textAlign: 'right', flexShrink: 0 }} color="text.primary">
                {formatMoney(String(r.value), currencyCode)}
              </Typography>
            </Box>
          );
        })}
      </Box>
      </div>

      <p className="border-t border-zinc-100 pt-4 text-sm text-zinc-600">
        Total líquido:{' '}
        <span className="font-semibold text-zinc-900">{formatMoney(totalLiquid, currencyCode)}</span>
      </p>
    </div>
  );
}
