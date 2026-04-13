import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AccountType, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService, type StatementPaymentBreakdown } from './accounts.service';
import { addUtcDays, closingEndOfDayUtc, startOfUtcDay } from './credit-card-period.utils';

export type CreditCardStatementDto = {
  statementPeriod: { from: string; to: string };
  nextClosingDate: string;
  nextPaymentDueDate: string;
  daysUntilPaymentDue: number;
  /** Gastos sin plan de cuotas desde el último corte hasta el fin del rango usado en el cálculo. */
  balanceAtStatement: string;
  /** Suma de `monthlyAmount` de planes ACTIVE en esa tarjeta. */
  installmentRecurringPortion: string;
  paymentToAvoidInterest: string;
  interestProjectionNextMonth: string;
  availableCredit: string;
  nextPaymentLabel: string;
  creditLimit: string;
  currentDebt: string;
  currency: string;
  statementClosedThisMonth: boolean;
  lastStatementClosingDate: string | null;
  lastClosedStatementBalance: string;
  lastClosedStatementPaymentAmount: string;
  /** Abonos (transferencias + ingresos) a la tarjeta posteriores al último corte. */
  paymentsAppliedSinceLastClosing: string;
  /** Pendiente del cierre para evitar intereses tras descontar abonos (≥ 0). */
  remainingLastStatementPaymentAmount: string;
  lastStatementPaymentDueDate: string | null;
  inPaymentWindow: boolean;
  paymentPastDue: boolean;
};

@Injectable()
export class CreditCardStatementService {
  private readonly logger = new Logger(CreditCardStatementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async calculateStatement(userId: string, accountId: string): Promise<CreditCardStatementDto> {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId, type: AccountType.CREDIT_CARD },
      include: { creditCard: true },
    });
    if (!account) {
      this.logger.warn(
        `[calculateStatement] Cuenta no encontrada (userId=${userId}, accountId=${accountId})`,
      );
      throw new NotFoundException('Tarjeta de crédito no encontrada o sin perfil financiero.');
    }
    if (!account.creditCard) {
      this.logger.warn(
        `[calculateStatement] Sin relación creditCard (userId=${userId}, accountId=${accountId}, closingDay/paymentDue requeridos)`,
      );
      throw new NotFoundException('Tarjeta de crédito no encontrada o sin perfil financiero.');
    }

    const cc = account.creditCard;
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();

    const thisMonthClosing = closingEndOfDayUtc(y, m, cc.closingDay);
    let nextClosing: Date;
    let prevClosing: Date;

    if (now <= thisMonthClosing) {
      nextClosing = thisMonthClosing;
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      prevClosing = closingEndOfDayUtc(py, pm, cc.closingDay);
    } else {
      const nm = m + 1;
      const ny = nm > 11 ? y + 1 : y;
      const nmi = nm > 11 ? 0 : nm;
      nextClosing = closingEndOfDayUtc(ny, nmi, cc.closingDay);
      prevClosing = thisMonthClosing;
    }

    const nextPaymentDue = addUtcDays(nextClosing, cc.paymentDueDaysAfterClosing);
    const msUntilDue = nextPaymentDue.getTime() - now.getTime();
    const daysUntilPaymentDue = Math.max(0, Math.ceil(msUntilDue / (24 * 60 * 60 * 1000)));

    let breakdown: StatementPaymentBreakdown;
    try {
      breakdown = await this.accounts.getStatementSummary(userId, accountId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `[calculateStatement] getStatementSummary falló (userId=${userId}, accountId=${accountId}): ${msg}`,
      );
      throw e;
    }
    const statementSum = new Prisma.Decimal(breakdown.consumosDelMes);
    const installmentRecurringPortion = new Prisma.Decimal(breakdown.mensualidadesActivas);
    const paymentToAvoidInterest = new Prisma.Decimal(breakdown.pagoParaNoGenerarIntereses);

    const statementClosedThisMonth = now > thisMonthClosing;
    let lastStatementClosingDate: string | null = null;
    let lastStatementPaymentDueDate: string | null = null;
    let lastClosedStatementBalance = new Prisma.Decimal(0);
    let lastClosedStatementPaymentAmount = new Prisma.Decimal(0);
    let paymentsAppliedSinceLastClosing = new Prisma.Decimal(0);
    let remainingLastStatementPaymentAmount = new Prisma.Decimal(0);

    if (statementClosedThisMonth) {
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      const previousMonthClosing = closingEndOfDayUtc(py, pm, cc.closingDay);
      const closedStart = startOfUtcDay(addUtcDays(previousMonthClosing, 1));
      const closedEnd = thisMonthClosing;

      const closedBreakdown = await this.accounts.getStatementSummary(userId, accountId, {
        periodStart: closedStart,
        through: closedEnd,
      });
      lastClosedStatementBalance = new Prisma.Decimal(closedBreakdown.consumosDelMes);
      lastClosedStatementPaymentAmount = new Prisma.Decimal(closedBreakdown.pagoParaNoGenerarIntereses);
      lastStatementClosingDate = thisMonthClosing.toISOString();
      lastStatementPaymentDueDate = addUtcDays(
        thisMonthClosing,
        cc.paymentDueDaysAfterClosing,
      ).toISOString();

      const [transferPaid, incomePaid] = await Promise.all([
        this.prisma.transfer.aggregate({
          where: {
            userId,
            destinationAccountId: accountId,
            occurredAt: { gt: thisMonthClosing },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            userId,
            accountId,
            type: TransactionType.INCOME,
            occurredAt: { gt: thisMonthClosing },
          },
          _sum: { amount: true },
        }),
      ]);
      const tp = new Prisma.Decimal(transferPaid._sum.amount ?? 0);
      const ip = new Prisma.Decimal(incomePaid._sum.amount ?? 0);
      paymentsAppliedSinceLastClosing = tp.plus(ip);
      remainingLastStatementPaymentAmount = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        lastClosedStatementPaymentAmount.minus(paymentsAppliedSinceLastClosing),
      );
    }

    let inPaymentWindow = false;
    let paymentPastDue = false;
    if (statementClosedThisMonth && lastStatementPaymentDueDate) {
      const dueT = new Date(lastStatementPaymentDueDate).getTime();
      const nowT = now.getTime();
      inPaymentWindow = nowT <= dueT;
      paymentPastDue = nowT > dueT;
    }

    const debt = new Prisma.Decimal(account.balance);
    const limit = account.creditLimit ? new Prisma.Decimal(account.creditLimit) : new Prisma.Decimal(0);
    const available = limit.minus(debt);

    const monthlyRate = new Prisma.Decimal(cc.annualInterestRatePct).dividedBy(12);
    const hypotheticalRemaining = debt.minus(paymentToAvoidInterest);
    const interestProj =
      hypotheticalRemaining.gt(0)
        ? hypotheticalRemaining.times(monthlyRate)
        : new Prisma.Decimal(0);

    const cur = account.currency.toUpperCase().slice(0, 3);

    return {
      statementPeriod: {
        from: breakdown.periodFrom,
        to: breakdown.periodThrough,
      },
      nextClosingDate: nextClosing.toISOString(),
      nextPaymentDueDate: nextPaymentDue.toISOString(),
      daysUntilPaymentDue,
      balanceAtStatement: statementSum.toString(),
      installmentRecurringPortion: installmentRecurringPortion.toString(),
      paymentToAvoidInterest: paymentToAvoidInterest.toString(),
      interestProjectionNextMonth: interestProj.toString(),
      availableCredit: available.toString(),
      nextPaymentLabel: `Próximo pago: ${paymentToAvoidInterest.toDecimalPlaces(2).toString()} ${cur}`,
      creditLimit: limit.toString(),
      currentDebt: debt.toString(),
      currency: cur,
      statementClosedThisMonth,
      lastStatementClosingDate,
      lastClosedStatementBalance: lastClosedStatementBalance.toString(),
      lastClosedStatementPaymentAmount: lastClosedStatementPaymentAmount.toString(),
      paymentsAppliedSinceLastClosing: paymentsAppliedSinceLastClosing.toString(),
      remainingLastStatementPaymentAmount: remainingLastStatementPaymentAmount.toString(),
      lastStatementPaymentDueDate,
      inPaymentWindow,
      paymentPastDue,
    };
  }

  async calculateNextStatement(
    userId: string,
    accountId: string,
  ): Promise<{
    statementPeriod: { from: string; to: string };
    purchasesAfterLastClosing: string;
    activeInstallmentsMonthlyTotal: string;
    paymentToAvoidInterest: string;
    currency: string;
  }> {
    const full = await this.calculateStatement(userId, accountId);
    return {
      statementPeriod: full.statementPeriod,
      purchasesAfterLastClosing: full.balanceAtStatement,
      activeInstallmentsMonthlyTotal: full.installmentRecurringPortion,
      paymentToAvoidInterest: full.paymentToAvoidInterest,
      currency: full.currency,
    };
  }
}
