import { Injectable } from '@nestjs/common';
import { Prisma, TransactionType, type Category, type Transaction } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

const LOOKBACK_WEEKS = 14;
const HISTORY_WEEKS = 12;

export type SpendingInsightPayload = {
  message: string;
  categoryName: string;
  currency: string;
  thisWeekCount: number;
  thisWeekTotal: string;
  avgWeeklyHistorical: string;
  deltaVsAverage: string;
};

function sanitizeIanaTimeZone(tz: string | null | undefined): string {
  const t = (tz ?? 'UTC').trim();
  if (!/^[A-Za-z0-9/_+\-]+$/.test(t) || t.length > 120) {
    return 'UTC';
  }
  return t;
}

function pgZoneLiteral(tz: string | null | undefined): string {
  return `'${sanitizeIanaTimeZone(tz).replace(/'/g, "''")}'`;
}

function formatMoneyEs(amount: number, currency: string): string {
  const code = currency.length === 3 ? currency.toUpperCase() : 'MXN';
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${code}`;
  }
}

type WeekAggRow = { wk_key: string; cnt: number; total: Prisma.Decimal };

@Injectable()
export class SpendingPatternService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compara el gasto de la semana calendario (lunes–domingo en la zona del usuario)
   * con el promedio semanal de las últimas 12 semanas anteriores en la misma categoría y moneda base.
   */
  async buildInsightAfterExpense(
    userId: string,
    userDefaultCurrency: string,
    userTimezone: string | null | undefined,
    category: Pick<Category, 'name'>,
    categoryId: string,
    created: Pick<Transaction, 'type' | 'currency' | 'occurredAt'>,
  ): Promise<SpendingInsightPayload | null> {
    if (created.type !== TransactionType.EXPENSE) {
      return null;
    }

    const currency = userDefaultCurrency.toUpperCase().slice(0, 3);
    const txCur = created.currency.toUpperCase().slice(0, 3);
    if (txCur !== currency) {
      return null;
    }

    const occurredAt = created.occurredAt;
    const zoneLiteral = Prisma.raw(pgZoneLiteral(userTimezone));

    const since = new Date(occurredAt.getTime() - LOOKBACK_WEEKS * 7 * 24 * 60 * 60 * 1000);

    const [currentRow] = await this.prisma.$queryRaw<Array<{ wk_key: string }>>`
      SELECT to_char(date_trunc('week', ${occurredAt}::timestamptz AT TIME ZONE ${zoneLiteral}), 'YYYY-MM-DD') AS wk_key
    `;

    if (!currentRow?.wk_key) {
      return null;
    }

    const currentWeekKey = currentRow.wk_key;

    const rows = await this.prisma.$queryRaw<WeekAggRow[]>`
      SELECT
        to_char(date_trunc('week', t.occurred_at AT TIME ZONE ${zoneLiteral}), 'YYYY-MM-DD') AS wk_key,
        COUNT(*)::int AS cnt,
        COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      WHERE t.user_id = ${userId}::uuid
        AND t.category_id = ${categoryId}::uuid
        AND t.type = 'EXPENSE'
        AND UPPER(TRIM(t.currency)) = ${currency}
        AND t.occurred_at >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const thisWeek = rows.find((r) => r.wk_key === currentWeekKey);
    if (!thisWeek) {
      return null;
    }

    const priorDesc = rows
      .filter((r) => r.wk_key < currentWeekKey)
      .sort((a, b) => b.wk_key.localeCompare(a.wk_key));
    const last12 = priorDesc.slice(0, HISTORY_WEEKS);
    const sumHist = last12.reduce((s, r) => s + Number(r.total), 0);
    const avgWeekly = sumHist / HISTORY_WEEKS;

    const thisWeekTotal = Number(thisWeek.total);
    const thisWeekCount = thisWeek.cnt;
    const delta = thisWeekTotal - avgWeekly;

    const priorTxCount = priorDesc.reduce((s, r) => s + r.cnt, 0);
    if (priorTxCount < 3) {
      return null;
    }
    if (avgWeekly < 1 && priorTxCount < 8) {
      return null;
    }
    if (delta <= 0) {
      return null;
    }
    if (thisWeekCount < 2) {
      return null;
    }

    const categoryName = category.name.trim() || 'esta categoría';
    const movLabel = thisWeekCount === 1 ? 'gasto' : 'gastos';
    const deltaStr = formatMoneyEs(delta, currency);
    const avgStr = formatMoneyEs(avgWeekly, currency);

    const message =
      `Has registrado ${thisWeekCount} ${movLabel} en ${categoryName} esta semana. ` +
      `Vas ${deltaStr} por encima de tu promedio habitual (${avgStr} por semana). ` +
      `¿Quieres que revisemos cuánto queda para tus servicios?`;

    return {
      message,
      categoryName,
      currency,
      thisWeekCount,
      thisWeekTotal: String(thisWeekTotal),
      avgWeeklyHistorical: String(avgWeekly),
      deltaVsAverage: String(delta),
    };
  }
}
