import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { resolve } from 'node:path';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AiProcessorModule } from './modules/ai-processor/ai-processor.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommonModule } from './modules/common/common.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { LoansModule } from './modules/loans/loans.module';
import { RecurringExpensesModule } from './modules/recurring-expenses/recurring-expenses.module';
import { RecurringEventsModule } from './modules/recurring-events/recurring-events.module';
import { RecurringIncomesModule } from './modules/recurring-incomes/recurring-incomes.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    UsersModule,
    AccountsModule,
    AuthModule,
    CategoriesModule,
    TransactionsModule,
    DashboardModule,
    InvestmentsModule,
    LoansModule,
    HealthModule,
    AiProcessorModule,
    RecurringExpensesModule,
    RecurringEventsModule,
    RecurringIncomesModule,
  ],
})
export class AppModule {}
