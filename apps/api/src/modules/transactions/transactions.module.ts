import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { UsersModule } from '../users/users.module';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { InterestRiskAlertService } from './interest-risk-alert.service';
import { SpendingPatternService } from './spending-pattern.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [AccountsModule, DashboardModule, UsersModule],
  controllers: [TransactionsController, TransfersController],
  providers: [
    TransactionsService,
    TransfersService,
    SpendingPatternService,
    InterestRiskAlertService,
  ],
  exports: [TransactionsService, TransfersService],
})
export class TransactionsModule {}
