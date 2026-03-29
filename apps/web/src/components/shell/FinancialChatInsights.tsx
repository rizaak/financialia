import { Alert, Box, Button, LinearProgress, Paper, Stack, TextField } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Send } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { confirmRecurringIncomeDeposit } from '../../api/fetchRecurringIncomes';
import { getFinancialAiQuery } from '../../api/fetchFinancialAiQuery';
import { HttpRequestError } from '../../lib/http/HttpRequestError';
import { usePendingChatInsightStore } from '../../stores/pendingChatInsightStore';
import { useFinanceStore } from '../../stores/financeStore';
import { ChatInsightBubble } from './ChatInsightBubble';
import { FinancialChatInsightHeader } from './FinancialChatInsightHeader';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recurringIncomeId?: string;
};

type Props = {
  getAccessToken: () => Promise<string>;
  /** `drawer`: ocupa el alto del panel lateral con scroll interno. */
  variant?: 'inline' | 'drawer';
};

/**
 * Panel ampliado respecto a la barra inteligente: preguntas abiertas con respuesta en burbuja (acento primario).
 */
export function FinancialChatInsights({ getAccessToken, variant = 'inline' }: Props) {
  const theme = useTheme();
  const listId = useId();
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeringIncomeId, setRegisteringIncomeId] = useState<string | null>(null);
  const pendingQueue = usePendingChatInsightStore((s) => s.pendingQueue);
  const refreshBalances = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  useEffect(() => {
    if (pendingQueue.length === 0) return;
    const msgs = usePendingChatInsightStore.getState().consumePendingQueue();
    if (msgs.length === 0) return;
    const ts = Date.now();
    setLines((prev) => [
      ...msgs.map((item, i) => {
        if (item.kind === 'plain') {
          return {
            id: `insight-${ts}-${i}`,
            role: 'assistant' as const,
            text: item.text,
          };
        }
        return {
          id: `insight-${ts}-${i}`,
          role: 'assistant' as const,
          text: item.text,
          recurringIncomeId: item.recurringIncomeId,
        };
      }),
      ...prev,
    ]);
  }, [pendingQueue]);

  const registerRecurringIncome = useCallback(
    async (recurringIncomeId: string) => {
      setRegisteringIncomeId(recurringIncomeId);
      try {
        const result = await confirmRecurringIncomeDeposit(getAccessToken, recurringIncomeId);
        const pending = usePendingChatInsightStore.getState();
        if (result.interestRiskMessage?.trim()) {
          pending.enqueueChatMessage(result.interestRiskMessage.trim());
        }
        if (result.spendingInsight?.message?.trim()) {
          pending.enqueueChatMessage(result.spendingInsight.message.trim());
        }
        await refreshBalances(getAccessToken);
        toast.success('Nómina registrada en tu saldo.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo registrar el ingreso.');
      } finally {
        setRegisteringIncomeId(null);
      }
    },
    [getAccessToken, refreshBalances],
  );

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [lines]);

  const submit = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setError(null);
    const userLine: ChatLine = { id: `u-${Date.now()}`, role: 'user', text: q };
    setLines((prev) => [...prev, userLine]);
    setInput('');
    setLoading(true);
    try {
      const { answer } = await getFinancialAiQuery(getAccessToken, q);
      setLines((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: answer }]);
    } catch (e) {
      const msg =
        e instanceof HttpRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo obtener la respuesta.';
      setError(msg);
      setLines((prev) => prev.filter((l) => l.id !== userLine.id));
      setInput(q);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, input, loading]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void submit();
  };

  const isDrawer = variant === 'drawer';

  return (
    <Paper
      elevation={0}
      sx={{
        mb: isDrawer ? 0 : 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        border: isDrawer ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flex: isDrawer ? 1 : undefined,
        minHeight: 0,
        display: isDrawer ? 'flex' : undefined,
        flexDirection: isDrawer ? 'column' : undefined,
      }}
    >
      {!isDrawer ? <FinancialChatInsightHeader /> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1.5, flexShrink: 0 }} alignItems={{ sm: 'flex-start' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ej. ¿Cuánto he gastado en comida este mes?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
          multiline
          minRows={2}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<Send size={16} />}
          disabled={loading || !input.trim()}
          onClick={() => void submit()}
          sx={{ minWidth: { sm: 128 }, alignSelf: { xs: 'stretch', sm: 'flex-start' }, py: 1.25 }}
        >
          Preguntar
        </Button>
      </Stack>

      {loading ? (
        <LinearProgress
          sx={{
            mb: 1.5,
            height: 3,
            borderRadius: 9999,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            '& .MuiLinearProgress-bar': { borderRadius: 9999 },
          }}
        />
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box
        ref={messagesScrollRef}
        component="section"
        aria-label="Conversación con el asistente"
        id={listId}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          maxHeight: isDrawer ? 'none' : 320,
          flex: isDrawer ? 1 : undefined,
          minHeight: isDrawer ? 0 : undefined,
          overflowY: 'auto',
          overflowX: 'hidden',
          pr: 0.5,
        }}
      >
        {lines.map((line) => (
          <ChatInsightBubble
            key={line.id}
            role={line.role}
            text={line.text}
            registering={
              line.recurringIncomeId != null && registeringIncomeId === line.recurringIncomeId
            }
            onRegisterRecurringIncome={
              line.recurringIncomeId != null
                ? () => void registerRecurringIncome(line.recurringIncomeId!)
                : undefined
            }
          />
        ))}
      </Box>
    </Paper>
  );
}
