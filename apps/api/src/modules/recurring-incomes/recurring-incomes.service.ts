import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  Prisma,
  RecurringIncomeFrequency,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { getLocalPartsInTz } from '../recurring-expenses/recurring-expenses.utils';
import type { TransactionAuditContext } from '../transactions/transactions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateRecurringIncomeDto } from './dto/create-recurring-income.dto';
import { UpdateRecurringIncomeDto } from './dto/update-recurring-income.dto';
import {
  formatAmountEs,
  normalizePaymentDays,
  paymentDayMatches,
  sameLocalCalendarDay,
} from './recurring-incomes.utils';

/** Slug sembrado en `default-category-seeds` para "Salario / nómina". */
const NOMINA_CATEGORY_SLUG = 'salario';

export type RecurringIncomeListRow = {
  id: string;
  label: string;
  amount: string;
  currency: string;
  frequency: RecurringIncomeFrequency;
  paymentDays: number[];
  categoryId: string;
  accountId: string;
  lastConfirmedAt: string | null;
  isArchived: boolean;
  category: { id: string; name: string; slug: string };
  account: { id: string; name: string; type: string; currency: string };
  dueToday: boolean;
  hasIncomeRegisteredToday: boolean;
};

@Injectable()
export class RecurringIncomesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
  ) {}

  private async assertNominaCategory(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, isArchived: false },
    });
    if (!category || category.kind !== TransactionType.INCOME) {
      throw new BadRequestException('Elige una categoría de ingreso válida.');
    }
    if (category.slug !== NOMINA_CATEGORY_SLUG) {
      throw new BadRequestException(
        'La categoría debe ser "Salario / nómina" (nómina) para ingresos recurrentes.',
      );
    }
    return category;
  }

  private async hasIncomeOnLocalDay(
    userId: string,
    categoryId: string,
    y: number,
    m: number,
    d: number,
    tz: string,
  ): Promise<boolean> {
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        categoryId,
        type: TransactionType.INCOME,
        occurredAt: {
          gte: new Date(Date.UTC(y, m - 1, d - 1)),
          lte: new Date(Date.UTC(y, m - 1, d + 2, 23, 59, 59, 999)),
        },
      },
      select: { occurredAt: true },
    });
    return txs.some((tx) => {
      const p = getLocalPartsInTz(tz, tx.occurredAt);
      return p.y === y && p.m === m && p.d === d;
    });
  }

  async list(userId: string, includeArchived = false): Promise<RecurringIncomeListRow[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const now = new Date();
    const today = getLocalPartsInTz(tz, now);

    const rows = await this.prisma.recurringIncome.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
      orderBy: { label: 'asc' },
    });

    const out: RecurringIncomeListRow[] = [];
    for (const ri of rows) {
      const due = paymentDayMatches(ri.paymentDays, today.y, today.m, today.d);
      const hasIncome = due
        ? await this.hasIncomeOnLocalDay(userId, ri.categoryId, today.y, today.m, today.d, tz)
        : false;
      out.push(this.toListRow(ri, due, hasIncome));
    }
    return out;
  }

  async create(userId: string, dto: CreateRecurringIncomeDto) {
    const category = await this.assertNominaCategory(userId, dto.categoryId);

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

    const paymentDays = normalizePaymentDays(dto.paymentDays);
    if (paymentDays.length === 0) {
      throw new BadRequestException('Indica al menos un día de pago válido (1–31).');
    }

    const row = await this.prisma.recurringIncome.create({
      data: {
        userId,
        label: (dto.label ?? 'Nómina').trim(),
        amount: new Prisma.Decimal(dto.amount),
        currency,
        frequency: dto.frequency,
        paymentDays,
        categoryId: category.id,
        accountId: dto.accountId,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const today = getLocalPartsInTz(tz, new Date());
    const due = paymentDayMatches(row.paymentDays, today.y, today.m, today.d);
    const hasIncome = due
      ? await this.hasIncomeOnLocalDay(userId, row.categoryId, today.y, today.m, today.d, tz)
      : false;

    return this.toListRow(row, due, hasIncome);
  }

  private toListRow(
    ri: {
      id: string;
      label: string;
      amount: Prisma.Decimal;
      currency: string;
      frequency: RecurringIncomeFrequency;
      paymentDays: number[];
      categoryId: string;
      accountId: string;
      lastConfirmedAt: Date | null;
      isArchived: boolean;
      category: { id: string; name: string; slug: string };
      account: { id: string; name: string; type: string; currency: string };
    },
    dueToday: boolean,
    hasIncomeRegisteredToday: boolean,
  ): RecurringIncomeListRow {
    return {
      id: ri.id,
      label: ri.label,
      amount: ri.amount.toString(),
      currency: ri.currency,
      frequency: ri.frequency,
      paymentDays: ri.paymentDays,
      categoryId: ri.categoryId,
      accountId: ri.accountId,
      lastConfirmedAt: ri.lastConfirmedAt?.toISOString() ?? null,
      isArchived: ri.isArchived,
      category: ri.category,
      account: ri.account,
      dueToday,
      hasIncomeRegisteredToday,
    };
  }

  async update(userId: string, id: string, dto: UpdateRecurringIncomeDto) {
    const existing = await this.prisma.recurringIncome.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Ingreso recurrente no encontrado.');
    }

    if (dto.categoryId) {
      await this.assertNominaCategory(userId, dto.categoryId);
    }

    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId, status: AccountStatus.ACTIVE },
      });
      if (!account) {
        throw new BadRequestException('Cuenta no encontrada.');
      }
    }

    const patch: Prisma.RecurringIncomeUpdateInput = {};
    if (dto.label != null) patch.label = dto.label.trim();
    if (dto.amount != null) patch.amount = new Prisma.Decimal(dto.amount);
    if (dto.frequency != null) patch.frequency = dto.frequency;
    if (dto.paymentDays != null) {
      const normalized = normalizePaymentDays(dto.paymentDays);
      if (normalized.length === 0) {
        throw new BadRequestException('Indica al menos un día de pago válido (1–31).');
      }
      patch.paymentDays = normalized;
    }
    if (dto.categoryId != null) patch.category = { connect: { id: dto.categoryId } };
    if (dto.accountId != null) patch.account = { connect: { id: dto.accountId } };
    if (dto.currency != null) patch.currency = dto.currency.toUpperCase().slice(0, 3);
    if (dto.isArchived != null) patch.isArchived = dto.isArchived;

    const row = await this.prisma.recurringIncome.update({
      where: { id },
      data: patch,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const today = getLocalPartsInTz(tz, new Date());
    const due = paymentDayMatches(row.paymentDays, today.y, today.m, today.d);
    const hasIncome = due
      ? await this.hasIncomeOnLocalDay(userId, row.categoryId, today.y, today.m, today.d, tz)
      : false;

    return this.toListRow(row, due, hasIncome);
  }

  async archive(userId: string, id: string) {
    const existing = await this.prisma.recurringIncome.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Ingreso recurrente no encontrado.');
    }
    return this.prisma.recurringIncome.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async chatReminders(
    userId: string,
  ): Promise<Array<{ recurringIncomeId: string; message: string }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone ?? 'UTC';
    const now = new Date();
    const today = getLocalPartsInTz(tz, now);

    const rows = await this.prisma.recurringIncome.findMany({
      where: { userId, isArchived: false },
    });

    const out: Array<{ recurringIncomeId: string; message: string }> = [];
    for (const ri of rows) {
      if (!paymentDayMatches(ri.paymentDays, today.y, today.m, today.d)) {
        continue;
      }
      if (await this.hasIncomeOnLocalDay(userId, ri.categoryId, today.y, today.m, today.d, tz)) {
        continue;
      }
      if (ri.lastConfirmedAt != null && sameLocalCalendarDay(tz, ri.lastConfirmedAt, now)) {
        continue;
      }

      const amt = formatAmountEs(Number(ri.amount), ri.currency);
      const intro =
        ri.frequency === RecurringIncomeFrequency.QUINCENAL
          ? '¡Hoy es quincena!'
          : '¡Hoy es día de nómina!';
      out.push({
        recurringIncomeId: ri.id,
        message: `${intro} ¿Te depositaron tus ${amt}? Haz clic aquí para registrarlo.`,
      });
    }
    return out;
  }

  async confirmDeposit(userId: string, id: string, audit?: TransactionAuditContext) {
    const ri = await this.prisma.recurringIncome.findFirst({
      where: { id, userId, isArchived: false },
    });
    if (!ri) {
      throw new NotFoundException('Ingreso recurrente no encontrado.');
    }

    const result = await this.transactions.create(
      userId,
      {
        accountId: ri.accountId,
        categoryId: ri.categoryId,
        type: TransactionType.INCOME,
        amount: Number(ri.amount),
        concept: `Nómina: ${ri.label}`,
        occurredAt: new Date().toISOString(),
        source: TransactionSource.MANUAL,
        currency: ri.currency,
      },
      audit,
    );

    await this.prisma.recurringIncome.update({
      where: { id: ri.id },
      data: { lastConfirmedAt: new Date() },
    });

    return result;
  }
}
