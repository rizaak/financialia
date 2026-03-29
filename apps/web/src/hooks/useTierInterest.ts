/** Tramo de una estrategia escalonada (límites en la misma moneda del capital). */
export type InterestTier = {
  id: string;
  ratePct: number;
  minInclusive: number;
  maxExclusive: number;
};

export const DEMO_TIER_STRATEGY: InterestTier[] = [
  { id: 't1', ratePct: 15, minInclusive: 0, maxExclusive: 100_000 },
  { id: 't2', ratePct: 7, minInclusive: 100_000, maxExclusive: 500_000 },
  { id: 't3', ratePct: 0, minInclusive: 500_000, maxExclusive: Number.POSITIVE_INFINITY },
];

/**
 * Índice del tramo activo según capital actual.
 */
export function getActiveTierIndex(principal: number, tiers: InterestTier[]): number {
  const idx = tiers.findIndex((t) => principal >= t.minInclusive && principal < t.maxExclusive);
  return idx >= 0 ? idx : tiers.length - 1;
}
