import { useCallback } from 'react';
import { createTransaction, type CreateTransactionPayload } from '../api/fetchTransactions';
import { createTransfer, type CreateTransferPayload } from '../api/fetchTransfers';
import { useFinanceStore } from '../stores/financeStore';
import { usePendingChatInsightStore } from '../stores/pendingChatInsightStore';
import { useTransaction, type TransactionToastOptions } from './useTransaction';

type TxCreateOpts = Omit<TransactionToastOptions, 'successMessage'> & {
  successMessage: string;
};

type TransferCreateOpts = Omit<TransactionToastOptions, 'successMessage'> & {
  successMessage: string;
};

/**
 * Operaciones POST con la API (transacciones y transferencias) y refresco global de saldos
 * vía Zustand (`refreshBalancesAfterMutation`) sin recargar la página.
 */
export function useTransactions(getAccessToken: () => Promise<string>) {
  const { run } = useTransaction();
  const refreshBalancesAfterMutation = useFinanceStore((s) => s.refreshBalancesAfterMutation);

  const afterSuccess = useCallback(async () => {
    await refreshBalancesAfterMutation(getAccessToken);
  }, [getAccessToken, refreshBalancesAfterMutation]);

  const postTransaction = useCallback(
    async (
      payload: CreateTransactionPayload,
      options: TxCreateOpts,
    ): Promise<unknown | undefined> => {
      const result = await run(() => createTransaction(getAccessToken, payload), options);
      if (result !== undefined) {
        await afterSuccess();
        const pending = usePendingChatInsightStore.getState();
        if (result.interestRiskMessage?.trim()) {
          pending.enqueueChatMessage(result.interestRiskMessage.trim());
        }
        if (result.spendingInsight?.message?.trim()) {
          pending.enqueueChatMessage(result.spendingInsight.message.trim());
        }
      }
      return result;
    },
    [afterSuccess, getAccessToken, run],
  );

  const postTransfer = useCallback(
    async (payload: CreateTransferPayload, options: TransferCreateOpts): Promise<unknown | undefined> => {
      const result = await run(() => createTransfer(getAccessToken, payload), options);
      if (result !== undefined) {
        await afterSuccess();
      }
      return result;
    },
    [afterSuccess, getAccessToken, run],
  );

  return {
    postTransaction,
    postTransfer,
    /** Expuesto por si un flujo necesita refrescar sin POST (p. ej. crear cuenta). */
    refreshBalancesAfterMutation,
  };
}
