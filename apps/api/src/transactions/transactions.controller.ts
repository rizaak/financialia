import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactions.create(userId, dto);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<Transaction[]> {
    return this.transactions.list(userId, query);
  }
}
