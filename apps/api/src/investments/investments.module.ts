import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { InvestmentCalculatorService } from './investment-calculator.service';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { TieredInvestmentsController } from './tiered-investments.controller';
import { TieredInvestmentsService } from './tiered-investments.service';

@Module({
  imports: [AccountsModule],
  controllers: [InvestmentsController, TieredInvestmentsController],
  providers: [InvestmentsService, InvestmentCalculatorService, TieredInvestmentsService],
  exports: [InvestmentCalculatorService, TieredInvestmentsService],
})
export class InvestmentsModule {}
