import { z } from 'zod';
import type { AccountRow } from '../api/fetchAccounts';

const id = z.string().uuid();

export function buildExpenseIncomeSchema(accounts: AccountRow[], kind: 'EXPENSE' | 'INCOME') {
  return z
    .object({
      accountId: id,
      categoryId: id,
      amount: z.number().positive(),
      concept: z.string().min(1),
      notes: z.string().optional(),
      occurredAt: z.string().min(1),
    })
    .superRefine((data, ctx) => {
      const acc = accounts.find((a) => a.id === data.accountId);
      if (!acc) {
        ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Cuenta no válida.' });
        return;
      }
      if (kind === 'INCOME') {
        if (acc.type === 'CREDIT_CARD' && data.amount > Number(acc.balance)) {
          ctx.addIssue({
            code: 'custom',
            path: ['amount'],
            message: 'El abono no puede ser mayor que la deuda de la tarjeta.',
          });
        }
        return;
      }
      if (acc.type === 'CREDIT_CARD') {
        const limit = Number(acc.creditLimit ?? 0);
        const debt = Number(acc.balance);
        if (Number.isFinite(limit) && limit > 0) {
          const available = Math.max(0, limit - debt);
          if (data.amount > available) {
            ctx.addIssue({
              code: 'custom',
              path: ['amount'],
              message: 'El monto supera el crédito disponible en la tarjeta.',
            });
          }
        }
        return;
      }
      if (data.amount > Number(acc.balance)) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: 'El monto supera el saldo disponible en la cuenta.',
        });
      }
    });
}

export function buildTransferSchema(accounts: AccountRow[]) {
  return z
    .object({
      fromAccountId: id,
      toAccountId: id,
      amount: z.number().positive(),
      fee: z.number().min(0).optional(),
      notes: z.string().optional(),
      occurredAt: z.string().min(1),
    })
    .superRefine((data, ctx) => {
      if (data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'El destino debe ser distinto del origen.',
        });
      }
      const from = accounts.find((a) => a.id === data.fromAccountId);
      if (!from) return;
      const fee = data.fee ?? 0;
      if (data.amount + fee > Number(from.balance)) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: 'El monto (más comisión) supera el saldo disponible en el origen.',
        });
      }
    });
}

export type ExpenseIncomeFormValues = z.infer<ReturnType<typeof buildExpenseIncomeSchema>>;
export type TransferFormValues = z.infer<ReturnType<typeof buildTransferSchema>>;
