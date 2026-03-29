import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { InstallmentPlansController } from './installment-plans.controller';
import { AccountsService } from './accounts.service';
import { CreditCardService } from './credit-card.service';
import { CreditCardStatementService } from './credit-card-statement.service';
import { InstallmentPlansClosingCronService } from './installment-plans-closing.cron';
import { InstallmentPlansService } from './installment-plans.service';
import { AccountsTransactionsListener } from './listeners/accounts-transactions.listener';
import { FinancialService } from './financial.service';

@Module({
  controllers: [AccountsController, InstallmentPlansController],
  providers: [
    FinancialService,
    AccountsService,
    CreditCardStatementService,
    CreditCardService,
    InstallmentPlansService,
    InstallmentPlansClosingCronService,
    AccountsTransactionsListener,
  ],
  exports: [AccountsService, FinancialService, CreditCardStatementService, CreditCardService, InstallmentPlansService],
})
export class AccountsModule {}
