import { Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { CalendarClock, History, Lock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAllActiveInstallmentPlans,
  type InstallmentPlanCommitmentRow,
} from '../api/fetchInstallmentPlansMgmt';
import { SectionCard } from '../components/SectionCard';
import { formatMoney } from '../lib/formatMoney';
import { useFinanceStore } from '../stores/financeStore';

export type DashboardActiveInstallmentsSectionProps = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
};

function progressValue(row: InstallmentPlanCommitmentRow): number {
  const { currentInstallment, totalInstallments } = row;
  if (totalInstallments <= 0) return 0;
  return Math.min(100, Math.max(0, (currentInstallment / totalInstallments) * 100));
}

export function DashboardActiveInstallmentsSection({
  getAccessToken,
  defaultCurrency,
}: DashboardActiveInstallmentsSectionProps) {
  const balancesRevision = useFinanceStore((s) => s.balancesRevision);
  const [rows, setRows] = useState<InstallmentPlanCommitmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAllActiveInstallmentPlans(getAccessToken);
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los planes.');
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load, balancesRevision]);

  if (rows === null) {
    return (
      <div className="col-span-12">
        <SectionCard title="Préstamos activos" subtitle="MSI, diferidos y disposiciones de efectivo">
          <Typography variant="body2" color="text.secondary">
            Cargando…
          </Typography>
        </SectionCard>
      </div>
    );
  }

  if (rows.length === 0 && !error) {
    return null;
  }

  return (
    <div className="col-span-12">
      <SectionCard
        title="Préstamos activos"
        subtitle="Seguimiento de mensualidades (avance según corte de cada tarjeta)"
      >
        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {rows.map((row) => {
              const cur = row.currency || defaultCurrency;
              const pct = progressValue(row);
              const isCash =
                row.cashAdvanceKind === 'IMMEDIATE_CASH_FIXED' || row.cashAdvanceKind === 'ATM_WITHDRAWAL';
              return (
                <Box
                  key={row.id}
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: isCash ? 'rgba(34, 211, 238, 0.35)' : 'divider',
                    background: isCash
                      ? 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(255,255,255,0.02) 100%)'
                      : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <CalendarClock size={18} aria-hidden />
                        <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.3 }}>
                          {row.label}
                        </Typography>
                        {isCash ? (
                          <Chip
                            size="small"
                            label={
                              row.cashAdvanceKind === 'ATM_WITHDRAWAL' ? 'Retiro cajero' : 'Efectivo inmediato'
                            }
                            sx={{
                              bgcolor: 'rgba(34, 211, 238, 0.2)',
                              color: '#a5f3fc',
                              fontWeight: 700,
                            }}
                          />
                        ) : null}
                        {isCash && row.cashAdvanceDebtOnly ? (
                          <Tooltip title="Solo registro de deuda: sin movimiento de efectivo; el capital ya está reflejado en tu patrimonio.">
                            <Box
                              component="span"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.25,
                                color: 'text.secondary',
                                opacity: 0.85,
                                verticalAlign: 'middle',
                              }}
                            >
                              <History size={15} strokeWidth={2} aria-hidden />
                              <Lock size={14} strokeWidth={2} aria-hidden />
                            </Box>
                          </Tooltip>
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {row.accountName} · Cuota {formatMoney(row.monthlyAmount, cur)} · Restan{' '}
                        {formatMoney(row.remainingToPay, cur)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ color: isCash ? '#67e8f9' : 'primary.main', fontVariantNumeric: 'tabular-nums' }}
                    >
                      Mensualidad {row.currentInstallment} de {row.totalInstallments}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      mt: 1.5,
                      height: 8,
                      borderRadius: 999,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        background: isCash
                          ? 'linear-gradient(90deg, rgba(34,211,238,0.9) 0%, rgba(59,130,246,0.85) 100%)'
                          : undefined,
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        )}
      </SectionCard>
    </div>
  );
}
