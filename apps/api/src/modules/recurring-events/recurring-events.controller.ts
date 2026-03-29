import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateRecurringEventDto } from './dto/create-recurring-event.dto';
import { UpdateRecurringEventDto } from './dto/update-recurring-event.dto';
import { RecurringEventsService } from './recurring-events.service';

@Controller('recurring-events')
export class RecurringEventsController {
  constructor(private readonly recurringEvents: RecurringEventsService) {}

  @Get('pending')
  pending(
    @CurrentUser('id') userId: string,
    @Query('daysLookahead') daysLookahead?: string,
  ) {
    const raw = daysLookahead != null ? Number.parseInt(daysLookahead, 10) : 7;
    const n = Number.isFinite(raw) && raw >= 1 && raw <= 366 ? raw : 7;
    return this.recurringEvents.getUpcomingEvents(userId, n);
  }

  @Get('due-today')
  dueToday(@CurrentUser('id') userId: string) {
    return this.recurringEvents.getDueToday(userId);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const inactive =
      includeInactive === 'true' || includeInactive === '1' || includeInactive === 'yes';
    return this.recurringEvents.list(userId, inactive);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRecurringEventDto) {
    return this.recurringEvents.create(userId, dto);
  }

  @Post(':id/confirm')
  confirm(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.recurringEvents.confirmRecurringEvent(user.id, id, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  /** Mismo comportamiento que `confirm`: motor de procesamiento en un clic. */
  @Post(':id/process')
  process(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.recurringEvents.processEvent(user.id, id, {
      auth0Sub: user.auth0Subject,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringEventDto,
  ) {
    return this.recurringEvents.update(userId, id, dto);
  }

  @Post(':id/mark-processed')
  markProcessed(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringEvents.markProcessed(userId, id);
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.recurringEvents.deactivate(userId, id);
    return { ok: true };
  }
}
