import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AccountType, InstallmentPlanStatus, LoanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { TieredInvestmentsService } from '../investments/tiered-investments.service';
import { calculateAmortizationTable } from '../loans/loan-amortization.engine';
import { LoansService } from '../loans/loans.service';
import { AiParserService } from './ai-parser.service';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function monthsElapsedFromLoanStart(startIso: string, termMonths: number): number {
  const start = new Date(startIso);
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  return Math.max(0, Math.min(months, termMonths));
}

function addMonthsFromStartIso(startIso: string, monthsToAdd: number): string {
  const start = new Date(startIso);
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + monthsToAdd;
  const day = start.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayC = Math.min(day, lastDay);
  return new Date(Date.UTC(y, m, dayC, 12, 0, 0, 0)).toISOString();
}

export type LoanAmortizationCoachLoan = {
  loanId: string;
  name: string;
  kind: string;
  currency: string;
  /** % del monto original que ya es tuyo (capital amortizado vs banco). */
  equityPercentOfOriginal: number;
  contractualThisPayment: {
    paymentMonthNumber: number;
    interest: string;
    principal: string;
    /** Fracción del pago contractual que va a intereses (0–1). */
    interestShareOfPaymentApprox: number;
  };
  contractualCumulativeToDate: {
    cumulativeInterest: string;
    cumulativePrincipal: string;
    /** Si true, en la tabla contractual el capital acumulado ya superó al interés acumulado (como la "mancha verde" vs la roja). */
    cumulativePrincipalExceedsCumulativeInterest: boolean;
  };
  debtFreedom: {
    /** Fecha ISO aproximada en que el saldo contractual llega a cero (fin del plazo). */
    contractApproxEndDateISO: string;
    /** Meses que faltan en el contrato desde hoy (aprox., un pago por mes). */
    remainingMonthsOnContractFromNow: number;
  };
};

function buildLoanAmortizationCoach(loans: Array<{
  id: string;
  name: string;
  kind: string;
  currency: string;
  status: string;
  totalAmount: string;
  interestRateAnnual: string;
  termMonths: number;
  startDate: string;
  percentPrincipalPaid: number;
}>): LoanAmortizationCoachLoan[] {
  const out: LoanAmortizationCoachLoan[] = [];
  for (const l of loans) {
    if (l.status !== LoanStatus.ACTIVE) continue;
    const principal = new Prisma.Decimal(l.totalAmount);
    const annual = new Prisma.Decimal(l.interestRateAnnual);
    if (principal.lte(0) || l.termMonths <= 0) continue;
    const rows = calculateAmortizationTable(principal, annual, l.termMonths);
    if (rows.length === 0) continue;

    const mElapsed = monthsElapsedFromLoanStart(l.startDate, l.termMonths);
    const idx = Math.min(mElapsed, rows.length - 1);
    const row = rows[idx];
    let cumInt = new Prisma.Decimal(0);
    let cumPrin = new Prisma.Decimal(0);
    for (let i = 0; i <= idx; i++) {
      cumInt = cumInt.plus(new Prisma.Decimal(rows[i].interest));
      cumPrin = cumPrin.plus(new Prisma.Decimal(rows[i].principal));
    }
    const intP = new Prisma.Decimal(row.interest);
    const prinP = new Prisma.Decimal(row.principal);
    const pay = intP.plus(prinP);
    const interestShare = pay.gt(0) ? Number(intP.div(pay)) : 0;

    const remaining = Math.max(0, l.termMonths - mElapsed);

    out.push({
      loanId: l.id,
      name: l.name,
      kind: l.kind,
      currency: l.currency,
      equityPercentOfOriginal: l.percentPrincipalPaid,
      contractualThisPayment: {
        paymentMonthNumber: row.month,
        interest: row.interest,
        principal: row.principal,
        interestShareOfPaymentApprox: Math.round(interestShare * 1000) / 1000,
      },
      contractualCumulativeToDate: {
        cumulativeInterest: cumInt.toString(),
        cumulativePrincipal: cumPrin.toString(),
        cumulativePrincipalExceedsCumulativeInterest: cumPrin.gt(cumInt),
      },
      debtFreedom: {
        contractApproxEndDateISO: addMonthsFromStartIso(l.startDate, l.termMonths),
        remainingMonthsOnContractFromNow: remaining,
      },
    });
  }
  return out;
}

@Injectable()
export class FinancialQueryService {
  private readonly logger = new Logger(FinancialQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly tiered: TieredInvestmentsService,
    private readonly aiParser: AiParserService,
    private readonly accounts: AccountsService,
    private readonly loans: LoansService,
  ) {}

  async answer(userId: string, question: string): Promise<{ answer: string }> {
    const trimmed = question.trim();
    if (!trimmed) {
      throw new BadRequestException('La pregunta no puede estar vacía.');
    }
    try {
      const context = await this.buildContext(userId);
      const answer = await this.aiParser.composeFinancialInsightAnswer(trimmed, context);
      return { answer };
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ServiceUnavailableException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Financial insight failed: ${msg}`);
      throw new ServiceUnavailableException(
        'No pudimos generar tu insight ahora. Intenta de nuevo en unos momentos.',
      );
    }
  }

  private async buildContext(userId: string) {
    const since = new Date(Date.now() - NINETY_DAYS_MS);
    const [user, monthSummary, tiered, portfolioRows, txs, accountsRaw, installmentPlans, loansDash] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { defaultCurrency: true, timezone: true },
        }),
        this.dashboard.getSummary(userId, {}),
        this.tiered.getDashboard(userId),
        this.prisma.investmentPortfolio.findMany({
          where: { userId },
          select: {
            name: true,
            baseCurrency: true,
            positions: {
              select: {
                label: true,
                initialAmount: true,
                expectedAnnualReturnPct: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: since } },
          orderBy: { occurredAt: 'desc' },
          take: 500,
          include: {
            category: { select: { name: true, slug: true } },
            account: { select: { name: true } },
          },
        }),
        this.prisma.account.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
            currency: true,
            creditLimit: true,
            creditCard: {
              select: { closingDay: true, paymentDueDaysAfterClosing: true },
            },
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.installmentPlan.findMany({
          where: {
            status: InstallmentPlanStatus.ACTIVE,
            account: { userId },
          },
          include: {
            account: { select: { id: true, name: true, currency: true } },
            transaction: { select: { concept: true, occurredAt: true } },
          },
          orderBy: { startDate: 'asc' },
        }),
        this.loans.getDashboardSummary(userId),
      ]);

    const currency = (user?.defaultCurrency ?? 'MXN').toUpperCase().slice(0, 3);
    const tz = user?.timezone ?? 'UTC';

    const creditCards = accountsRaw.filter(
      (a) => a.type === AccountType.CREDIT_CARD && a.creditCard != null,
    );

    const statementRows = await Promise.all(
      creditCards.map(async (a) => {
        const summary = await this.accounts.getStatementSummary(userId, a.id);
        return { accountId: a.id, ...summary };
      }),
    );

    const creditCardDebtProjections = creditCards.map((a) => {
      const summary = statementRows.find((s) => s.accountId === a.id);
      return {
        accountId: a.id,
        accountName: a.name,
        currency: a.currency.toUpperCase().slice(0, 3),
        closingDay: a.creditCard!.closingDay,
        paymentDueDaysAfterClosing: a.creditCard!.paymentDueDaysAfterClosing,
        totalDebtOnCard: a.balance.toString(),
        creditLimit: a.creditLimit != null ? a.creditLimit.toString() : null,
        consumosDelMes: summary?.consumosDelMes ?? '0',
        mensualidadesActivas: summary?.mensualidadesActivas ?? '0',
        pagoParaNoGenerarIntereses: summary?.pagoParaNoGenerarIntereses ?? '0',
        statementPeriodFrom: summary?.periodFrom,
        statementPeriodThrough: summary?.periodThrough,
      };
    });

    const inBase = (cur: string) => cur.toUpperCase().slice(0, 3) === currency;

    let totalDebtCardsBase = new Prisma.Decimal(0);
    let totalPagoNoInteresesBase = new Prisma.Decimal(0);
    let totalMonthlyMsiBase = new Prisma.Decimal(0);
    for (const c of creditCardDebtProjections) {
      if (!inBase(c.currency)) continue;
      totalDebtCardsBase = totalDebtCardsBase.plus(new Prisma.Decimal(c.totalDebtOnCard));
      totalPagoNoInteresesBase = totalPagoNoInteresesBase.plus(
        new Prisma.Decimal(c.pagoParaNoGenerarIntereses),
      );
    }
    for (const p of installmentPlans) {
      if (!inBase(p.account.currency)) continue;
      totalMonthlyMsiBase = totalMonthlyMsiBase.plus(new Prisma.Decimal(p.monthlyAmount));
    }

    let totalLiquidBase = new Prisma.Decimal(0);
    for (const a of accountsRaw) {
      if (
        (a.type === AccountType.BANK || a.type === AccountType.WALLET || a.type === AccountType.CASH) &&
        inBase(a.currency)
      ) {
        totalLiquidBase = totalLiquidBase.plus(new Prisma.Decimal(a.balance));
      }
    }

    const activeInstallmentPlans = installmentPlans.map((p) => {
      const remainingInstallments = p.totalInstallments - p.currentInstallment + 1;
      const purchaseConcept = p.transaction?.concept?.trim() ?? '';
      const description = p.description?.trim() || purchaseConcept || 'Compra a meses';
      const remainingToPay = new Prisma.Decimal(p.monthlyAmount).times(remainingInstallments);
      return {
        id: p.id,
        description,
        purchaseConcept: purchaseConcept || undefined,
        creditCardAccountName: p.account.name,
        currency: p.account.currency.toUpperCase().slice(0, 3),
        totalAmount: p.totalAmount.toString(),
        monthlyAmount: p.monthlyAmount.toString(),
        totalInstallments: p.totalInstallments,
        currentInstallment: p.currentInstallment,
        remainingInstallments,
        remainingToPayApprox: remainingToPay.toString(),
        startDate: p.startDate.toISOString(),
        interestRate: p.interestRate.toString(),
      };
    });

    return {
      user: { defaultCurrency: currency, timezone: tz },
      currentMonthUTC: monthSummary.period,
      expensesAndIncomeThisMonth: {
        income: monthSummary.totals.income,
        expense: monthSummary.totals.expense,
        net: monthSummary.totals.net,
      },
      expensesByCategoryThisMonth: monthSummary.expensesByCategory,
      tieredInvestmentsSummary: {
        netLiquidBalance: tiered.netLiquidBalance,
        totalInvestedTiered: tiered.totalInvestedTiered,
        portfolioBlendedAnnualPct: tiered.portfolioBlendedAnnualPct,
        projectedEarningsNext24h: tiered.projectedEarningsNext24h,
        investments: tiered.investments.map((i) => ({
          name: i.name,
          principal: i.principal,
          currency: i.currency,
          effectiveAnnualPct: i.effectiveAnnualPct,
          dailyEstimatedEarnings: i.dailyEstimatedEarnings,
        })),
      },
      classicPortfolios: portfolioRows.map((p) => ({
        name: p.name,
        baseCurrency: p.baseCurrency,
        positions: p.positions.map((pos) => ({
          label: pos.label,
          initialAmount: pos.initialAmount.toString(),
          expectedAnnualReturnPct: pos.expectedAnnualReturnPct.toString(),
        })),
      })),
      accounts: accountsRaw.map((a) => ({
        name: a.name,
        type: a.type,
        balance: a.balance.toString(),
        currency: a.currency,
      })),
      creditCardDebtProjections,
      creditCardDebtAggregates: {
        defaultCurrency: currency,
        /** Suma de saldos deudores en tarjetas (misma moneda base). */
        totalDebtOnCreditCardsInDefaultCurrency: totalDebtCardsBase.toString(),
        /** Suma de "pago para no generar intereses" del periodo de estado de cuenta actual (misma moneda base). */
        totalPagoParaNoGenerarInteresesInDefaultCurrency: totalPagoNoInteresesBase.toString(),
        /** Suma de mensualidades MSI activas en moneda base (para proyecciones de flujo). */
        sumMonthlyActiveMsiInDefaultCurrency: totalMonthlyMsiBase.toString(),
      },
      liquiditySummary: {
        defaultCurrency: currency,
        totalLiquidBalance: totalLiquidBase.toString(),
        note:
          'Suma de cuentas BANK, WALLET y CASH en la moneda base; no incluye saldo de tarjetas.',
      },
      activeInstallmentPlans,
      fixedTermLoans: {
        summary: loansDash.aggregate,
        loans: loansDash.loans.map((l) => ({
          id: l.id,
          name: l.name,
          kind: l.kind,
          currency: l.currency,
          totalAmount: l.totalAmount,
          currentBalance: l.currentBalance,
          principalPaid: l.principalPaid,
          percentPrincipalPaid: l.percentPrincipalPaid,
          cumulativeInterestPaid: l.cumulativeInterestPaid,
          monthlyPayment: l.monthlyPayment,
          interestRateAnnual: l.interestRateAnnual,
          termMonths: l.termMonths,
          status: l.status,
        })),
        prepaymentScenarios: loansDash.prepaymentScenarios,
        /** Tabla contractual (francés): equity, reparto interés/capital del periodo, fecha de libertad y comparación verde vs rojo. */
        loanAmortizationCoach: buildLoanAmortizationCoach(loansDash.loans),
      },
      recentTransactions90Days: txs.map((t) => ({
        occurredAt: t.occurredAt.toISOString(),
        type: t.type,
        amount: t.amount.toString(),
        currency: t.currency,
        concept: t.concept,
        categoryName: t.category.name,
        categorySlug: t.category.slug,
        accountName: t.account.name,
      })),
    };
  }
}
