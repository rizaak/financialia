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
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.5,
        bgcolor: 'background.paper',
        boxShadow: '0 2px 16px -4px rgba(15, 23, 42, 0.07), 0 4px 24px -8px rgba(15, 23, 42, 0.06)',
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
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <AccountBalanceOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Saldo líquido (referencia)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={summaryMoneySx}>
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
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <PercentOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            APY ponderado (portafolio a tramos)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} color="success.main" sx={summaryMoneySx}>
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
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <TodayOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Ganancia diaria estimada (24 h)
          </Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={summaryMoneySx}>
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
            Tramos de interés dinámicos, APY promedio y validación de saldo en la cuenta origen.
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
          <Stack spacing={2} sx={{ mt: { xs: 3, md: 5 } }}>
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
