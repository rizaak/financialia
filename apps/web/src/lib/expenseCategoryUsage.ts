import type { TransactionWithCategory } from '../api/fetchTransactions';

/** IDs de categoría de gasto ordenados por frecuencia (más usadas primero). */
export function buildExpenseCategoryUsageOrder(txs: TransactionWithCategory[]): string[] {
  const counts = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type === 'EXPENSE' && tx.categoryId) {
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
