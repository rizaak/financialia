import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateInvestmentStrategyDto } from './dto/tiered/create-strategy.dto';
import { CreateInvestmentTierDto } from './dto/tiered/create-tier.dto';
import { CreateTieredInvestmentWithStrategyDto } from './dto/tiered/create-tiered-investment-with-strategy.dto';
import { CreateTieredInvestmentDto } from './dto/tiered/create-tiered-investment.dto';
import { DepositTieredInvestmentDto } from './dto/tiered/deposit-tiered.dto';
import { UpdateAutoReinvestDto } from './dto/tiered/update-auto-reinvest.dto';
import {
  TieredInvestmentsService,
  type TieredDashboardResponse,
} from './tiered-investments.service';

@Controller('investments/tiered')
export class TieredInvestmentsController {
  constructor(private readonly tiered: TieredInvestmentsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string): Promise<TieredDashboardResponse> {
    return this.tiered.getDashboard(userId);
  }

  @Get('strategies')
  listStrategies(@CurrentUser('id') userId: string) {
    return this.tiered.listStrategies(userId);
  }

  @Post('strategies')
  createStrategy(@CurrentUser('id') userId: string, @Body() dto: CreateInvestmentStrategyDto) {
    return this.tiered.createStrategy(userId, dto);
  }

  @Post('strategies/:strategyId/tiers')
  addTier(
    @CurrentUser('id') userId: string,
    @Param('strategyId', ParseUUIDPipe) strategyId: string,
    @Body() dto: CreateInvestmentTierDto,
  ) {
    return this.tiered.addTier(userId, strategyId, dto);
  }

  @Get('holdings')
  listHoldings(@CurrentUser('id') userId: string) {
    return this.tiered.listTieredInvestments(userId);
  }

  @Post('holdings')
  createHolding(@CurrentUser('id') userId: string, @Body() dto: CreateTieredInvestmentDto) {
    return this.tiered.createInvestment(userId, dto);
  }

  @Post('holdings/with-strategy')
  createHoldingWithStrategy(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTieredInvestmentWithStrategyDto,
  ) {
    return this.tiered.createInvestmentWithStrategy(userId, dto);
  }

  @Post('holdings/:investmentId/deposit')
  deposit(
    @CurrentUser('id') userId: string,
    @Param('investmentId', ParseUUIDPipe) investmentId: string,
    @Body() dto: DepositTieredInvestmentDto,
  ) {
    return this.tiered.deposit(userId, investmentId, dto);
  }

  @Patch('holdings/:investmentId/auto-reinvest')
  patchAutoReinvest(
    @CurrentUser('id') userId: string,
    @Param('investmentId', ParseUUIDPipe) investmentId: string,
    @Body() dto: UpdateAutoReinvestDto,
  ) {
    return this.tiered.setAutoReinvest(userId, investmentId, dto.autoReinvest);
  }

  @Post('holdings/:investmentId/accrue-day')
  accrueDay(
    @CurrentUser('id') userId: string,
    @Param('investmentId', ParseUUIDPipe) investmentId: string,
  ) {
    return this.tiered.accrueOneDayInterest(userId, investmentId);
  }
}
