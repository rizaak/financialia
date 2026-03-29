import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  simulateExtraPayment,
  type ExtraPaymentSimulation,
  type PrepaymentStrategy,
} from '../api/fetchLoans';
import { formatMoney } from '../lib/formatMoney';

function formatPayoffLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export type LoanExtraPaymentSimulatorDialogProps = {
  open: boolean;
  onClose: () => void;
  loanId: string;
  loanName: string;
  currency: string;
  currentBalance: string;
  getAccessToken: () => Promise<string>;
  /** Fija el escenario en la gráfica de amortización (solo REDUCE_TERM dibuja la línea comparativa). */
  onPinToChart?: (extra: number, strategy: PrepaymentStrategy) => void;
};

export function LoanExtraPaymentSimulatorDialog({
  open,
  onClose,
  loanId,
  loanName,
  currency,
  currentBalance,
  getAccessToken,
  onPinToChart,
}: LoanExtraPaymentSimulatorDialogProps) {
  const maxExtra = useMemo(() => {
    const n = Number(currentBalance);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [currentBalance]);

  const [extra, setExtra] = useState(5000);
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('REDUCE_TERM');
  const [result, setResult] = useState<ExtraPaymentSimulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const step = maxExtra > 0 ? Math.min(5000, maxExtra) : 0;
    setExtra(step > 0 ? Math.max(1, Math.min(step, maxExtra)) : 0);
    setStrategy('REDUCE_TERM');
    setResult(null);
    setError(null);
  }, [open, loanId, maxExtra]);

  const runSim = useCallback(async () => {
    if (!loanId || maxExtra <= 0 || extra <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await simulateExtraPayment(getAccessToken, loanId, extra, strategy);
      setResult(r);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'No se pudo simular.');
    } finally {
      setLoading(false);
    }
  }, [extra, getAccessToken, loanId, maxExtra, strategy]);

  useEffect(() => {
    if (!open || maxExtra <= 0 || extra <= 0) return;
    const t = window.setTimeout(() => void runSim(), 350);
    return () => window.clearTimeout(t);
  }, [open, extra, loanId, maxExtra, runSim, strategy]);

  const savings =
    result && Number(result.savings.totalInterestSaved) > 0
      ? formatMoney(result.savings.totalInterestSaved, currency)
      : result
        ? formatMoney('0', currency)
        : '—';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>¿Qué pasaría si…?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Amortización francesa (cuota teórica PMT). {loanName}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={strategy}
          onChange={(_, v) => v != null && setStrategy(v)}
          sx={{ mb: 1 }}
        >
          <ToggleButton value="REDUCE_TERM" sx={{ textTransform: 'none' }}>
            Reducir plazo (cuota igual)
          </ToggleButton>
          <ToggleButton value="REDUCE_PAYMENT" sx={{ textTransform: 'none' }}>
            Reducir cuota (plazo igual)
          </ToggleButton>
        </ToggleButtonGroup>
        {maxExtra <= 0 ? (
          <Alert severity="info">No hay saldo pendiente para simular.</Alert>
        ) : (
          <Stack spacing={2}>
            {error ? (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            ) : null}
            <Typography variant="subtitle2">Monto extra a abonar a capital hoy</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Slider
                size="small"
                min={1}
                max={maxExtra}
                step={maxExtra > 100 ? Math.max(1, Math.round(maxExtra / 200)) : 1}
                value={Math.min(extra, maxExtra)}
                onChange={(_, v) => setExtra(Array.isArray(v) ? v[0] : v)}
                disabled={loading}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 1, max: maxExtra, step: 1 }}
                value={extra}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setExtra(Math.min(maxExtra, Math.max(1, n)));
                }}
                sx={{ width: 120 }}
              />
            </Stack>
            <Typography variant="caption" color="text.disabled">
              Saldo insoluto: {formatMoney(currentBalance, currency)} · Los intereses mostrados son futuros
              estimados desde hoy, no incluyen lo ya pagado.
            </Typography>
            {loading && !result ? (
              <Typography variant="body2" color="text.secondary">
                Calculando…
              </Typography>
            ) : null}
            {result ? (
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Card variant="outlined" sx={{ flex: 1, bgcolor: 'grey.50' }}>
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Sin abono extra
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Terminas hacia{' '}
                        <strong>{formatPayoffLabel(result.withoutExtra.estimatedPayoffDate)}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Intereses futuros (estim.):{' '}
                        <strong>{formatMoney(result.withoutExtra.totalInterestFuture, currency)}</strong>
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        ~{result.withoutExtra.monthsRemaining} meses restantes
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{ flex: 1, borderWidth: 2, borderColor: 'primary.main' }}
                  >
                    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="primary" fontWeight={700}>
                        Con abono de {formatMoney(String(extra), currency)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Terminas hacia{' '}
                        <strong>{formatPayoffLabel(result.withExtra.estimatedPayoffDate)}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Intereses futuros (estim.):{' '}
                        <strong>{formatMoney(result.withExtra.totalInterestFuture, currency)}</strong>
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        ~{result.withExtra.monthsRemaining} meses restantes
                        {result.strategy === 'REDUCE_PAYMENT' && result.withExtra.newMonthlyPayment ? (
                          <>
                            {' '}
                            · Nueva cuota estimada:{' '}
                            <strong>{formatMoney(result.withExtra.newMonthlyPayment, currency)}</strong>
                          </>
                        ) : null}
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
                <Box
                  sx={{
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'success.light',
                    border: 1,
                    borderColor: 'success.main',
                  }}
                >
                  <Typography variant="subtitle2" color="success.dark" fontWeight={800}>
                    Ahorro neto en intereses (estim.)
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'success.dark', fontWeight: 900, mt: 0.5 }}>
                    {savings}
                  </Typography>
                  <Typography variant="body2" color="success.dark" sx={{ mt: 0.5 }}>
                    {result.strategy === 'REDUCE_TERM' ? (
                      <>
                        ~{result.savings.monthsSaved} meses menos de plazo · Fin estimado:{' '}
                        <strong>{formatPayoffLabel(result.savings.newEndDate)}</strong>
                      </>
                    ) : (
                      <>
                        Mismo plazo restante; mensualidad más baja · Ahorro en intereses futuros (estim.).
                      </>
                    )}{' '}
                    · Fin contractual original (ref.): {formatPayoffLabel(result.originalContractEndApprox)}
                  </Typography>
                </Box>
              </Stack>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        {onPinToChart && result && strategy === 'REDUCE_TERM' ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              onPinToChart(extra, strategy);
              onClose();
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Ver en la gráfica de amortización
          </Button>
        ) : null}
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
