import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, LinearProgress, Typography } from '@mui/material';
import { SectionCard } from '../components/SectionCard';
import { MoneyText } from '../components/shared/MoneyText';
import type { InvestmentsSummaryApi } from '../types/investmentsSummary';
import { formatMoney } from '../lib/formatMoney';

type Props = {
  data: InvestmentsSummaryApi;
  currencyCode: string;
};

export function DashboardInvestmentsMini({ data, currencyCode }: Props) {
  const { tiered } = data;
  const blended = Number(tiered.portfolioBlendedAnnualPct);
  const daily24h = Number(tiered.projectedEarningsNext24h);
  const top = tiered.investments.slice(0, 3);

  const innerCardClass =
    'flex min-h-[148px] h-full flex-col rounded-[12px] border border-white/10 bg-white/[0.03] p-4 shadow-none backdrop-blur-[12px]';

  return (
    <SectionCard
      title="Inversiones a tramos"
      subtitle={`Rendimiento anual ponderado ${Number.isFinite(blended) ? blended.toFixed(2) : '—'}% · referencia diaria`}
    >
      <div className="grid items-stretch gap-4 sm:grid-cols-2">
        <Box className={innerCardClass} sx={{ gap: 0.75 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Ganancia estimada (24 h)
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              flexWrap: 'wrap',
              py: 0.5,
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 28, color: '#34d399' }} />
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {Number.isFinite(daily24h) ? (
                <MoneyText>{formatMoney(String(daily24h), currencyCode)}</MoneyText>
              ) : (
                '—'
              )}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', display: 'block' }}>
            Basada en tramos y capital en cada inversión.
          </Typography>
        </Box>

        <Box className={innerCardClass} sx={{ gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20, color: '#38bdf8' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Capital en tramos
            </Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              <MoneyText>{formatMoney(tiered.totalInvestedTiered, currencyCode)}</MoneyText>
            </Typography>
          </Box>
        </Box>
      </div>

      {top.length > 0 ? (
        <div className="mt-4 space-y-3">
          {top.map((inv) => (
            <div key={inv.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Typography variant="body2" fontWeight={700}>
                  {inv.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <MoneyText>{formatMoney(inv.principal, inv.currency || currencyCode)}</MoneyText>
                </Typography>
              </div>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, inv.tierProgress01 * 100))}
                sx={{
                  height: 8,
                  borderRadius: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    background: 'linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)',
                    boxShadow: '0 0 14px rgba(52, 211, 153, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {inv.tierProgressMessage}
              </Typography>
            </div>
          ))}
        </div>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Aún no tienes inversiones por tramos. Desde Inversiones puedes crear una estrategia.
        </Typography>
      )}
    </SectionCard>
  );
}
