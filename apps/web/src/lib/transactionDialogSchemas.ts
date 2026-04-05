import { z } from 'zod';
import type { AccountRow } from '../api/fetchAccounts';
import { parseMoneyInput } from './parseMoneyInput';

const id = z.uuid();

export function buildExpenseIncomeSchema(accounts: AccountRow[], kind: 'EXPENSE' | 'INCOME') {
  return z
    .object({
      accountId: id,
      categoryId: id,
      /** Texto en el formulario; se valida con {@link parseMoneyInput} en superRefine. */
      amount: z.string().min(1, 'Indica el monto'),
      concept: z.string().min(1),
      notes: z.string().optional(),
      occurredAt: z.string().min(1),
    })
    .superRefine((data, ctx) => {
      const n = parseMoneyInput(data.amount);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: 'Indica un monto mayor a 0.',
        });
        return;
      }
      const acc = accounts.find((a) => a.id === data.accountId);
      if (!acc) {
        ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Cuenta no válida.' });
        return;
      }
      if (kind === 'INCOME') {
        if (acc.type === 'CREDIT_CARD' && n > Number(acc.balance)) {
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
          if (n > available) {
            ctx.addIssue({
              code: 'custom',
              path: ['amount'],
              message: 'El monto supera el crédito disponible en la tarjeta.',
            });
          }
        }
        return;
      }
      if (n > Number(acc.balance)) {
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

/** Gasto MSI: solo tarjeta de crédito + plazo en meses. `amount` es texto en el formulario; se parsea con {@link parseMoneyInput}. */
export function buildMsiExpenseSchema(accounts: AccountRow[]) {
  const creditInScope = accounts.filter((a) => a.type === 'CREDIT_CARD');
  return z
    .object({
      accountId: id,
      categoryId: id,
      amount: z.string().min(1, 'Indica el monto total de la compra'),
      concept: z.string().min(1),
      notes: z.string().optional(),
      occurredAt: z.string().min(1),
      totalInstallments: z.number().int().min(2).max(60),
    })
    .superRefine((data, ctx) => {
      const n = parseMoneyInput(data.amount);
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: 'Indica un monto mayor a 0.',
        });
        return;
      }
      const acc = creditInScope.find((a) => a.id === data.accountId);
      if (!acc) {
        ctx.addIssue({
          code: 'custom',
          path: ['accountId'],
          message: 'Elige una tarjeta de crédito en tu moneda principal.',
        });
        return;
      }
      const limit = Number(acc.creditLimit ?? 0);
      const debt = Number(acc.balance);
      if (Number.isFinite(limit) && limit > 0) {
        const available = Math.max(0, limit - debt);
        if (n > available) {
          ctx.addIssue({
            code: 'custom',
            path: ['amount'],
            message: 'El monto supera el crédito disponible en la tarjeta.',
          });
        }
      }
    });
}

export type MsiExpenseFormValues = z.infer<ReturnType<typeof buildMsiExpenseSchema>>;

const subscriptionFrequency = z.enum([
  'DAILY',
  'WEEKLY',
  'QUINCENAL',
  'MONTHLY',
  'SEMIANNUAL',
  'ANNUAL',
]);

export function buildSubscriptionFormSchema() {
  return z
    .object({
      name: z.string().min(1),
      accountId: id,
      categoryId: id,
      amount: z.string().min(1, 'Indica el monto por periodo'),
      billingDay: z.number().int().min(1).max(31),
      frequency: subscriptionFrequency,
      billingMonth: z.number().int().min(1).max(12).optional(),
      billingWeekday: z.number().int().min(0).max(6).optional(),
    })
    .superRefine((data, ctx) => {
      const amountNum = parseMoneyInput(data.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['amount'],
          message: 'Indica un monto mayor a 0.',
        });
      }
      if (
        (data.frequency === 'ANNUAL' || data.frequency === 'SEMIANNUAL') &&
        (data.billingMonth == null || data.billingMonth < 1)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['billingMonth'],
          message: 'Indica el mes de cobro (1–12).',
        });
      }
      if (data.frequency === 'WEEKLY' && (data.billingWeekday == null || data.billingWeekday < 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['billingWeekday'],
          message: 'Elige el día de la semana del cargo.',
        });
      }
    });
}

export type SubscriptionFormValues = z.infer<ReturnType<typeof buildSubscriptionFormSchema>>;
