import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RecurringEventFrequency,
  TransactionSource,
  TransactionType,
  type RecurringEvent,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { normalizePaymentDays } from '../recurring-incomes/recurring-incomes.utils';
import {
  resolveCreateScheduleDays,
  resolveUpdateScheduleDays,
} from './recurring-event-schedule.utils';
import {
  addCalendarDays,
  getLocalPartsInTz,
} from '../recurring-expenses/recurring-expenses.utils';
import type { TransactionAuditContext } from '../transactions/transactions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { wasPaidOnLocalYmd } from './recurring-event-commitment.utils';
import { CreateRecurringEventDto } from './dto/create-recurring-event.dto';
import { UpdateRecurringEventDto } from './dto/update-recurring-event.dto';
import { recurringEventMatchesLocalDate } from './recurring-events.utils';

export type RecurringEventApiRow = {
  id: string;
  name: string;
  type: RecurringEvent['type'];
  amount: string;
  currency: string;
  frequency: RecurringEvent['frequency'];
  daysOfMonth: number[];
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  billingMonth: number | null;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  defaultAccountId: string;
  lastProcessedDate: string | null;
  isActive: boolean;
  account?: { id: string; name: string };
};

export type PendingRecurringEventRow = {
  event: RecurringEventApiRow;
  nextOccurrenceLocal: string;
  nextOccurrenceIso: string;
};

@Injectable()
export class RecurringEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  private validateSchedule(
    frequency: RecurringEventFrequency,
    days: number[],
    billingMonth: number | null | undefined,
    dayOfWeek: number | null | undefined,
  ): void {
    if (frequency === 'WEEKLY') {
      if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new BadRequestException('Para frecuencia semanal indica dayOfWeek (0–6).');
      }
      if (billingMonth != null) {
        throw new BadRequestException('billingMonth solo aplica a frecuencia anual.');
      }
      return;
    }
    if (days.length === 0) {
      throw new BadRequestException('Indica al menos un día del mes en daysOfMonth.');
    }
    if (frequency === 'YEARLY') {
      if (billingMonth == null || billingMonth < 1 || billingMonth > 12) {
        throw new BadRequestException('Para frecuencia anual indica billingMonth (1–12).');
      }
    } else if (frequency === 'BIWEEKLY' && days.length > 2) {
      throw new BadRequestException('Quincenal: como máximo dos días del mes.');
    }
    if (frequency !== 'YEARLY' && billingMonth != null) {
      throw new BadRequestException('billingMonth solo aplica a frecuencia anual.');
    }
  }

  private async assertCategoryForType(userId: string, categoryId: string, eventType: RecurringEvent['type']) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, isArchived: false },
    });
    if (!category) {
      throw new BadRequestException('Categoría no encontrada.');
    }
    const expected =
      eventType === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
    if (category.kind !== expected) {
      throw new BadRequestException(
        'La categoría debe ser de ingreso o de gasto según el tipo del evento.',
      );
    }
    return category;
  }

  private toApi(
    row: RecurringEvent & {
      category?: { id: string; name: string; slug: string };
      account?: { id: string; name: string };
    },
  ): RecurringEventApiRow {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      amount: row.amount.toString(),
      currency: row.currency,
      frequency: row.frequency,
      daysOfMonth: row.daysOfMonth,
      dayOfMonth: row.dayOfMonth,
      dayOfWeek: row.dayOfWeek,
      billingMonth: row.billingMonth,
      categoryId: row.categoryId,
      category: row.category,
      defaultAccountId: row.defaultAccountId,
      lastProcessedDate: row.lastProcessedDate?.toISOString() ?? null,
      isActive: row.isActive,
      account: row.account,
    };
  }

  async list(userId: string, includeInactive = false) {
    const rows = await this.prisma.recurringEvent.findMany({
      where: { userId, ...(includeInactive ? {} : { isActive: true }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: [{ name: 'asc' }],
    });
    return rows.map((r) => this.toApi(r));
  }

  async create(userId: string, dto: CreateRecurringEventDto) {
    const days = resolveCreateScheduleDays(dto);
    this.validateSchedule(
      dto.frequency,
      days,
      dto.billingMonth ?? null,
      dto.frequency === 'WEEKLY' ? (dto.dayOfWeek ?? null) : null,
    );
    await this.assertCategoryForType(userId, dto.categoryId, dto.type);

    const account = await this.prisma.account.findFirst({
      where: { id: dto.defaultAccountId, userId },
    });
    if (!account) {
      throw new BadRequestException('Cuenta no encontrada.');
    }

    const currency = (dto.currency ?? account.currency).toUpperCase().slice(0, 3);
    if (account.currency.toUpperCase().slice(0, 3) !== currency) {
      throw new BadRequestException('La moneda debe coincidir con la de la cuenta.');
    }

    const row = await this.prisma.recurringEvent.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        currency,
        frequency: dto.frequency,
        daysOfMonth: days,
        dayOfMonth: dto.dayOfMonth ?? (days.length === 1 ? days[0] : null),
        dayOfWeek: dto.frequency === 'WEEKLY' ? dto.dayOfWeek! : null,
        billingMonth: dto.frequency === 'YEARLY' ? dto.billingMonth! : null,
        categoryId: dto.categoryId,
        defaultAccountId: dto.defaultAccountId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
    });
    return this.toApi(row);
  }

  async update(userId: string, id: string, dto: UpdateRecurringEventDto) {
    const existing = await this.prisma.recurringEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Evento recurrente no encontrado.');
    }

    const finalFreq = dto.frequency ?? existing.frequency;
    const finalDays = resolveUpdateScheduleDays(existing, dto);
    const finalBilling =
      finalFreq === 'YEARLY'
        ? dto.billingMonth !== undefined
          ? dto.billingMonth
          : existing.billingMonth
        : null;
    const finalDayOfWeek =
      dto.dayOfWeek !== undefined ? dto.dayOfWeek : existing.dayOfWeek;

    this.validateSchedule(
      finalFreq,
      finalDays,
      finalBilling,
      finalFreq === 'WEEKLY' ? finalDayOfWeek : null,
    );

    if (dto.categoryId) {
      const t = dto.type ?? existing.type;
      await this.assertCategoryForType(userId, dto.categoryId, t);
    } else if (dto.type != null) {
      await this.assertCategoryForType(userId, existing.categoryId, dto.type);
    }

    if (dto.defaultAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.defaultAccountId, userId },
      });
      if (!account) {
        throw new BadRequestException('Cuenta no encontrada.');
      }
    }

    const patch: Prisma.RecurringEventUpdateInput = {};
    if (dto.name != null) patch.name = dto.name.trim();
    if (dto.type != null) patch.type = dto.type;
    if (dto.amount != null) patch.amount = new Prisma.Decimal(dto.amount);
    if (dto.currency != null) patch.currency = dto.currency.toUpperCase().slice(0, 3);
    if (dto.frequency != null) patch.frequency = dto.frequency;
    if (dto.daysOfMonth != null || dto.frequency != null || dto.dayOfMonth !== undefined) {
      patch.daysOfMonth = finalDays;
    }
    if (dto.dayOfMonth !== undefined) patch.dayOfMonth = dto.dayOfMonth;
    if (dto.frequency != null || dto.dayOfWeek !== undefined) {
      patch.dayOfWeek = finalFreq === 'WEEKLY' ? finalDayOfWeek : null;
    }
    if (dto.frequency != null) {
      patch.billingMonth = dto.frequency === 'YEARLY' ? finalBilling ?? undefined : null;
    } else if (dto.billingMonth !== undefined) {
      patch.billingMonth = finalFreq === 'YEARLY' ? dto.billingMonth : null;
    }
    if (dto.categoryId != null) patch.category = { connect: { id: dto.categoryId } };
    if (dto.defaultAccountId != null) patch.account = { connect: { id: dto.defaultAccountId } };
    if (dto.isActive != null) patch.isActive = dto.isActive;

    const row = await this.prisma.recurringEvent.update({
      where: { id },
      data: patch,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
    });
    return this.toApi(row);
  }

  async deactivate(userId: string, id: string) {
    const existing = await this.prisma.recurringEvent.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Evento recurrente no encontrado.');
    }
    await this.prisma.recurringEvent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Próximos eventos en los siguientes 7 días (por defecto): compara el calendario local con
   * la programación (`daysOfMonth` / `dayOfWeek`) y omite días ya registrados vía `lastProcessedDate`.
   */
  async getUpcomingEvents(
    userId: string,
    daysLookahead: number = 7,
  ): Promise<{
    timezone: string;
    daysLookahead: number;
    items: PendingRecurringEventRow[];
  }> {
    const horizon = Math.min(Math.max(1, Math.floor(daysLookahead)), 366);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user.timezone ?? 'UTC';
    const now = new Date();
    const today = getLocalPartsInTz(tz, now);

    const rows = await this.prisma.recurringEvent.findMany({
      where: { userId, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
    });

    const items: PendingRecurringEventRow[] = [];

    for (let offset = 0; offset < horizon; offset++) {
      const dd = addCalendarDays(today.y, today.m, today.d, offset);
      for (const row of rows) {
        if (
          !recurringEventMatchesLocalDate(
            row.frequency,
            row.daysOfMonth,
            row.billingMonth,
            row.dayOfWeek,
            dd.y,
            dd.m,
            dd.d,
            tz,
          )
        ) {
          continue;
        }
        if (wasPaidOnLocalYmd(row.lastProcessedDate, dd.y, dd.m, dd.d, tz)) {
          continue;
        }
        const noonUtc = new Date(Date.UTC(dd.y, dd.m - 1, dd.d, 12, 0, 0, 0));
        items.push({
          event: this.toApi(row),
          nextOccurrenceLocal: `${dd.y}-${String(dd.m).padStart(2, '0')}-${String(dd.d).padStart(2, '0')}`,
          nextOccurrenceIso: noonUtc.toISOString(),
        });
      }
    }

    items.sort(
      (a, b) =>
        a.nextOccurrenceIso.localeCompare(b.nextOccurrenceIso) ||
        a.event.name.localeCompare(b.event.name, 'es'),
    );
    return { timezone: tz, daysLookahead: horizon, items };
  }

  /**
   * @deprecated Prefer {@link getUpcomingEvents} con `daysLookahead` explícito (por defecto 7).
   */
  async getPendingRecurringEvents(userId: string) {
    return this.getUpcomingEvents(userId, 7);
  }

  async getDueToday(userId: string): Promise<{
    timezone: string;
    localDate: string;
    items: RecurringEventApiRow[];
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user.timezone ?? 'UTC';
    const now = new Date();
    const { y, m, d } = getLocalPartsInTz(tz, now);
    const localDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const rows = await this.prisma.recurringEvent.findMany({
      where: { userId, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
    });

    const items: RecurringEventApiRow[] = [];
    for (const row of rows) {
      if (
        recurringEventMatchesLocalDate(
          row.frequency,
          row.daysOfMonth,
          row.billingMonth,
          row.dayOfWeek,
          y,
          m,
          d,
          tz,
        ) &&
        !wasPaidOnLocalYmd(row.lastProcessedDate, y, m, d, tz)
      ) {
        items.push(this.toApi(row));
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return { timezone: tz, localDate, items };
  }

  /**
   * Procesa un evento recurrente: crea la transacción y fija `lastProcessedDate` a ahora.
   * Alias conceptual de {@link confirmRecurringEvent}.
   */
  processEvent(
    userId: string,
    eventId: string,
    audit?: TransactionAuditContext,
  ) {
    return this.confirmRecurringEvent(userId, eventId, audit);
  }

  async confirmRecurringEvent(
    userId: string,
    eventId: string,
    audit?: TransactionAuditContext,
  ) {
    const ev = await this.prisma.recurringEvent.findFirst({
      where: { id: eventId, userId, isActive: true },
      include: { category: true },
    });
    if (!ev) {
      throw new NotFoundException('Evento recurrente no encontrado o inactivo.');
    }

    const txType =
      ev.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;

    const result = await this.transactions.create(
      userId,
      {
        accountId: ev.defaultAccountId,
        categoryId: ev.categoryId,
        type: txType,
        amount: Number(ev.amount),
        concept: `${ev.name}`,
        occurredAt: new Date().toISOString(),
        source: TransactionSource.MANUAL,
        currency: ev.currency,
      },
      audit,
    );

    await this.prisma.recurringEvent.update({
      where: { id: ev.id },
      data: { lastProcessedDate: new Date() },
    });

    return result;
  }

  async markProcessed(userId: string, id: string) {
    const existing = await this.prisma.recurringEvent.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!existing) {
      throw new NotFoundException('Evento recurrente no encontrado.');
    }
    const row = await this.prisma.recurringEvent.update({
      where: { id },
      data: { lastProcessedDate: new Date() },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true } },
      },
    });
    return this.toApi(row);
  }
}

export { RecurringEventsService as RecurringService };
