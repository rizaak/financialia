import { Injectable } from '@nestjs/common';

/** Entrada de tramo ordenada por sortOrder ascendente. */
export type CalculatorTierInput = {
  sortOrder: number;
  /** Límite superior acumulado del capital (null = sin techo). */
  upperLimit: number | null;
  /** Tasa nominal anual en % (15 = 15%). */
  annualRatePct: number;
};

export type TierSlice = {
  sortOrder: number;
  amountInTier: number;
  annualRatePct: number;
  tierCapacity: number;
  cumulativeUpper: number | null;
};

export type TieredBlendResult = {
  /** % nominal anual ponderado (sobre el total invertido). */
  averageAnnualPct: number;
  /** Interés anual estimado en unidades monetarias (nominal simple). */
  annualInterestMoney: number;
  dailyEstimatedEarnings: number;
  slices: TierSlice[];
};

export type TierProgressUi = {
  /** 0–1 para barra de progreso dentro del tramo actual. */
  progressInCurrentTier: number;
  currentTierSortOrder: number | null;
  message: string;
};

/**
 * Cálculos puros de tramos e interés (sin I/O).
 */
@Injectable()
export class InvestmentCalculatorService {
  /**
   * Prorratea el capital entre tramos y obtiene tasa media y interés anual monetario.
   * El remanente sin tramo explícito se trata a 0% nominal.
   */
  blendPrincipalAcrossTiers(principal: number, tiers: CalculatorTierInput[]): TieredBlendResult {
    if (principal <= 0 || tiers.length === 0) {
      return {
        averageAnnualPct: 0,
        annualInterestMoney: 0,
        dailyEstimatedEarnings: 0,
        slices: [],
      };
    }

    const ordered = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
    let remaining = principal;
    let lastUpper = 0;
    let annualInterestMoney = 0;
    const slices: TierSlice[] = [];

    for (const tier of ordered) {
      if (remaining <= 1e-12) {
        break;
      }
      const upper = tier.upperLimit;
      const tierCapacity =
        upper != null ? Math.max(0, upper - lastUpper) : Number.POSITIVE_INFINITY;
      const amountInTier = Math.min(remaining, tierCapacity);
      annualInterestMoney += amountInTier * (tier.annualRatePct / 100);
      slices.push({
        sortOrder: tier.sortOrder,
        amountInTier,
        annualRatePct: tier.annualRatePct,
        tierCapacity: Number.isFinite(tierCapacity) ? tierCapacity : amountInTier,
        cumulativeUpper: upper,
      });
      remaining -= amountInTier;
      lastUpper = upper != null ? upper : lastUpper + amountInTier;
    }

    if (remaining > 1e-9) {
      slices.push({
        sortOrder: 9999,
        amountInTier: remaining,
        annualRatePct: 0,
        tierCapacity: remaining,
        cumulativeUpper: null,
      });
    }

    const averageAnnualPct = (annualInterestMoney / principal) * 100;
    const dailyEstimatedEarnings = this.dailyEarningsNominal(principal, averageAnnualPct);

    return {
      averageAnnualPct,
      annualInterestMoney,
      dailyEstimatedEarnings,
      slices,
    };
  }

  /**
   * Ganancia diaria estimada (nominal / 365). La frecuencia de pago afecta capitalización real;
   * para UI usamos equivalente diario simple coherente con la tasa nominal mostrada.
   */
  dailyEarningsNominal(principal: number, averageAnnualPct: number): number {
    if (principal <= 0) {
      return 0;
    }
    return (principal * (averageAnnualPct / 100)) / 365;
  }

  /**
   * Factor de conversión nominal anual → diaria según frecuencia (referencia para extensiones).
   */
  effectiveDailyRateFromAnnual(averageAnnualPct: number): number {
    return averageAnnualPct / 100 / 365;
  }

  /** Texto + progreso para UI del tramo donde “vive” la mayor parte del capital actual. */
  tierProgressForUi(principal: number, tiers: CalculatorTierInput[]): TierProgressUi {
    const blend = this.blendPrincipalAcrossTiers(principal, tiers);
    if (principal <= 0 || blend.slices.length === 0) {
      return {
        progressInCurrentTier: 0,
        currentTierSortOrder: null,
        message: 'Sin capital invertido en tramos.',
      };
    }

    const meaningful = blend.slices.filter((s) => s.amountInTier > 1e-9 && s.sortOrder < 9999);
    const target = meaningful.length > 0 ? meaningful[meaningful.length - 1] : blend.slices[0];
    const cap = target.tierCapacity > 0 ? target.tierCapacity : 1;
    const progress = Math.min(1, Math.max(0, target.amountInTier / cap));
    const msg = `Tramo ${target.sortOrder}: ${target.annualRatePct.toFixed(2)}% nominal — ${(progress * 100).toFixed(0)}% del cupo de este tramo en uso.`;

    return {
      progressInCurrentTier: progress,
      currentTierSortOrder: target.sortOrder,
      message: msg,
    };
  }

  /** Rendimiento anual ponderado de varias inversiones (cada una con su tasa efectiva ya calculada). */
  portfolioBlendedAnnualPct(
    legs: ReadonlyArray<{ principal: number; effectiveAnnualPct: number }>,
  ): number {
    let w = 0;
    let num = 0;
    for (const l of legs) {
      if (l.principal > 0) {
        num += l.principal * l.effectiveAnnualPct;
        w += l.principal;
      }
    }
    return w > 0 ? num / w : 0;
  }
}
