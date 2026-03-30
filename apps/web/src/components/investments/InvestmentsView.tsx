import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import PercentOutlined from '@mui/icons-material/PercentOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useInversiones } from '../../hooks/useInversiones';
import { formatMoney } from '../../lib/formatMoney';
import type { TieredDashboardApi } from '../../types/investmentsSummary';
import { NewInvestmentDialog } from './NewInvestmentDialog';
import { TieredInvestmentCard } from './TieredInvestmentCard';
import { YieldSavingsAccountCard } from './YieldSavingsAccountCard';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
};

const summaryMoneySx = { letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' as const };

function TieredSummaryStrip({ data, currencyCode }: { data: TieredDashboardApi; currencyCode: string }) {
  const blended = Number(data.portfolioBlendedAnnualPct);
  const daily = Number(data.projectedEarningsNext24h);
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        p: 2.5,
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'none',
      }}
    >
      <Box flex={1}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
            }}
          >
            <AccountBalanceOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8' }}>
            Saldo líquido (referencia)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ ...summaryMoneySx, color: '#ffffff' }}>
          {formatMoney(data.netLiquidBalance, currencyCode)}
        </Typography>
      </Box>
      <Box flex={1}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'rgba(52, 211, 153, 0.14)',
              color: '#34d399',
            }}
          >
            <PercentOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8' }}>
            APY ponderado (portafolio a tramos)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ ...summaryMoneySx, color: '#ffffff' }}>
          {Number.isFinite(blended) ? `${blended.toFixed(2)}%` : '—'}
        </Typography>
      </Box>
      <Box flex={1}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'rgba(167, 139, 250, 0.16)',
              color: '#a78bfa',
            }}
          >
            <TodayOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8' }}>
            Ganancia diaria estimada (24 h)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ ...summaryMoneySx, color: '#ffffff' }}>
          {Number.isFinite(daily) ? formatMoney(String(daily), currencyCode) : '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

export function InvestmentsView({ getAccessToken, defaultCurrency }: Props) {
  const { data, loading, error, refetch } = useInversiones(getAccessToken);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-10">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Portafolio de Inversiones
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Inversiones por tramos, cuentas con cajita (Sofipo/banco) y portafolios clásicos.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
          <Button variant="outlined" onClick={() => void refetch()} disabled={loading}>
            Actualizar
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Plus size={18} />}
            onClick={() => setDialogOpen(true)}
          >
            Nueva Inversión
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={100} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : data ? (
        <>
          <TieredSummaryStrip data={data} currencyCode={defaultCurrency} />
          {(data.yieldSavingsAccounts?.length ?? 0) > 0 ? (
            <Stack spacing={2} sx={{ mt: { xs: 3, md: 4 } }}>
              <Typography variant="h6" fontWeight={800} color="text.primary">
                Cuentas con rendimiento (Sofipos / bancos)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Saldo disponible vs cajita. Los tramos de interés se calculan solo sobre la cajita. Vincula una estrategia
                a tu cuenta bancaria (API PATCH /accounts/:id/yield) si aún no aparece aquí.
              </Typography>
              {data.yieldSavingsAccounts!.map((row) => (
                <YieldSavingsAccountCard
                  key={row.accountId}
                  row={row}
                  currencyCode={defaultCurrency}
                  getAccessToken={getAccessToken}
                  onChanged={() => void refetch()}
                />
              ))}
            </Stack>
          ) : null}
          <Stack spacing={2} sx={{ mt: { xs: 3, md: 5 } }}>
            <Typography variant="subtitle1" fontWeight={800} color="text.primary">
              Inversiones por tramos (producto dedicado)
            </Typography>
            {data.investments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aún no tienes inversiones por tramos. Pulsa &quot;Nueva Inversión&quot; para crear la primera.
              </Typography>
            ) : (
              data.investments.map((inv) => (
                <TieredInvestmentCard key={inv.id} row={inv} currencyCode={defaultCurrency} />
              ))
            )}
          </Stack>
        </>
      ) : null}

      <NewInvestmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        getAccessToken={getAccessToken}
        defaultCurrency={defaultCurrency}
        onCreated={async () => {
          await refetch();
        }}
      />
    </div>
  );
}
