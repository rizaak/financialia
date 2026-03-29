import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringEventsDailyCronService } from './recurring-events-daily.cron';
import { RecurringController } from './recurring.controller';
import { RecurringEventsController } from './recurring-events.controller';
import { RecurringEventsService } from './recurring-events.service';

@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [RecurringEventsController, RecurringController],
  providers: [RecurringEventsService, RecurringEventsDailyCronService],
  exports: [RecurringEventsService],
})
export class RecurringEventsModule {}
