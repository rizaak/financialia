import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';

export type DashboardSummaryResponse = {
  period: { from: string; to: string };
  totals: {
    income: string;
    expense: string;
    net: string;
  };
  expensesByCategory: Array<{
    categoryId: string;
    name: string;
    slug: string;
    color: string | null;
    total: string;
  }>;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    userId: string,
    query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    const { start, end } = this.resolvePeriod(query);
    const occurred = { gte: start, lte: end };

    const [expenseAgg, incomeAgg, byCategory] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: occurred,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          occurredAt: occurred,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: occurred,
        },
        _sum: { amount: true },
      }),
    ]);

    const income = new Prisma.Decimal(incomeAgg._sum.amount ?? 0);
    const expense = new Prisma.Decimal(expenseAgg._sum.amount ?? 0);
    const net = income.minus(expense);

    const categoryIds = byCategory.map((r) => r.categoryId);
    const categories =
      categoryIds.length === 0
        ? []
        : await this.prisma.category.findMany({
            where: { userId, id: { in: categoryIds } },
          });
    const catById = new Map(categories.map((c) => [c.id, c]));

    const expensesByCategory = byCategory
      .map((row) => {
        const c = catById.get(row.categoryId);
        return {
          categoryId: row.categoryId,
          name: c?.name ?? '—',
          slug: c?.slug ?? '',
          color: c?.color ?? null,
          total: (row._sum.amount ?? new Prisma.Decimal(0)).toString(),
        };
      })
      .sort((a, b) => Number(b.total) - Number(a.total));

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      totals: {
        income: income.toString(),
        expense: expense.toString(),
        net: net.toString(),
      },
      expensesByCategory,
    };
  }

  private resolvePeriod(query: DashboardSummaryQueryDto): { start: Date; end: Date } {
    const { from, to } = query;
    if (from && to) {
      return { start: new Date(from), end: new Date(to) };
    }
    if (from || to) {
      throw new BadRequestException('Envía ambos parámetros from y to, o ninguno (mes UTC actual).');
    }
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }
}
