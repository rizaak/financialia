import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import type { InstallmentPlanRowApi } from '../api/fetchCreditCard';
import { formatMoney } from '../lib/formatMoney';

type Props = {
  plans: InstallmentPlanRowApi[];
};

export function CreditCardInstallmentPlansSection({ plans }: Props) {
  if (plans.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hay planes a meses activos en esta tarjeta.
      </Typography>
    );
  }

  return (
    <Stack spacing={2.5}>
      {plans.map((p) => {
        const paidMonths = Math.max(0, p.currentInstallment - 1);
        const progressPct =
          p.totalInstallments > 0
            ? Math.min(100, (paidMonths / p.totalInstallments) * 100)
            : 0;
        return (
          <Box key={p.id}>
            <Typography variant="subtitle2" fontWeight={700} component="div">
              {p.label}{' '}
              <Typography component="span" variant="body2" color="text.secondary" fontWeight={500}>
                (Mes {p.currentInstallment}/{p.totalInstallments}) — Falta pagar{' '}
                {formatMoney(p.remainingToPay, p.currency)}
              </Typography>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{ mt: 1, height: 8, borderRadius: 1 }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
