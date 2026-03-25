import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { TransferAccountsDto } from './dto/transfer-accounts.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.accounts.listAccounts(userId);
  }

  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.accounts.getSummary(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.createAccount(userId, dto);
  }

  @Post('transfer')
  transfer(@CurrentUser('id') userId: string, @Body() dto: TransferAccountsDto) {
    return this.accounts.transfer(userId, dto.fromAccountId, dto.toAccountId, dto.amount);
  }
}
