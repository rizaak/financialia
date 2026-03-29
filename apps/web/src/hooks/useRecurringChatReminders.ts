import { useEffect } from 'react';
import { fetchRecurringChatReminders } from '../api/fetchRecurringExpenses';
import { fetchRecurringIncomeChatReminders } from '../api/fetchRecurringIncomes';
import { usePendingChatInsightStore } from '../stores/pendingChatInsightStore';

type Args = {
  getAccessToken: () => Promise<string>;
  enabled: boolean;
};

/**
 * Encola en el chat lateral recordatorios de cargos recurrentes y nómina (con enlace para registrar),
 * una vez por día y por registro (sessionStorage).
 */
export function useRecurringChatReminders({ getAccessToken, enabled }: Args) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const [expRes, incRes] = await Promise.all([
          fetchRecurringChatReminders(getAccessToken).catch(() => ({
            items: [] as { recurringExpenseId: string; message: string }[],
          })),
          fetchRecurringIncomeChatReminders(getAccessToken).catch(() => ({
            items: [] as { recurringIncomeId: string; message: string }[],
          })),
        ]);
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const store = usePendingChatInsightStore.getState();
        for (const { recurringExpenseId, message } of expRes.items) {
          const key = `recurringChat:${recurringExpenseId}:${today}`;
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, '1');
          store.enqueueChatMessage(message);
        }
        for (const { recurringIncomeId, message } of incRes.items) {
          const key = `recurringIncomeChat:${recurringIncomeId}:${today}`;
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, '1');
          store.enqueueRecurringIncomeReminder({ text: message, recurringIncomeId });
        }
      } catch {
        /* sin bloquear el dashboard */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, getAccessToken]);
}
