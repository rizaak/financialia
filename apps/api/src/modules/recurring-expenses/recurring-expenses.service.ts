import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  Prisma,
  RecurringExpenseFrequency,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { TransactionAuditContext } from '../transactions/transactions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import {
  formatAmountEs,
  getLocalPartsInTz,
  matchesRecurringOnLocalDate,
  nextChargeWithinHorizon,
  sameLocalCalendarDay,
} from './recurring-expenses.utils';

export type UpcomingChargeRow = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  frequency: RecurringExpenseFrequency;
  categoryName: string;
  accountName: string;
  daysFromToday: number;
  chargeDateIso: string;
  chargeDateLabel: string;
};

@Injectable()
export class RecurringExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  async list(userId: string, includeArchived = false) {
    return this.prisma.recurringExpense.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, dto: CreateRecurringExpenseDto) {
    const needsMonth =
      dto.frequency === RecurringExpenseFrequency.ANNUAL ||
      dto.frequency === RecurringExpenseFrequency.SEMIANNUAL;
    if (needsMonth && (dto.billingMonth == null || dto.billingMonth < 1 || dto.billingMonth > 12)) {
      throw new BadRequestException('Para frecuencia anual o semestral indica el mes (1–12).');
    }
    if (!needsMonth && dto.billingMonth != null) {
      throw new BadRequestException('billingMonth solo aplica a frecuencia anual o semestral.');
    }
    if (
      dto.frequency === RecurringExpenseFrequency.WEEKLY &&
      (dto.billingWeekday == null || dto.billingWeekday < 0 || dto.billingWeekday > 6)
    ) {
      throw new BadRequestException('Para frecuencia semanal indica el día de la semana (0=domingo … 6=sábado).');
    }
    if (dto.frequency !== RecurringExpenseFrequency.WEEKLY && dto.billingWeekday != null) {
      throw new BadRequestException('billingWeekday solo aplica a frecuencia semanal.');
    }

    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, userId, isArchived: false },
    });
    if (!category || category.kind !== TransactionType.EXPENSE) {
      throw new BadRequestException('Elige una categoría de gasto válida.');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, userId, status: AccountStatus.ACTIVE },
    });
    if (!account) {
      throw new BadRequestException('Cuenta no encontrada.');
    }

    const currency = (dto.currency ?? account.currency).toUpperCase().slice(0, 3);
    if (account.currency.toUpperCase().slice(0, 3) !== currency) {
      throw new BadRequestException('La moneda debe coincidir con la de la cuenta.');
    }

    return this.prisma.recurringExpense.create({
      data: {
        userId,
        name: dto.name.trim(),
        amount: new Prisma.Decimal(dto.amount),
        currency,
        categoryId: dto.categoryId,
        accountId: dto.accountId,
        frequency: dto.frequency,
        billingDay: dto.billingDay,
        billingMonth: needsMonth ? dto.billingMonth! : null,
        billingWeekday: dto.frequency === RecurringExpenseFrequency.WEEKLY ? dto.billingWeekday! : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateRecurringExpenseDto) {
    const existing = await this.prisma.recurringExpense.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Cargo recurrente no encontrado.');
    }

    const finalFreq = dto.frequency ?? existing.frequency;
    const needsMonth =
      finalFreq === RecurringExpenseFrequency.ANNUAL || finalFreq === RecurringExpenseFrequency.SEMIANNUAL;
    if (needsMonth) {
      const bm = dto.billingMonth !== undefined ? dto.billingMonth : existing.billingMonth;
      if (bm == null || bm < 1 || bm > 12) {
        throw new BadRequestException('Para frecuencia anual o semestral indica billingMonth (1–12).');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId, isArchived: false },
      });
      if (!category || category.kind !== TransactionType.EXPENSE) {
        throw new BadRequestException('Elige una categoría de gasto válida.');
      }
    }

    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId, status: AccountStatus.ACTIVE },
      });
      if (!account) {
        throw new BadRequestException('Cuenta no encontrada.');
      }
    }

    const patch: Prisma.RecurringExpenseUpdateInput = {};
    if (dto.name != null) patch.name = dto.name.trim();
    if (dto.amount != null) patch.amount = new Prisma.Decimal(dto.amount);
    if (dto.billingDay != null) patch.billingDay = dto.billingDay;
    if (dto.frequency != null) patch.frequency = dto.frequency;
    if (needsMonth) {
      patch.billingMonth =
        dto.billingMonth !== undefined ? dto.billingMonth : existing.billingMonth;
    } else {
      patch.billingMonth = null;
    }
    if (finalFreq === RecurringExpenseFrequency.WEEKLY) {
      const bw =
        dto.billingWeekday !== undefined ? dto.billingWeekday : existing.billingWeekday;
      if (bw == null || bw < 0 || bw > 6) {
        throw new BadRequestException('Para frecuencia semanal indica billingWeekday (0–6).');
      }
      patch.billingWeekday = bw;
    } else {
      patch.billingWeekday = null;
    }
    if (dto.categoryId != null) patch.category = { connect: { id: dto.categoryId } };
    if (dto.accountId != null) patch.account = { connect: { id: dto.accountId } };
    if (dto.currency != null) patch.currency = dto.currency.toUpperCase().slice(0, 3);
    if (dto.isArchived != null) patch.isArchived = dto.isArchived;

    return this.prisma.recurringExpense.update({
      where: { id },
      data: patch,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
    });
  }

  async archive(userId: string, id: string) {
    const existing = await this.prisma.recurringExpense.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Cargo recurrente no encontrado.');
    }
    return this.prisma.recurringExpense.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async upcoming(userId: string, days = 7): Promise<UpcomingChargeRow[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const now = new Date();
    const horizon = Math.min(Math.max(days, 1), 31);

    const rows = await this.prisma.recurringExpense.findMany({
      where: { userId, isArchived: false },
      include: {
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
    });

    const out: UpcomingChargeRow[] = [];
    for (const re of rows) {
      const n = nextChargeWithinHorizon(re, tz, now, horizon);
      if (!n) continue;
      const { chargeOn, daysFromToday } = n;
      const chargeDateIso = `${chargeOn.y}-${String(chargeOn.m).padStart(2, '0')}-${String(chargeOn.d).padStart(2, '0')}`;
      const noonUtc = new Date(Date.UTC(chargeOn.y, chargeOn.m - 1, chargeOn.d, 12, 0, 0, 0));
      let chargeDateLabel: string;
      try {
        chargeDateLabel = new Intl.DateTimeFormat('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: tz,
        }).format(noonUtc);
      } catch {
        chargeDateLabel = chargeDateIso;
      }
      out.push({
        id: re.id,
        name: re.name,
        amount: re.amount.toString(),
        currency: re.currency,
        frequency: re.frequency,
        categoryName: re.category.name,
        accountName: re.account.name,
        daysFromToday,
        chargeDateIso,
        chargeDateLabel,
      });
    }

    out.sort((a, b) => {
      if (a.daysFromToday !== b.daysFromToday) return a.daysFromToday - b.daysFromToday;
      return a.name.localeCompare(b.name, 'es');
    });
    return out;
  }

  /** Recordatorios para el chat el día del cobro (si aún no confirmó hoy). */
  async chatReminders(
    userId: string,
  ): Promise<Array<{ recurringExpenseId: string; message: string }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const now = new Date();
    const today = getLocalPartsInTz(tz, now);

    const rows = await this.prisma.recurringExpense.findMany({
      where: { userId, isArchived: false },
      include: { account: { select: { name: true } } },
    });

    const out: Array<{ recurringExpenseId: string; message: string }> = [];
    for (const re of rows) {
      if (!matchesRecurringOnLocalDate(re, tz, today.y, today.m, today.d)) {
        continue;
      }
      if (re.lastConfirmedAt != null && sameLocalCalendarDay(tz, re.lastConfirmedAt, now)) {
        continue;
      }
      const amt = formatAmountEs(Number(re.amount), re.currency);
      out.push({
        recurringExpenseId: re.id,
        message: `Hoy es día de ${re.name} (${amt}). ¿Confirmas que se realizó el cargo para descontarlo de tu cuenta ${re.account.name}?`,
      });
    }
    return out;
  }

  async confirmCharge(userId: string, id: string, audit?: TransactionAuditContext) {
    const re = await this.prisma.recurringExpense.findFirst({
      where: { id, userId, isArchived: false },
    });
    if (!re) {
      throw new NotFoundException('Cargo recurrente no encontrado.');
    }

    const result = await this.transactions.create(
      userId,
      {
        accountId: re.accountId,
        categoryId: re.categoryId,
        type: TransactionType.EXPENSE,
        amount: Number(re.amount),
        concept: `Suscripción: ${re.name}`,
        occurredAt: new Date().toISOString(),
        source: TransactionSource.MANUAL,
        currency: re.currency,
      },
      audit,
    );

    await this.prisma.recurringExpense.update({
      where: { id: re.id },
      data: { lastConfirmedAt: new Date() },
    });

    return result;
  }
}
