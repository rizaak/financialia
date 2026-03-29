import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@common/prisma/prisma.service';
import { RecurringEventsService } from './recurring-events.service';

/**
 * Ejecuta cada medianoche (UTC) la misma lógica que GET /recurring-events/due-today
 * por usuario con eventos activos (p. ej. futuras notificaciones o métricas).
 * Desactivar con ENABLE_RECURRING_EVENTS_DAILY_CRON=false.
 */
@Injectable()
export class RecurringEventsDailyCronService {
  private readonly logger = new Logger(RecurringEventsDailyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringEvents: RecurringEventsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyDueScan(): Promise<void> {
    if (process.env.ENABLE_RECURRING_EVENTS_DAILY_CRON === 'false') {
      return;
    }

    const users = await this.prisma.recurringEvent.findMany({
      where: { isActive: true },
      distinct: ['userId'],
      select: { userId: true },
    });

    let totalDue = 0;
    for (const { userId } of users) {
      const { items } = await this.recurringEvents.getDueToday(userId);
      totalDue += items.length;
    }

    this.logger.log(
      `Recurring events: escaneo diario — ${users.length} usuarios con eventos, ${totalDue} coincidencias hoy (suma global).`,
    );
  }
}
