import { Injectable } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { computeNextPaymentDueUtc } from '../accounts/credit-card-period.utils';

function sanitizeIanaTimeZone(tz: string | null | undefined): string {
  const t = (tz ?? 'UTC').trim();
  if (!/^[A-Za-z0-9/_+\-]+$/.test(t) || t.length > 120) {
    return 'UTC';
  }
  return t;
}

@Injectable()
export class InterestRiskAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  /**
   * Si el efectivo en cuentas de débito (banco/billetera/efectivo) en moneda base
   * es menor que la suma de "pago para no generar intereses" de las tarjetas en esa moneda,
   * devuelve un mensaje para el chat (fecha = vencimiento más próximo entre tarjetas).
   */
  async buildMessageIfRisk(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true, timezone: true },
    });
    if (!user) {
      return null;
    }

    const currency = user.defaultCurrency.toUpperCase().slice(0, 3);

    const rows = await this.prisma.account.findMany({
      where: { userId, currency },
      include: { creditCard: true },
    });

    let liquid = new Prisma.Decimal(0);
    let totalPago = new Prisma.Decimal(0);
    const creditCards: Array<{ creditCard: NonNullable<(typeof rows)[number]['creditCard']> }> = [];

    for (const a of rows) {
      if (a.type === AccountType.BANK || a.type === AccountType.WALLET || a.type === AccountType.CASH) {
        liquid = liquid.plus(new Prisma.Decimal(a.balance));
      }
      if (a.type === AccountType.CREDIT_CARD && a.creditCard) {
        creditCards.push({ creditCard: a.creditCard });
        const b = await this.accounts.getStatementSummary(userId, a.id);
        totalPago = totalPago.plus(new Prisma.Decimal(b.pagoParaNoGenerarIntereses));
      }
    }

    if (creditCards.length === 0) {
      return null;
    }
    if (totalPago.lte(0)) {
      return null;
    }
    if (liquid.gte(totalPago)) {
      return null;
    }

    const now = new Date();
    let earliestDue: Date | null = null;
    for (const { creditCard } of creditCards) {
      const due = computeNextPaymentDueUtc(creditCard, now);
      if (!earliestDue || due.getTime() < earliestDue.getTime()) {
        earliestDue = due;
      }
    }
    if (!earliestDue) {
      return null;
    }

    const tz = sanitizeIanaTimeZone(user.timezone);
    let fechaLabel: string;
    try {
      fechaLabel = new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: tz,
      }).format(earliestDue);
    } catch {
      fechaLabel = earliestDue.toISOString().slice(0, 10);
    }

    return (
      `⚠️ Atención: Tus gastos registrados superan tu efectivo disponible para pagar la tarjeta el día ${fechaLabel}. ` +
      `Considera ajustar tus gastos los próximos días.`
    );
  }
}
