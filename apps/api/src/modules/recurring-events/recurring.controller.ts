import { Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RecurringEventsService } from './recurring-events.service';

/** Alias de ruta `POST /recurring/:id/confirm` (además de `POST /recurring-events/:id/confirm`). */
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringEvents: RecurringEventsService) {}

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
}
