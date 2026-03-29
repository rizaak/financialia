import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { effectiveExpenseAmountFromMetadata } from '@common/utils/effective-expense-amount';
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

    const [incomeAgg, expenseRows] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          occurredAt: occurred,
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          occurredAt: occurred,
        },
        select: {
          amount: true,
          metadata: true,
          category: { select: { id: true, name: true, slug: true, color: true } },
        },
      }),
    ]);

    const income = new Prisma.Decimal(incomeAgg._sum.amount ?? 0);

    let expense = new Prisma.Decimal(0);
    const byCategory = new Map<string, Prisma.Decimal>();
    const catMeta = new Map<string, { name: string; slug: string; color: string | null }>();
    for (const row of expenseRows) {
      const eff = effectiveExpenseAmountFromMetadata(row.metadata, row.amount);
      expense = expense.plus(eff);
      const cid = row.category.id;
      const prev = byCategory.get(cid) ?? new Prisma.Decimal(0);
      byCategory.set(cid, prev.plus(eff));
      if (!catMeta.has(cid)) {
        catMeta.set(cid, {
          name: row.category.name,
          slug: row.category.slug,
          color: row.category.color,
        });
      }
    }

    const net = income.minus(expense);

    const expensesByCategory = [...byCategory.entries()]
      .map(([categoryId, total]) => {
        const meta = catMeta.get(categoryId);
        return {
          categoryId,
          name: meta?.name ?? '—',
          slug: meta?.slug ?? '',
          color: meta?.color ?? null,
          total: total.toString(),
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
