import { create } from 'zustand';

export type PendingInsight =
  | { kind: 'plain'; text: string }
  | { kind: 'recurringIncome'; text: string; recurringIncomeId: string };

type State = {
  pendingQueue: PendingInsight[];
  enqueueChatMessage: (msg: string) => void;
  enqueueRecurringIncomeReminder: (p: { text: string; recurringIncomeId: string }) => void;
  consumePendingQueue: () => PendingInsight[];
};

/**
 * Cola de mensajes del asistente (comparación vs promedio, riesgo de intereses, nómina, etc.)
 * que se vacían al abrir el chat lateral.
 */
export const usePendingChatInsightStore = create<State>((set, get) => ({
  pendingQueue: [],
  enqueueChatMessage: (msg) => {
    const t = msg.trim();
    if (!t) return;
    set((s) => ({ pendingQueue: [...s.pendingQueue, { kind: 'plain', text: t }] }));
  },
  enqueueRecurringIncomeReminder: ({ text, recurringIncomeId }) => {
    const t = text.trim();
    if (!t) return;
    set((s) => ({
      pendingQueue: [...s.pendingQueue, { kind: 'recurringIncome', text: t, recurringIncomeId }],
    }));
  },
  consumePendingQueue: () => {
    const q = get().pendingQueue;
    set({ pendingQueue: [] });
    return q;
  },
}));
