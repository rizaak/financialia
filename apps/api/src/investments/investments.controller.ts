import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { InvestmentPortfolio, InvestmentPosition } from '@prisma/client';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import {
  InvestmentsService,
  type InvestmentsOverviewResponse,
} from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investments: InvestmentsService) {}

  @Get('overview')
  overview(@CurrentUser('id') userId: string): Promise<InvestmentsOverviewResponse> {
    return this.investments.getOverview(userId);
  }

  @Get('portfolios')
  listPortfolios(
    @CurrentUser('id') userId: string,
  ): Promise<Array<InvestmentPortfolio & { positions: InvestmentPosition[] }>> {
    return this.investments.listPortfolios(userId);
  }

  @Post('portfolios')
  createPortfolio(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePortfolioDto,
  ): Promise<InvestmentPortfolio> {
    return this.investments.createPortfolio(userId, dto);
  }

  @Post('portfolios/:portfolioId/positions')
  createPosition(
    @CurrentUser('id') userId: string,
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Body() dto: CreatePositionDto,
  ): Promise<InvestmentPosition> {
    return this.investments.createPosition(portfolioId, userId, dto);
  }
}
