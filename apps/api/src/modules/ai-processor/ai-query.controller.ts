import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AiQueryDto } from './dto/ai-query.dto';
import { FinancialQueryService } from './financial-query.service';

@Controller('ai')
export class AiQueryController {
  constructor(private readonly financialQuery: FinancialQueryService) {}

  @Get('query')
  @HttpCode(200)
  query(@CurrentUser('id') userId: string, @Query() dto: AiQueryDto) {
    return this.financialQuery.answer(userId, dto.q);
  }
}
