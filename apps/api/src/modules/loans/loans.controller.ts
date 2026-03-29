import {
  Body,
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateLoanDto } from './dto/create-loan.dto';
import { RecordLoanPaymentDto } from './dto/record-loan-payment.dto';
import { PrepaymentStrategy, SimulateExtraPaymentDto } from './dto/simulate-extra-payment.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { LoansService } from './loans.service';

@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.loans.getDashboardSummary(userId);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.loans.list(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateLoanDto) {
    return this.loans.create(userId, dto);
  }

  @Post(':loanId/simulate-extra')
  simulateExtraPayment(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() dto: SimulateExtraPaymentDto,
  ) {
    return this.loans.simulateExtraPayment(
      userId,
      loanId,
      dto.extraAmount,
      dto.strategy ?? PrepaymentStrategy.REDUCE_TERM,
    );
  }

  @Get(':loanId/amortization-schedule')
  amortizationSchedule(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ) {
    return this.loans.getAmortizationScheduleForLoan(userId, loanId);
  }

  @Get(':loanId/preview-extra')
  previewExtra(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Query('extraPrincipal', ParseFloatPipe) extraPrincipal: number,
  ) {
    return this.loans.previewExtraPrincipal(userId, loanId, extraPrincipal);
  }

  @Get(':loanId')
  getOne(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ) {
    return this.loans.getOne(userId, loanId);
  }

  @Patch(':loanId')
  update(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() dto: UpdateLoanDto,
  ) {
    return this.loans.update(userId, loanId, dto);
  }

  @Post(':loanId/payments')
  recordPayment(
    @CurrentUser('id') userId: string,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() dto: RecordLoanPaymentDto,
  ) {
    return this.loans.recordPayment(userId, loanId, dto);
  }
}
