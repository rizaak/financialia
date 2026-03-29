import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringIncomesController } from './recurring-incomes.controller';
import { RecurringIncomesService } from './recurring-incomes.service';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [RecurringIncomesController],
  providers: [RecurringIncomesService],
})
export class RecurringIncomesModule {}
