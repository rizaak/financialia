import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InvestmentPositionKind,
  Prisma,
  type InvestmentPortfolio,
  type InvestmentPosition,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import type { CreatePortfolioDto } from './dto/create-portfolio.dto';
import type { CreatePositionDto } from './dto/create-position.dto';
import {
  TieredInvestmentsService,
  type TieredDashboardResponse,
} from './tiered-investments.service';

export type PositionProjection = {
  id: string;
  label: string;
  initialAmount: string;
  expectedAnnualReturnPct: string;
  projectedValueAfter1y: string;
  growthPctVsInitial: string;
  kind: InvestmentPositionKind;
  maturityDate: string | null;
  agreedAnnualRatePct: string | null;
  marketValue: string | null;
  /** Plusvalía % vs capital inicial cuando hay valor de mercado (renta variable). */
  unrealizedPlPct: string | null;
};

export type PortfolioOverview = {
  id: string;
  name: string;
  baseCurrency: string;
  totals: {
    initial: string;
    projectedAfter1y: string;
  };
  positions: PositionProjection[];
};

export type InvestmentsOverviewResponse = {
  portfolios: PortfolioOverview[];
  grandTotals: {
    initial: string;
    projectedAfter1y: string;
  };
};

/** Vista agregada: inversiones por tramos (ganancia diaria estimada) + portafolios clásicos. */
export type InvestmentsSummaryResponse = {
  defaultCurrency: string;
  tiered: TieredDashboardResponse;
  portfolios: InvestmentsOverviewResponse;
};

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiered: TieredInvestmentsService,
  ) {}

  async listPortfolios(userId: string): Promise<
    Array<
      InvestmentPortfolio & {
        positions: InvestmentPosition[];
      }
    >
  > {
    return this.prisma.investmentPortfolio.findMany({
      where: { userId },
      include: { positions: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPortfolio(userId: string, dto: CreatePortfolioDto): Promise<InvestmentPortfolio> {
    return this.prisma.investmentPortfolio.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        baseCurrency: dto.baseCurrency ?? 'MXN',
      },
    });
  }

  async createPosition(
    portfolioId: string,
    userId: string,
    dto: CreatePositionDto,
  ): Promise<InvestmentPosition> {
    await this.ensurePortfolioOwned(portfolioId, userId);
    const kind = dto.kind ?? InvestmentPositionKind.VARIABLE;
    if (kind === InvestmentPositionKind.FIXED_TERM) {
      if (!dto.maturityDate || dto.agreedAnnualRatePct == null) {
        throw new BadRequestException('Plazo fijo requiere fecha de vencimiento y tasa pactada.');
      }
    }

    return this.prisma.investmentPosition.create({
      data: {
        portfolioId,
        label: dto.label,
        initialAmount: new Prisma.Decimal(dto.initialAmount),
        expectedAnnualReturnPct: new Prisma.Decimal(dto.expectedAnnualReturnPct),
        notes: dto.notes,
        kind,
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : undefined,
        agreedAnnualRatePct:
          dto.agreedAnnualRatePct != null ? new Prisma.Decimal(dto.agreedAnnualRatePct) : undefined,
        marketValue: dto.marketValue != null ? new Prisma.Decimal(dto.marketValue) : undefined,
      },
    });
  }

  async recordMarketValue(userId: string, positionId: string, marketValue: number) {
    await this.ensurePositionOwned(positionId, userId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.investmentPosition.update({
        where: { id: positionId },
        data: { marketValue: new Prisma.Decimal(marketValue) },
      });
      await tx.investmentPositionValueSnapshot.create({
        data: {
          positionId,
          marketValue: new Prisma.Decimal(marketValue),
        },
      });
      return updated;
    });
  }

  async listPositionValueHistory(userId: string, positionId: string) {
    await this.ensurePositionOwned(positionId, userId);
    return this.prisma.investmentPositionValueSnapshot.findMany({
      where: { positionId },
      orderBy: { recordedAt: 'asc' },
      take: 400,
    });
  }

  getOverview(userId: string): Promise<InvestmentsOverviewResponse> {
    return this.buildOverview(userId);
  }

  async getAggregatedSummary(userId: string): Promise<InvestmentsSummaryResponse> {
    const [tiered, overview, user] = await Promise.all([
      this.tiered.getDashboard(userId),
      this.buildOverview(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { defaultCurrency: true },
      }),
    ]);
    const defaultCurrency = (user?.defaultCurrency ?? 'MXN').toUpperCase().slice(0, 3);
    return {
      defaultCurrency,
      tiered,
      portfolios: overview,
    };
  }

  private async ensurePortfolioOwned(portfolioId: string, userId: string): Promise<void> {
    const p = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!p) {
      throw new NotFoundException('Portafolio no encontrado');
    }
  }

  private async ensurePositionOwned(positionId: string, userId: string) {
    const pos = await this.prisma.investmentPosition.findFirst({
      where: { id: positionId },
      include: { portfolio: true },
    });
    if (!pos || pos.portfolio.userId !== userId) {
      throw new NotFoundException('Posición no encontrada');
    }
    return pos;
  }

  private async buildOverview(userId: string): Promise<InvestmentsOverviewResponse> {
    const portfolios = await this.prisma.investmentPortfolio.findMany({
      where: { userId },
      include: { positions: true },
      orderBy: { createdAt: 'asc' },
    });

    let grandInitial = new Prisma.Decimal(0);
    let grandProjected = new Prisma.Decimal(0);

    const out: PortfolioOverview[] = portfolios.map((p) => {
      let portInitial = new Prisma.Decimal(0);
      let portProjected = new Prisma.Decimal(0);

      const positions: PositionProjection[] = p.positions.map((pos) => {
        const initial = new Prisma.Decimal(pos.initialAmount);
        const rate = new Prisma.Decimal(pos.expectedAnnualReturnPct);
        const projected = projectedAfterYears(initial, rate, 1);
        portInitial = portInitial.plus(initial);
        portProjected = portProjected.plus(projected);

        const growthVsInitial = initial.isZero()
          ? new Prisma.Decimal(0)
          : projected.minus(initial).div(initial).mul(new Prisma.Decimal(100));

        const mv = pos.marketValue != null ? new Prisma.Decimal(pos.marketValue) : null;
        const unrealizedPlPct =
          mv != null && !initial.isZero() ? mv.minus(initial).div(initial).mul(new Prisma.Decimal(100)) : null;

        return {
          id: pos.id,
          label: pos.label,
          initialAmount: initial.toString(),
          expectedAnnualReturnPct: rate.toString(),
          projectedValueAfter1y: projected.toString(),
          growthPctVsInitial: growthVsInitial.toFixed(2),
          kind: pos.kind,
          maturityDate: pos.maturityDate ? pos.maturityDate.toISOString() : null,
          agreedAnnualRatePct: pos.agreedAnnualRatePct != null ? pos.agreedAnnualRatePct.toString() : null,
          marketValue: pos.marketValue != null ? pos.marketValue.toString() : null,
          unrealizedPlPct: unrealizedPlPct != null ? unrealizedPlPct.toFixed(2) : null,
        };
      });

      grandInitial = grandInitial.plus(portInitial);
      grandProjected = grandProjected.plus(portProjected);

      return {
        id: p.id,
        name: p.name,
        baseCurrency: p.baseCurrency,
        totals: {
          initial: portInitial.toString(),
          projectedAfter1y: portProjected.toString(),
        },
        positions,
      };
    });

    return {
      portfolios: out,
      grandTotals: {
        initial: grandInitial.toString(),
        projectedAfter1y: grandProjected.toString(),
      },
    };
  }
}

function projectedAfterYears(
  initial: Prisma.Decimal,
  annualRate: Prisma.Decimal,
  wholeYears: number,
): Prisma.Decimal {
  const one = new Prisma.Decimal(1);
  const factor = one.plus(annualRate).pow(wholeYears);
  return initial.mul(factor);
}
