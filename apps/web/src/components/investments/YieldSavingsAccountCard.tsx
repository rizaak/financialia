'use client';

import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { YieldSavingsAccountRowApi } from '../../types/investmentsSummary';
import { formatMoney } from '../../lib/formatMoney';
import { TierInterestProgressBar } from './TierInterestProgressBar';
import { VanAccountTipBubble } from './VanAccountTipBubble';
import { MoveToCajitaDialog } from './MoveToCajitaDialog';

type Props = {
  row: YieldSavingsAccountRowApi;
  currencyCode: string;
  getAccessToken: () => Promise<string>;
  onChanged: () => void | Promise<void>;
};

export function YieldSavingsAccountCard({ row, currencyCode, getAccessToken, onChanged }: Props) {
  const [cajitaOpen, setCajitaOpen] = useState(false);
  const principal = Number(row.investedBalance);
  const avail = Number(row.availableBalance);

  return (
    <>
      <Card
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap">
                <Typography variant="h6" fontWeight={800}>
                  {row.name}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setCajitaOpen(true)} disabled={avail <= 0}>
                  Mover a cajita
                </Button>
              </Stack>
              <VanAccountTipBubble
                accountKey={row.accountId}
                dailyEstimatedEarnings={row.dailyEstimatedEarnings}
                currencyCode={row.currency || currencyCode}
              />
            </Stack>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03) !important',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              <Box
                flex={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: { xs: '1px solid', sm: 'none' },
                  borderRight: { sm: '1px solid' },
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                  Saldo disponible (0% en tramos)
                </Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {formatMoney(row.availableBalance, row.currency || currencyCode)}
                </Typography>
              </Box>
              <Box
                flex={1}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: { xs: '1px solid', sm: 'none' },
                  borderRight: { sm: '1px solid' },
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                  Saldo en cajita (tramos)
                </Typography>
                <Typography variant="body1" fontWeight={800} sx={{ color: '#ffffff' }}>
                  {formatMoney(row.investedBalance, row.currency || currencyCode)}
                </Typography>
              </Box>
              <Box flex={1} sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#94a3b8', display: 'block' }}>
                  Total en cuenta
                </Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {formatMoney(row.balance, row.currency || currencyCode)}
                </Typography>
              </Box>
            </Box>

            <TierInterestProgressBar
              principal={principal}
              tierProgressWithin={row.tierProgress01}
              segments={
                row.tierSegments?.length
                  ? row.tierSegments.map((s) => ({
                      sortOrder: s.sortOrder,
                      annualRatePct: s.annualRatePct,
                      fractionOfPrincipal: s.fractionOfPrincipal,
                    }))
                  : undefined
              }
              title="Tramos de interés (solo saldo en cajita)"
            />
            <Typography variant="caption" color="text.secondary">
              {row.tierProgressMessage} · ~{formatMoney(row.dailyEstimatedEarnings, row.currency || currencyCode)} / día
              estimado (nominal).
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <MoveToCajitaDialog
        open={cajitaOpen}
        onClose={() => setCajitaOpen(false)}
        accountId={row.accountId}
        currencyCode={row.currency || currencyCode}
        availableBalance={avail}
        getAccessToken={getAccessToken}
        onDone={onChanged}
      />
    </>
  );
}
