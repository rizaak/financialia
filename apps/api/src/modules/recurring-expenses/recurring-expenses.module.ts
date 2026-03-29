import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringExpensesController } from './recurring-expenses.controller';
import { RecurringExpensesService } from './recurring-expenses.service';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [RecurringExpensesController],
  providers: [RecurringExpensesService],
})
export class RecurringExpensesModule {}
