import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { formatMoney } from '../../lib/formatMoney';

const electric = '#38bdf8';

type Props = {
  /** Id estable para variar el % de referencia mes a mes. */
  accountKey: string;
  dailyEstimatedEarnings: string;
  currencyCode: string;
};

/**
 * Tip rápido de Vi junto a una cuenta de inversión / rendimiento.
 */
export function VanAccountTipBubble({ accountKey, dailyEstimatedEarnings, currencyCode }: Props) {
  const daily = Number(dailyEstimatedEarnings);
  const pctVsLastMonth = useMemo(() => {
    let h = 0;
    for (let i = 0; i < accountKey.length; i++) {
      h = (h * 31 + accountKey.charCodeAt(i)) >>> 0;
    }
    return (1 + (h % 25) / 10).toFixed(1);
  }, [accountKey]);

  const gainLabel = Number.isFinite(daily) ? formatMoney(String(daily), currencyCode) : '—';

  return (
    <Box
      sx={{
        maxWidth: { xs: '100%', sm: 320 },
        borderRadius: '14px',
        border: '1px solid rgba(56,189,248,0.25)',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(167,139,250,0.06) 100%)',
        px: 1.5,
        py: 1,
        alignSelf: { xs: 'stretch', sm: 'flex-start' },
      }}
    >
      <Typography variant="caption" sx={{ lineHeight: 1.5, color: 'rgba(255,255,255,0.88)', fontSize: '0.7rem' }}>
        <Box component="span" sx={{ color: electric, fontWeight: 800 }}>
          Vi
        </Box>
        : En esta cuenta, tu ganancia estimada hoy fue de{' '}
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {gainLabel}
        </Box>
        . ¡Vas {pctVsLastMonth}% arriba del mes pasado (referencia)!
      </Typography>
    </Box>
  );
}
