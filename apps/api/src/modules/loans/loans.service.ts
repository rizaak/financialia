import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { CreateLoanDto } from './dto/create-loan.dto';
import { PrepaymentStrategy } from './dto/simulate-extra-payment.dto';
import type { RecordLoanPaymentDto } from './dto/record-loan-payment.dto';
import type { UpdateLoanDto } from './dto/update-loan.dto';
import {
  calculateAmortizationTable as buildAmortizationTableRows,
  calculateFixedMonthlyPayment,
  simulateFutureWithFixedPayment,
  totalInterestOverFixedTerm,
} from './loan-amortization.engine';

const SUM_EPS = new Prisma.Decimal('0.02');

/** Fecha estimada de fin: hoy + N meses (UTC, mismo día del mes cuando sea posible). */
function addMonthsFromNow(months: number): Date {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + months;
  const day = now.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayC = Math.min(day, lastDay);
  return new Date(Date.UTC(y, m, dayC, 12, 0, 0, 0));
}

function toDec(n: number): Prisma.Decimal {
  return new Prisma.Decimal(String(n));
}

function addMonthsFromStart(start: Date, months: number): Date {
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + months;
  const day = start.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dayC = Math.min(day, lastDay);
  return new Date(Date.UTC(y, m, dayC, 12, 0, 0, 0));
}

function assertBreakdownMatchesAmount(
  amount: Prisma.Decimal,
  principal: Prisma.Decimal,
  interest: Prisma.Decimal,
  insurance: Prisma.Decimal,
): void {
  const sum = principal.plus(interest).plus(insurance);
  const diff = sum.minus(amount).abs();
  if (diff.gt(SUM_EPS)) {
    throw new BadRequestException(
      'El desglose (capital + interés + seguros) debe coincidir con el monto total del pago.',
    );
  }
}

export type LoanSummaryRow = {
  id: string;
  kind: string;
  name: string;
  totalAmount: string;
  currentBalance: string;
  interestRateAnnual: string;
  termMonths: number;
  monthlyPayment: string;
  startDate: string;
  currency: string;
  status: string;
  principalPaid: string;
  percentPrincipalPaid: number;
  cumulativeInterestPaid: string;
  cumulativeInsurancePaid: string;
};

export type LoansDashboardSummaryResponse = {
  loans: LoanSummaryRow[];
  aggregate: {
    totalPrincipalRemaining: string;
    totalCumulativeInterestPaid: string;
    totalCumulativeInsurancePaid: string;
    monthlyDebtService: string;
  };
  /** Escenarios de abono a capital para la IA (misma moneda por préstamo). */
  prepaymentScenarios: Array<{
    loanId: string;
    name: string;
    kind: string;
    currency: string;
    candidates: Array<{
      extraPrincipal: string;
      monthsSavedApprox: number;
      interestSavedApprox: string;
    }>;
  }>;
};

export type ExtraPrincipalPreview = {
  monthsSavedApprox: number;
  interestSavedApprox: string;
  baselineMonthsRemaining: number;
  scenarioMonthsRemaining: number;
};

/** Simulación de abono a capital (francés: PMT estándar o cuota almacenada según escenario). */
export type ExtraPaymentSimulation = {
  loanId: string;
  currency: string;
  extraAmount: string;
  strategy: PrepaymentStrategy;
  amortizationMethod: 'FRENCH_FIXED_PAYMENT';
  simulationAsOf: string;
  originalContractEndApprox: string;
  withoutExtra: {
    monthsRemaining: number;
    totalInterestFuture: string;
    estimatedPayoffDate: string;
  };
  withExtra: {
    monthsRemaining: number;
    totalInterestFuture: string;
    estimatedPayoffDate: string;
    /** Solo REDUCE_PAYMENT: nueva cuota mensual teórica. */
    newMonthlyPayment?: string;
  };
  savings: {
    totalInterestSaved: string;
    monthsSaved: number;
    newEndDate: string;
  };
};

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tabla de amortización teórica del contrato (capital original, tasa y plazo).
   */
  calculateAmortizationTable(
    principal: Prisma.Decimal,
    annualRate: Prisma.Decimal,
    termMonths: number,
  ) {
    const payment = calculateFixedMonthlyPayment(principal, annualRate, termMonths);
    return {
      fixedMonthlyPayment: payment.toString(),
      rows: buildAmortizationTableRows(principal, annualRate, termMonths),
    };
  }

  async getAmortizationScheduleForLoan(userId: string, loanId: string) {
    const loan = await this.getOne(userId, loanId);
    const table = this.calculateAmortizationTable(
      loan.totalAmount,
      loan.interestRateAnnual,
      loan.termMonths,
    );
    return {
      loanId: loan.id,
      name: loan.name,
      currency: loan.currency.toUpperCase().slice(0, 3),
      principal: loan.totalAmount.toString(),
      annualRate: loan.interestRateAnnual.toString(),
      termMonths: loan.termMonths,
      ...table,
    };
  }

  async create(userId: string, dto: CreateLoanDto) {
    const total = toDec(dto.totalAmount);
    const current =
      dto.currentBalance != null ? toDec(dto.currentBalance) : total;
    if (current.gt(total)) {
      throw new BadRequestException('El saldo actual no puede superar el monto original.');
    }
    const cur = (dto.currency ?? 'MXN').toUpperCase().slice(0, 3);

    return this.prisma.loan.create({
      data: {
        userId,
        kind: dto.kind,
        name: dto.name.trim(),
        totalAmount: total,
        currentBalance: current,
        interestRateAnnual: toDec(dto.interestRateAnnual),
        termMonths: dto.termMonths,
        monthlyPayment: toDec(dto.monthlyPayment),
        startDate: new Date(dto.startDate),
        currency: cur,
      },
    });
  }

  async list(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getOne(userId: string, loanId: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, userId },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado.');
    return loan;
  }

  async update(userId: string, loanId: string, dto: UpdateLoanDto) {
    await this.getOne(userId, loanId);
    const data: Prisma.LoanUpdateInput = {};
    if (dto.name != null) data.name = dto.name.trim();
    if (dto.kind != null) data.kind = dto.kind;
    if (dto.totalAmount != null) data.totalAmount = toDec(dto.totalAmount);
    if (dto.currentBalance != null) data.currentBalance = toDec(dto.currentBalance);
    if (dto.interestRateAnnual != null) {
      data.interestRateAnnual = toDec(dto.interestRateAnnual);
    }
    if (dto.termMonths != null) data.termMonths = dto.termMonths;
    if (dto.monthlyPayment != null) data.monthlyPayment = toDec(dto.monthlyPayment);
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.currency != null) data.currency = dto.currency.toUpperCase().slice(0, 3);
    if (dto.status != null) data.status = dto.status;

    return this.prisma.loan.update({
      where: { id: loanId },
      data,
    });
  }

  async recordPayment(userId: string, loanId: string, dto: RecordLoanPaymentDto) {
    const loan = await this.getOne(userId, loanId);
    if (loan.status === LoanStatus.PAID_OFF) {
      throw new BadRequestException('Este préstamo ya está liquidado.');
    }

    const amount = toDec(dto.amount);
    const principalFromInstallment = toDec(dto.breakdown.principal);
    const interest = toDec(dto.breakdown.interest);
    const insurance = toDec(dto.breakdown.insurance);
    assertBreakdownMatchesAmount(amount, principalFromInstallment, interest, insurance);

    const extraToPrincipal = toDec(dto.extraToPrincipal ?? 0);
    const totalCapitalApplied = principalFromInstallment.plus(extraToPrincipal);

    if (totalCapitalApplied.gt(loan.currentBalance)) {
      throw new BadRequestException(
        'El capital total (mensualidad + abono extra) no puede superar el saldo pendiente.',
      );
    }

    const totalPaid = amount.plus(extraToPrincipal);

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.loanPayment.create({
        data: {
          loanId,
          userId,
          totalAmount: totalPaid,
          principalAmount: totalCapitalApplied,
          interestAmount: interest,
          insuranceAmount: insurance,
          paidAt,
          notes: dto.notes?.trim() || null,
        },
      });

      const nextBal = loan.currentBalance.minus(totalCapitalApplied);
      const clamped = nextBal.lt(0) ? new Prisma.Decimal(0) : nextBal;
      const paidOff = clamped.lte(0.01);

      return tx.loan.update({
        where: { id: loanId },
        data: {
          currentBalance: clamped,
          ...(paidOff ? { status: LoanStatus.PAID_OFF } : {}),
        },
      });
    });
  }

  /**
   * Simula abono a capital: REDUCE_TERM (cuota fija, acorta plazo) o REDUCE_PAYMENT (plazo fijo, baja cuota).
   */
  async simulateExtraPayment(
    userId: string,
    loanId: string,
    extraAmount: number,
    strategy: PrepaymentStrategy = PrepaymentStrategy.REDUCE_TERM,
  ): Promise<ExtraPaymentSimulation> {
    if (!Number.isFinite(extraAmount) || extraAmount <= 0) {
      throw new BadRequestException('Indica un abono a capital positivo.');
    }
    const loan = await this.getOne(userId, loanId);
    if (loan.status === LoanStatus.PAID_OFF) {
      throw new BadRequestException('El préstamo ya está liquidado.');
    }
    const extra = toDec(extraAmount);
    if (extra.gt(loan.currentBalance)) {
      throw new BadRequestException('El abono no puede superar el saldo pendiente.');
    }

    const baseline = simulateFutureWithFixedPayment(
      loan.currentBalance,
      loan.monthlyPayment,
      loan.interestRateAnnual,
    );

    const start = loan.startDate;
    const originalEnd = addMonthsFromStart(start, loan.termMonths);
    const asOf = new Date();

    const newBal = loan.currentBalance.minus(extra);

    if (strategy === PrepaymentStrategy.REDUCE_PAYMENT) {
      const M = baseline.months;
      if (M <= 0 || newBal.lte(0.01)) {
        const payoff = addMonthsFromNow(0).toISOString();
        return {
          loanId: loan.id,
          currency: loan.currency.toUpperCase().slice(0, 3),
          extraAmount: extra.toString(),
          strategy: PrepaymentStrategy.REDUCE_PAYMENT,
          amortizationMethod: 'FRENCH_FIXED_PAYMENT',
          simulationAsOf: asOf.toISOString(),
          originalContractEndApprox: originalEnd.toISOString(),
          withoutExtra: {
            monthsRemaining: baseline.months,
            totalInterestFuture: baseline.totalInterest.toString(),
            estimatedPayoffDate: addMonthsFromNow(baseline.months).toISOString(),
          },
          withExtra: {
            monthsRemaining: 0,
            totalInterestFuture: '0',
            estimatedPayoffDate: payoff,
            newMonthlyPayment: '0',
          },
          savings: {
            totalInterestSaved: baseline.totalInterest.toString(),
            monthsSaved: baseline.months,
            newEndDate: payoff,
          },
        };
      }

      const PNew = calculateFixedMonthlyPayment(newBal, loan.interestRateAnnual, M);
      const interestScenario = totalInterestOverFixedTerm(
        newBal,
        PNew,
        loan.interestRateAnnual,
        M,
      );
      const interestSaved = baseline.totalInterest.minus(interestScenario);
      const endDate = addMonthsFromNow(M).toISOString();

      return {
        loanId: loan.id,
        currency: loan.currency.toUpperCase().slice(0, 3),
        extraAmount: extra.toString(),
        strategy: PrepaymentStrategy.REDUCE_PAYMENT,
        amortizationMethod: 'FRENCH_FIXED_PAYMENT',
        simulationAsOf: asOf.toISOString(),
        originalContractEndApprox: originalEnd.toISOString(),
        withoutExtra: {
          monthsRemaining: baseline.months,
          totalInterestFuture: baseline.totalInterest.toString(),
          estimatedPayoffDate: endDate,
        },
        withExtra: {
          monthsRemaining: M,
          totalInterestFuture: interestScenario.toString(),
          estimatedPayoffDate: endDate,
          newMonthlyPayment: PNew.toString(),
        },
        savings: {
          totalInterestSaved: interestSaved.gte(0) ? interestSaved.toString() : '0',
          monthsSaved: 0,
          newEndDate: endDate,
        },
      };
    }

    const scenario = simulateFutureWithFixedPayment(
      newBal,
      loan.monthlyPayment,
      loan.interestRateAnnual,
    );

    const interestSaved = baseline.totalInterest.minus(scenario.totalInterest);
    const monthsReduced = Math.max(0, baseline.months - scenario.months);
    const newEnd = addMonthsFromNow(scenario.months).toISOString();

    return {
      loanId: loan.id,
      currency: loan.currency.toUpperCase().slice(0, 3),
      extraAmount: extra.toString(),
      strategy: PrepaymentStrategy.REDUCE_TERM,
      amortizationMethod: 'FRENCH_FIXED_PAYMENT',
      simulationAsOf: asOf.toISOString(),
      originalContractEndApprox: originalEnd.toISOString(),
      withoutExtra: {
        monthsRemaining: baseline.months,
        totalInterestFuture: baseline.totalInterest.toString(),
        estimatedPayoffDate: addMonthsFromNow(baseline.months).toISOString(),
      },
      withExtra: {
        monthsRemaining: scenario.months,
        totalInterestFuture: scenario.totalInterest.toString(),
        estimatedPayoffDate: newEnd,
      },
      savings: {
        totalInterestSaved: interestSaved.gte(0) ? interestSaved.toString() : '0',
        monthsSaved: monthsReduced,
        newEndDate: newEnd,
      },
    };
  }

  async previewExtraPrincipal(
    userId: string,
    loanId: string,
    extraPrincipal: number,
  ): Promise<ExtraPrincipalPreview> {
    if (!Number.isFinite(extraPrincipal) || extraPrincipal <= 0) {
      throw new BadRequestException('Indica un abono a capital positivo.');
    }
    const loan = await this.getOne(userId, loanId);
    if (loan.status === LoanStatus.PAID_OFF) {
      throw new BadRequestException('El préstamo ya está liquidado.');
    }
    return this.computeExtraPreview(loan, toDec(extraPrincipal));
  }

  private computeExtraPreview(
    loan: {
      currentBalance: Prisma.Decimal;
      monthlyPayment: Prisma.Decimal;
      interestRateAnnual: Prisma.Decimal;
    },
    extra: Prisma.Decimal,
  ): ExtraPrincipalPreview {
    if (extra.gt(loan.currentBalance)) {
      throw new BadRequestException('El abono no puede superar el saldo pendiente.');
    }
    const baseline = simulateFutureWithFixedPayment(
      loan.currentBalance,
      loan.monthlyPayment,
      loan.interestRateAnnual,
    );
    const scenario = simulateFutureWithFixedPayment(
      loan.currentBalance.minus(extra),
      loan.monthlyPayment,
      loan.interestRateAnnual,
    );
    const monthsSaved = Math.max(0, baseline.months - scenario.months);
    const interestSaved = baseline.totalInterest.minus(scenario.totalInterest);
    return {
      monthsSavedApprox: monthsSaved,
      interestSavedApprox: interestSaved.gte(0) ? interestSaved.toString() : '0',
      baselineMonthsRemaining: baseline.months,
      scenarioMonthsRemaining: scenario.months,
    };
  }

  async getDashboardSummary(userId: string): Promise<LoansDashboardSummaryResponse> {
    const loans = await this.prisma.loan.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });

    const loanIds = loans.map((l) => l.id);
    const agg =
      loanIds.length === 0
        ? []
        : await this.prisma.loanPayment.groupBy({
            by: ['loanId'],
            where: { userId, loanId: { in: loanIds } },
            _sum: {
              interestAmount: true,
              insuranceAmount: true,
            },
          });

    const aggByLoan = new Map(
      agg.map((a) => [
        a.loanId,
        {
          interest: a._sum.interestAmount ?? new Prisma.Decimal(0),
          insurance: a._sum.insuranceAmount ?? new Prisma.Decimal(0),
        },
      ]),
    );

    let totalPrincipalRemaining = new Prisma.Decimal(0);
    let totalInterest = new Prisma.Decimal(0);
    let totalInsurance = new Prisma.Decimal(0);
    let monthlyDebtService = new Prisma.Decimal(0);

    const rows: LoanSummaryRow[] = [];
    const prepaymentScenarios: LoansDashboardSummaryResponse['prepaymentScenarios'] = [];

    for (const l of loans) {
      const sums = aggByLoan.get(l.id) ?? {
        interest: new Prisma.Decimal(0),
        insurance: new Prisma.Decimal(0),
      };
      const totalAmt = l.totalAmount;
      const paidPrincipal = totalAmt.minus(l.currentBalance);
      const pct =
        totalAmt.gt(0)
          ? Number(paidPrincipal.div(totalAmt).mul(100).toFixed(2))
          : 0;

      totalPrincipalRemaining = totalPrincipalRemaining.plus(l.currentBalance);
      totalInterest = totalInterest.plus(sums.interest);
      totalInsurance = totalInsurance.plus(sums.insurance);
      if (l.status === LoanStatus.ACTIVE) {
        monthlyDebtService = monthlyDebtService.plus(l.monthlyPayment);
      }

      rows.push({
        id: l.id,
        kind: l.kind,
        name: l.name,
        totalAmount: l.totalAmount.toString(),
        currentBalance: l.currentBalance.toString(),
        interestRateAnnual: l.interestRateAnnual.toString(),
        termMonths: l.termMonths,
        monthlyPayment: l.monthlyPayment.toString(),
        startDate: l.startDate.toISOString(),
        currency: l.currency.toUpperCase().slice(0, 3),
        status: l.status,
        principalPaid: paidPrincipal.toString(),
        percentPrincipalPaid: Math.min(100, Math.max(0, pct)),
        cumulativeInterestPaid: sums.interest.toString(),
        cumulativeInsurancePaid: sums.insurance.toString(),
      });

      if (l.status === LoanStatus.ACTIVE && l.currentBalance.gt(0)) {
        const extras = [5000, 10000, 25000].filter((n) => toDec(n).lt(l.currentBalance));
        const candidates = extras.map((n) => {
          const p = this.computeExtraPreview(l, toDec(n));
          return {
            extraPrincipal: String(n),
            monthsSavedApprox: p.monthsSavedApprox,
            interestSavedApprox: p.interestSavedApprox,
          };
        });
        if (candidates.length > 0) {
          prepaymentScenarios.push({
            loanId: l.id,
            name: l.name,
            kind: l.kind,
            currency: l.currency.toUpperCase().slice(0, 3),
            candidates,
          });
        }
      }
    }

    return {
      loans: rows,
      aggregate: {
        totalPrincipalRemaining: totalPrincipalRemaining.toString(),
        totalCumulativeInterestPaid: totalInterest.toString(),
        totalCumulativeInsurancePaid: totalInsurance.toString(),
        monthlyDebtService: monthlyDebtService.toString(),
      },
      prepaymentScenarios,
    };
  }
}
