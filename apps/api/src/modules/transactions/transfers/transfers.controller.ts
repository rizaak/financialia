import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersQueryDto } from './dto/list-transfers-query.dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  create(@Req() req: Request, @CurrentUser() user: User, @Body() dto: CreateTransferDto) {
    return this.transfers.create(user.id, dto, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: ListTransfersQueryDto) {
    return this.transfers.list(userId, query);
  }
}
