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
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { RecurringExpensesService } from './recurring-expenses.service';

@Controller('recurring-expenses')
export class RecurringExpensesController {
  constructor(private readonly recurring: RecurringExpensesService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const archived =
      includeArchived === 'true' || includeArchived === '1' || includeArchived === 'yes';
    return this.recurring.list(userId, archived);
  }

  @Get('upcoming')
  upcoming(@CurrentUser('id') userId: string, @Query('days') daysRaw?: string) {
    const days = daysRaw != null ? parseInt(daysRaw, 10) : 7;
    return this.recurring.upcoming(userId, Number.isFinite(days) ? days : 7);
  }

  @Get('chat-reminders')
  chatReminders(@CurrentUser('id') userId: string) {
    return this.recurring.chatReminders(userId).then((items) => ({ items }));
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRecurringExpenseDto) {
    return this.recurring.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringExpenseDto,
  ) {
    return this.recurring.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.recurring.archive(userId, id);
    return { ok: true };
  }

  @Post(':id/confirm-charge')
  confirm(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.recurring.confirmCharge(user.id, id, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }
}
