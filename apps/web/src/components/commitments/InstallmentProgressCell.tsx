import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { Lock } from 'lucide-react';
import type { InstallmentPlanCommitmentRow } from '../../api/fetchInstallmentPlansMgmt';
import { formatMoney } from '../../lib/formatMoney';
import { principalInterestForInstallment } from '../../lib/installmentPrincipalInterest';

function isCashAdvanceRow(row: InstallmentPlanCommitmentRow): boolean {
  return (
    row.cashAdvanceKind === 'IMMEDIATE_CASH_FIXED' || row.cashAdvanceKind === 'ATM_WITHDRAWAL'
  );
}

type Props = {
  row: InstallmentPlanCommitmentRow;
};

export function InstallmentProgressCell({ row }: Props) {
  if (!isCashAdvanceRow(row)) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        —
      </Typography>
    );
  }

  const cur = row.currency;
  const financed = Number(row.totalAmount);
  const monthly = Number(row.monthlyAmount);
  const annual = Number(row.interestRate);
  const k = row.currentInstallment;
  const n = row.totalInstallments;

  const { principal, interest } = principalInterestForInstallment({
    financedPrincipal: financed,
    annualPercent: annual,
    monthlyPayment: monthly,
    installmentIndex: k,
  });

  const principalStr = Number.isFinite(principal) ? principal.toFixed(2) : '0';
  const interestStr = Number.isFinite(interest) ? interest.toFixed(2) : '0';

  const tooltip = (
    <Box sx={{ py: 0.5, px: 0.25, maxWidth: 280 }}>
      <Typography variant="caption" color="inherit" sx={{ display: 'block', opacity: 0.9, mb: 1 }}>
        Desglose estimado de esta mensualidad (cuota nivelada, tasa pactada).
      </Typography>
      <Stack spacing={0.75}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Capital: {formatMoney(principalStr, cur)}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Interés fijo del período: {formatMoney(interestStr, cur)}
        </Typography>
      </Stack>
    </Box>
  );

  const debtOnly = row.cashAdvanceDebtOnly === true;

  return (
    <Stack direction="row" alignItems="center" justifyContent="center" gap={0.75}>
      <Tooltip title={tooltip} arrow placement="left" enterTouchDelay={0}>
        <Chip
          label={`Mes ${k}/${n}`}
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: 'rgba(34, 211, 238, 0.18)',
            color: '#a5f3fc',
            border: '1px solid rgba(34, 211, 238, 0.4)',
            '&:hover': { bgcolor: 'rgba(34, 211, 238, 0.28)' },
          }}
        />
      </Tooltip>
      {debtOnly ? (
        <Tooltip title="Solo deuda registrada: sin ingreso a cuenta en Vidya.">
          <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', opacity: 0.9 }}>
            <Lock size={16} strokeWidth={2} aria-hidden />
          </Box>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
