import { Injectable } from '@nestjs/common';
import { AccountsService, type StatementPaymentBreakdown } from './accounts.service';

/**
 * Punto de entrada de dominio: “pago para no generar intereses” (gastos sin plan + cuotas ACTIVE).
 */
@Injectable()
export class CreditCardService {
  constructor(private readonly accounts: AccountsService) {}

  /** Ver `AccountsService.getStatementSummary`. */
  getStatementSummary(userId: string, accountId: string): Promise<StatementPaymentBreakdown> {
    return this.accounts.getStatementSummary(userId, accountId);
  }

  calculateStatement(userId: string, accountId: string): Promise<StatementPaymentBreakdown> {
    return this.accounts.calculateStatement(userId, accountId);
  }
}
