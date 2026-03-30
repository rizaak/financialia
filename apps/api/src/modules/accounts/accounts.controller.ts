import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreditCardStatementService } from './credit-card-statement.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { SyncBalanceDto } from './dto/sync-balance.dto';
import { MoveToCajitaDto } from './dto/move-to-cajita.dto';
import { PatchYieldAccountDto } from './dto/patch-yield-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateCreditCardAccountDto } from './dto/update-credit-card-account.dto';
import { InstallmentPlansService } from './installment-plans.service';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly creditCardStatement: CreditCardStatementService,
    private readonly installmentPlans: InstallmentPlansService,
  ) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.accounts.listAccounts(userId, includeArchived === 'true');
  }

  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.accounts.getSummary(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.createAccount(userId, dto);
  }

  @Patch(':accountId/credit-card')
  updateCreditCardAccount(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateCreditCardAccountDto,
  ) {
    return this.accounts.updateCreditCardAccount(userId, accountId, dto);
  }

  @Patch(':accountId')
  updateAccount(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.updateStatus(userId, accountId, dto.status);
  }

  @Patch(':accountId/yield')
  patchYieldAccount(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: PatchYieldAccountDto,
  ) {
    return this.accounts.patchYieldAccount(userId, accountId, dto.yieldStrategyId);
  }

  @Post(':accountId/move-to-cajita')
  moveToCajita(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: MoveToCajitaDto,
  ) {
    return this.accounts.moveToCajita(userId, accountId, dto.amount);
  }

  @Post(':accountId/reconcile')
  reconcileAccount(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: SyncBalanceDto,
  ) {
    return this.accounts.reconcileAccount(userId, accountId, dto.actualBalance);
  }

  @Post(':accountId/sync-balance')
  syncBalance(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: SyncBalanceDto,
  ) {
    return this.accounts.reconcileAccount(userId, accountId, dto.actualBalance);
  }

  @Get(':accountId/credit-statement')
  getCreditStatement(@CurrentUser('id') userId: string, @Param('accountId') accountId: string) {
    return this.creditCardStatement.calculateStatement(userId, accountId);
  }

  /** Desglose: cargos del periodo + mensualidades MSI recurrentes → pago sin intereses. */
  @Get(':accountId/next-statement')
  getNextStatement(@CurrentUser('id') userId: string, @Param('accountId') accountId: string) {
    return this.creditCardStatement.calculateNextStatement(userId, accountId);
  }

  @Get(':accountId/installment-plans')
  listInstallmentPlans(@CurrentUser('id') userId: string, @Param('accountId') accountId: string) {
    return this.installmentPlans.listForAccount(userId, accountId);
  }

  @Post(':accountId/installment-plans')
  createInstallmentPlan(
    @CurrentUser('id') userId: string,
    @Param('accountId') accountId: string,
    @Body() dto: CreateInstallmentPlanDto,
  ) {
    return this.installmentPlans.create(userId, accountId, dto);
  }
}
