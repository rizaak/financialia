import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayoutFrequency,
  Prisma,
  TieredInvestmentTxType,
  TransactionSource,
  TransactionType,
} from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvestmentCalculatorService,
  type CalculatorTierInput,
} from './investment-calculator.service';
import type { CreateInvestmentStrategyDto } from './dto/tiered/create-strategy.dto';
import type { CreateInvestmentTierDto } from './dto/tiered/create-tier.dto';
import type { CreateTieredInvestmentDto } from './dto/tiered/create-tiered-investment.dto';
import type { DepositTieredInvestmentDto } from './dto/tiered/deposit-tiered.dto';

const INTEREST_INCOME_SLUG = 'intereses-inversion';

export type TieredDashboardInvestmentRow = {
  id: string;
  name: string;
  principal: string;
  currency: string;
  payoutFrequency: PayoutFrequency;
  autoReinvest: boolean;
  effectiveAnnualPct: string;
  dailyEstimatedEarnings: string;
  tierProgressMessage: string;
  tierProgress01: number;
  currentTierSortOrder: number | null;
};

export type TieredDashboardResponse = {
  netLiquidBalance: string;
  totalInvestedTiered: string;
  portfolioBlendedAnnualPct: string;
  projectedEarningsNext24h: string;
  investments: TieredDashboardInvestmentRow[];
};

@Injectable()
export class TieredInvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InvestmentCalculatorService,
    private readonly accounts: AccountsService,
  ) {}

  async createStrategy(userId: string, dto: CreateInvestmentStrategyDto) {
    return this.prisma.investmentStrategy.create({
      data: { userId, name: dto.name.trim() },
    });
  }

  async listStrategies(userId: string) {
    return this.prisma.investmentStrategy.findMany({
      where: { userId },
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTier(userId: string, strategyId: string, dto: CreateInvestmentTierDto) {
    await this.ensureStrategyOwned(strategyId, userId);
    const tier = await this.prisma.investmentTier.create({
      data: {
        strategyId,
        sortOrder: dto.sortOrder,
        upperLimit:
          dto.upperLimit === undefined || dto.upperLimit === null
            ? null
            : new Prisma.Decimal(dto.upperLimit),
        annualRatePct: new Prisma.Decimal(dto.annualRatePct),
      },
    });
    await this.recalcAllInvestmentsForStrategy(strategyId);
    return tier;
  }

  async createInvestment(userId: string, dto: CreateTieredInvestmentDto) {
    await this.ensureStrategyOwned(dto.strategyId, userId);
    const tierCount = await this.prisma.investmentTier.count({
      where: { strategyId: dto.strategyId },
    });
    if (tierCount === 0) {
      throw new BadRequestException('La estrategia debe tener al menos un tramo.');
    }

    const origin = await this.accounts.assertAccountForUser(dto.originAccountId, userId);
    const invCur = (dto.currency ?? origin.currency).toUpperCase().slice(0, 3);
    if (origin.currency !== invCur) {
      throw new BadRequestException('La moneda de la inversión debe coincidir con la cuenta origen.');
    }
    if (dto.interestDestinationAccountId) {
      const dest = await this.accounts.assertAccountForUser(
        dto.interestDestinationAccountId,
        userId,
      );
      if (dest.currency !== invCur) {
        throw new BadRequestException(
          'La cuenta destino de intereses debe usar la misma moneda que la inversión.',
        );
      }
    }

    const amount = new Prisma.Decimal(dto.initialDeposit);
    const inv = await this.prisma.$transaction(async (tx) => {
      const dec = amount;
      await this.accounts.debitInTx(tx, dto.originAccountId, userId, dec);

      const row = await tx.tieredInvestment.create({
        data: {
          userId,
          strategyId: dto.strategyId,
          originAccountId: dto.originAccountId,
          interestDestinationAccountId: dto.interestDestinationAccountId ?? null,
          name: dto.name.trim(),
          principal: dec,
          currency: invCur,
          payoutFrequency: dto.payoutFrequency,
          autoReinvest: dto.autoReinvest ?? false,
        },
      });

      await tx.investmentTransaction.create({
        data: {
          investmentId: row.id,
          userId,
          type: TieredInvestmentTxType.DEPOSIT,
          amount: dec,
          notes: 'Apertura',
        },
      });

      return row;
    });

    await this.refreshMetrics(inv.id);
    return this.prisma.tieredInvestment.findUniqueOrThrow({
      where: { id: inv.id },
      include: { strategy: { include: { tiers: true } } },
    });
  }

  async deposit(userId: string, investmentId: string, dto: DepositTieredInvestmentDto) {
    const invRow = await this.prisma.tieredInvestment.findFirst({
      where: { id: investmentId, userId },
      include: { originAccount: true },
    });
    if (!invRow) {
      throw new NotFoundException('Inversión no encontrada');
    }

    const fromAccountId = dto.fromAccountId ?? invRow.originAccountId;
    const acc = await this.accounts.assertAccountForUser(fromAccountId, userId);
    if (acc.currency !== invRow.currency) {
      throw new BadRequestException('La cuenta del aporte debe tener la misma moneda que la inversión.');
    }

    const dec = new Prisma.Decimal(dto.amount);

    await this.prisma.$transaction(async (tx) => {
      await this.accounts.debitInTx(tx, fromAccountId, userId, dec);

      await tx.tieredInvestment.update({
        where: { id: investmentId },
        data: { principal: { increment: dec } },
      });

      await tx.investmentTransaction.create({
        data: {
          investmentId,
          userId,
          type: TieredInvestmentTxType.DEPOSIT,
          amount: dec,
          notes: 'Aporte',
        },
      });
    });

    await this.refreshMetrics(investmentId);
    return this.prisma.tieredInvestment.findUniqueOrThrow({
      where: { id: investmentId },
      include: { strategy: { include: { tiers: true } } },
    });
  }

  async setAutoReinvest(userId: string, investmentId: string, autoReinvest: boolean) {
    await this.ensureInvestmentOwned(investmentId, userId);
    return this.prisma.tieredInvestment.update({
      where: { id: investmentId },
      data: { autoReinvest },
    });
  }

  /**
   * Acumula un día de interés nominal: reinvierte en principal o acredita en la cuenta destino.
   */
  async accrueOneDayInterest(userId: string, investmentId: string) {
    await this.ensureInvestmentOwned(investmentId, userId);
    const inv = await this.prisma.tieredInvestment.findUniqueOrThrow({
      where: { id: investmentId },
      include: {
        strategy: { include: { tiers: { orderBy: { sortOrder: 'asc' } } } },
        originAccount: true,
      },
    });

    const principal = new Prisma.Decimal(inv.principal);
    if (principal.lte(0)) {
      return inv;
    }

    const tiers = this.mapTiers(inv.strategy.tiers);
    const blend = this.calculator.blendPrincipalAcrossTiers(Number(principal), tiers);
    const daily = new Prisma.Decimal(blend.dailyEstimatedEarnings.toFixed(8));
    if (daily.lte(0)) {
      return inv;
    }

    await this.prisma.$transaction(async (tx) => {
      if (inv.autoReinvest) {
        await tx.tieredInvestment.update({
          where: { id: investmentId },
          data: { principal: { increment: daily } },
        });
        await tx.investmentTransaction.create({
          data: {
            investmentId,
            userId,
            type: TieredInvestmentTxType.INTEREST_REINVEST,
            amount: daily,
            notes: 'Interés reinvertido (1 día)',
          },
        });
      } else {
        const destAccountId =
          inv.interestDestinationAccountId ?? inv.originAccountId;
        const categoryId = await this.resolveInterestCategoryId(tx, userId);
        const fin = await tx.transaction.create({
          data: {
            userId,
            accountId: destAccountId,
            categoryId,
            type: TransactionType.INCOME,
            amount: daily,
            currency: inv.currency,
            concept: `Intereses: ${inv.name}`,
            source: TransactionSource.MANUAL,
            occurredAt: new Date(),
          },
        });
        await this.accounts.creditInTx(tx, destAccountId, userId, daily);
        await tx.investmentTransaction.create({
          data: {
            investmentId,
            userId,
            type: TieredInvestmentTxType.INTEREST_PAYOUT_TO_CASH,
            amount: daily,
            linkedTransactionId: fin.id,
            notes: 'Interés a efectivo (1 día)',
          },
        });
      }
    });

    await this.refreshMetrics(investmentId);
    return this.prisma.tieredInvestment.findUniqueOrThrow({
      where: { id: investmentId },
      include: { strategy: { include: { tiers: true } } },
    });
  }

  async getDashboard(userId: string): Promise<TieredDashboardResponse> {
    const summary = await this.accounts.getSummary(userId);

    const list = await this.prisma.tieredInvestment.findMany({
      where: { userId },
      include: { strategy: { include: { tiers: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'asc' },
    });

    let totalInv = new Prisma.Decimal(0);
    let projected24h = new Prisma.Decimal(0);
    const legs: { principal: number; effectiveAnnualPct: number }[] = [];
    const rows: TieredDashboardInvestmentRow[] = [];

    for (const inv of list) {
      const p = new Prisma.Decimal(inv.principal);
      totalInv = totalInv.plus(p);
      const tiers = this.mapTiers(inv.strategy.tiers);
      const blend = this.calculator.blendPrincipalAcrossTiers(Number(p), tiers);
      const dailyDec = new Prisma.Decimal(blend.dailyEstimatedEarnings.toFixed(8));
      projected24h = projected24h.plus(dailyDec);
      legs.push({
        principal: Number(p),
        effectiveAnnualPct: blend.averageAnnualPct,
      });

      const ui = this.calculator.tierProgressForUi(Number(p), tiers);
      rows.push({
        id: inv.id,
        name: inv.name,
        principal: p.toString(),
        currency: inv.currency,
        payoutFrequency: inv.payoutFrequency,
        autoReinvest: inv.autoReinvest,
        effectiveAnnualPct: blend.averageAnnualPct.toFixed(4),
        dailyEstimatedEarnings: dailyDec.toString(),
        tierProgressMessage: ui.message,
        tierProgress01: ui.progressInCurrentTier,
        currentTierSortOrder: ui.currentTierSortOrder,
      });
    }

    const blended = this.calculator.portfolioBlendedAnnualPct(legs);

    return {
      netLiquidBalance: summary.totalLiquid,
      totalInvestedTiered: totalInv.toString(),
      portfolioBlendedAnnualPct: blended.toFixed(4),
      projectedEarningsNext24h: projected24h.toString(),
      investments: rows,
    };
  }

  async listTieredInvestments(userId: string) {
    return this.prisma.tieredInvestment.findMany({
      where: { userId },
      include: { strategy: { include: { tiers: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async refreshMetrics(investmentId: string): Promise<void> {
    const inv = await this.prisma.tieredInvestment.findUnique({
      where: { id: investmentId },
      include: { strategy: { include: { tiers: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!inv) {
      return;
    }
    const p = Number(inv.principal);
    const tiers = this.mapTiers(inv.strategy.tiers);
    const blend = this.calculator.blendPrincipalAcrossTiers(p, tiers);
    await this.prisma.tieredInvestment.update({
      where: { id: investmentId },
      data: {
        effectiveAnnualPct: new Prisma.Decimal(blend.averageAnnualPct.toFixed(6)),
        dailyEstimatedEarnings: new Prisma.Decimal(blend.dailyEstimatedEarnings.toFixed(8)),
      },
    });
  }

  private async recalcAllInvestmentsForStrategy(strategyId: string): Promise<void> {
    const ids = await this.prisma.tieredInvestment.findMany({
      where: { strategyId },
      select: { id: true },
    });
    for (const { id } of ids) {
      await this.refreshMetrics(id);
    }
  }

  private mapTiers(
    tiers: Array<{
      sortOrder: number;
      upperLimit: Prisma.Decimal | null;
      annualRatePct: Prisma.Decimal;
    }>,
  ): CalculatorTierInput[] {
    return tiers.map((t) => ({
      sortOrder: t.sortOrder,
      upperLimit: t.upperLimit === null ? null : Number(t.upperLimit),
      annualRatePct: Number(t.annualRatePct),
    }));
  }

  private async ensureStrategyOwned(strategyId: string, userId: string): Promise<void> {
    const s = await this.prisma.investmentStrategy.findFirst({
      where: { id: strategyId, userId },
    });
    if (!s) {
      throw new NotFoundException('Estrategia no encontrada');
    }
  }

  private async ensureInvestmentOwned(investmentId: string, userId: string): Promise<void> {
    const i = await this.prisma.tieredInvestment.findFirst({
      where: { id: investmentId, userId },
    });
    if (!i) {
      throw new NotFoundException('Inversión no encontrada');
    }
  }

  private async resolveInterestCategoryId(
    tx: Pick<PrismaService, 'category' | 'transaction'>,
    userId: string,
  ): Promise<string> {
    const c = await tx.category.findFirst({
      where: {
        userId,
        slug: INTEREST_INCOME_SLUG,
        kind: TransactionType.INCOME,
        isArchived: false,
      },
    });
    if (!c) {
      throw new BadRequestException(
        `Falta la categoría de ingreso "${INTEREST_INCOME_SLUG}". Cierra sesión y entra de nuevo para sembrar categorías.`,
      );
    }
    return c.id;
  }
}
