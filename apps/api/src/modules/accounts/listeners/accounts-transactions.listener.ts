import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionCreatedEvent } from '@common/events/transaction-created.event';

/**
 * Reacción a movimientos de efectivo: el saldo ya se actualiza en la misma transacción DB;
 * este listener deja un hook para invalidación de caché, métricas o futuros microservicios.
 */
@Injectable()
export class AccountsTransactionsListener {
  private readonly logger = new Logger(AccountsTransactionsListener.name);

  @OnEvent('transaction.created')
  handleTransactionCreated(payload: TransactionCreatedEvent): void {
    this.logger.debug(
      `transaction.created tx=${payload.transactionId} account=${payload.accountId} type=${payload.type}`,
    );
  }
}
