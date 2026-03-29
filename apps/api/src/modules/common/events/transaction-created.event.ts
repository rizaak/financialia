import type { TransactionType } from '@prisma/client';

/**
 * Emitido tras persistir un gasto/ingreso (mismo commit que el movimiento de saldo).
 * Vive en `common` para evitar dependencias circulares entre accounts y transactions.
 */
export class TransactionCreatedEvent {
  constructor(
    readonly userId: string,
    readonly transactionId: string,
    readonly accountId: string,
    readonly type: TransactionType,
    readonly amount: string,
  ) {}
}
