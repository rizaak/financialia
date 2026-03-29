import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { PiggyBank } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
  fetchLastMonthExpenseSummary,
  getLastCalendarMonthIsoRange,
  postSavingsAdvice,
} from '../api/fetchSavingsAdvice';

type Props = {
  getAccessToken: () => Promise<string>;
};

function hasExpenseDataForAdvice(summary: {
  totals: { expense: string };
  expensesByCategory: unknown[];
}): boolean {
  const exp = Number(summary.totals.expense);
  return Number.isFinite(exp) && (exp > 0 || summary.expensesByCategory.length > 0);
}

const pulseSoft = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.88; transform: scale(1.03); }
`;

export function AiFinancialAdvisor({ getAccessToken }: Props) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { from: lastMonthFrom } = getLastCalendarMonthIsoRange();
  const monthHint = new Date(lastMonthFrom).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const summary = await fetchLastMonthExpenseSummary(getAccessToken);
      if (!hasExpenseDataForAdvice(summary)) {
        setAdvice(
          'No hay gastos registrados en ese mes para analizar. Cuando registres movimientos, vuelve a pulsar «Generar consejo».',
        );
        return;
      }
      const text = await postSavingsAdvice(summary, getAccessToken);
      setAdvice(text?.trim() || 'No se recibió texto del consejo. Intenta de nuevo.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '16px',
        border: 'none',
        bgcolor: 'transparent',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          p: { xs: 2.5, sm: 3 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(13, 71, 161, 0.4)' : 'rgba(13, 71, 161, 0.22)',
          borderLeftWidth: 4,
          borderLeftColor: 'primary.main',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(145deg, rgba(13, 71, 161, 0.35) 0%, rgba(15, 23, 42, 0.92) 55%, rgba(15, 23, 42, 0.98) 100%)'
              : 'linear-gradient(145deg, rgba(227, 242, 253, 0.98) 0%, rgba(236, 245, 255, 0.95) 45%, rgba(255, 255, 255, 0.99) 100%)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 4px 24px rgba(15, 23, 42, 0.06)',
        })}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              flexShrink: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
              color: 'primary.main',
              boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
              animation: `${pulseSoft} 2.8s ease-in-out infinite`,
            })}
          >
            <PiggyBank size={20} strokeWidth={2} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              fontWeight={700}
              sx={(t) => ({
                lineHeight: 1.2,
                color: t.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                letterSpacing: '0.08em',
              })}
            >
              Vantix AI
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={(t) => ({
                color: t.palette.mode === 'dark' ? 'grey.50' : 'text.primary',
                lineHeight: 1.25,
              })}
            >
              Consejo de ahorro
            </Typography>
          </Box>
        </Stack>

        <Typography
          variant="body2"
          sx={(t) => ({
            color: t.palette.mode === 'dark' ? 'grey.300' : 'text.primary',
            lineHeight: 1.65,
            opacity: t.palette.mode === 'dark' ? 0.95 : 0.88,
          })}
        >
          Analizamos tus gastos de <strong>{monthHint}</strong> (mes anterior) y te damos una idea breve para
          ahorrar.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          disabled={loading}
          onClick={() => void handleGenerate()}
          fullWidth
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 46,
            borderRadius: 2,
            boxShadow: (t) => (t.palette.mode === 'dark' ? '0 2px 12px rgba(13, 71, 161, 0.35)' : 2),
          }}
        >
          {loading ? 'Generando…' : 'Generar consejo'}
        </Button>

        <Box sx={{ minHeight: loading ? 88 : 'auto' }}>
          {loading ? (
            <Stack spacing={1} sx={{ pt: 0.5 }}>
              <Skeleton
                variant="rounded"
                height={72}
                sx={(t) => ({
                  borderRadius: 2,
                  bgcolor: t.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                })}
              />
              <Skeleton variant="text" width="55%" />
            </Stack>
          ) : error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          ) : advice ? (
            <Alert
              severity="success"
              icon={false}
              sx={(t) => ({
                borderRadius: 2,
                typography: 'body2',
                bgcolor:
                  t.palette.mode === 'dark'
                    ? alpha(t.palette.success.main, 0.14)
                    : alpha(t.palette.success.main, 0.08),
                color: t.palette.mode === 'dark' ? 'grey.100' : 'text.primary',
                border: '1px solid',
                borderColor: t.palette.mode === 'dark' ? alpha(t.palette.success.light, 0.35) : 'success.light',
              })}
            >
              {advice}
            </Alert>
          ) : (
            <Typography
              variant="caption"
              sx={(t) => ({
                display: 'block',
                color: t.palette.mode === 'dark' ? 'grey.500' : 'text.secondary',
                lineHeight: 1.5,
              })}
            >
              Toca el botón cuando quieras un consejo personalizado según tus movimientos.
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
