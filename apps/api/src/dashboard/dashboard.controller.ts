import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService, type DashboardSummaryResponse } from './dashboard.service';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboard.getSummary(userId, query);
  }
}
