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

const glassItemSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  py: 1,
  px: 1.5,
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.03) !important',
  boxShadow: 'none',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
  },
} as const;

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 10,
  color: '#FFFFFF',
  fontSize: 13,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: 'none',
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
      <div
        className="rounded-xl border border-dashed border-white/20 px-4 py-8 text-center text-sm text-[#E2E8F0] backdrop-blur-[10px]"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
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
                  <Cell key={entry.name} fill={entry.color} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => {
                  const pct = sum > 0 ? Math.round((value / sum) * 1000) / 10 : 0;
                  return [`${formatMoney(String(value), currencyCode)} (${pct}%)`, ''];
                }}
                contentStyle={tooltipStyle}
                itemStyle={{ color: '#FFFFFF' }}
                labelStyle={{ color: '#FFFFFF' }}
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
              <Box key={r.key} component="li" sx={glassItemSx}>
                <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.06)',
                      color: r.color,
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </Box>
                  <div className="min-w-0">
                    <Typography variant="caption" fontWeight={700} display="block" sx={{ color: '#FFFFFF' }}>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#FFFFFF', opacity: 0.85 }}>
                      {pct}% del líquido
                    </Typography>
                  </div>
                </Box>
                <Typography variant="body2" fontWeight={800} sx={{ textAlign: 'right', flexShrink: 0, color: '#FFFFFF' }}>
                  {formatMoney(String(r.value), currencyCode)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </div>

      <p className="border-t border-white/10 pt-4 text-sm text-[#E2E8F0]" style={{ textShadow: 'none' }}>
        Total líquido:{' '}
        <span className="font-semibold text-white">{formatMoney(totalLiquid, currencyCode)}</span>
      </p>
    </div>
  );
}
