import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type InvestmentPortfolio, type InvestmentPosition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePortfolioDto } from './dto/create-portfolio.dto';
import type { CreatePositionDto } from './dto/create-position.dto';

export type PositionProjection = {
  id: string;
  label: string;
  initialAmount: string;
  expectedAnnualReturnPct: string;
  projectedValueAfter1y: string;
  growthPctVsInitial: string;
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

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
        baseCurrency: dto.baseCurrency ?? 'USD',
      },
    });
  }

  async createPosition(
    portfolioId: string,
    userId: string,
    dto: CreatePositionDto,
  ): Promise<InvestmentPosition> {
    await this.ensurePortfolioOwned(portfolioId, userId);
    return this.prisma.investmentPosition.create({
      data: {
        portfolioId,
        label: dto.label,
        initialAmount: new Prisma.Decimal(dto.initialAmount),
        expectedAnnualReturnPct: new Prisma.Decimal(dto.expectedAnnualReturnPct),
        notes: dto.notes,
      },
    });
  }

  getOverview(userId: string): Promise<InvestmentsOverviewResponse> {
    return this.buildOverview(userId);
  }

  private async ensurePortfolioOwned(portfolioId: string, userId: string): Promise<void> {
    const p = await this.prisma.investmentPortfolio.findFirst({
      where: { id: portfolioId, userId },
    });
    if (!p) {
      throw new NotFoundException('Portafolio no encontrado');
    }
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

        return {
          id: pos.id,
          label: pos.label,
          initialAmount: initial.toString(),
          expectedAnnualReturnPct: rate.toString(),
          projectedValueAfter1y: projected.toString(),
          growthPctVsInitial: growthVsInitial.toFixed(2),
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
