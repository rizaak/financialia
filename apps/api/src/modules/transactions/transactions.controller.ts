import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Transaction, User } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { DashboardSummaryQueryDto } from '../dashboard/dto/dashboard-summary-query.dto';
import type { DashboardSummaryResponse } from '../dashboard/dashboard.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { type CreateTransactionResult, TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get('stats')
  stats(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    return this.transactions.getStats(userId, query);
  }

  @Post()
  create(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ): Promise<CreateTransactionResult> {
    return this.transactions.create(user.id, dto, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<Transaction[]> {
    return this.transactions.list(userId, query);
  }

  @Get(':id')
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Transaction> {
    return this.transactions.getOne(userId, id);
  }

  @Delete(':id')
  remove(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.transactions.remove(user.id, id, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactions.update(user.id, id, dto, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }
}
