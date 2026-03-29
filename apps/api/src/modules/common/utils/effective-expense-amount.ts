import { Prisma } from '@prisma/client';

/**
 * Para MSI/diferidos, `metadata.monthlyExpenseImpact` reemplaza el monto del movimiento
 * en agregados de gasto del periodo (el `amount` sigue siendo la deuda total del plan).
 */
export function effectiveExpenseAmountFromMetadata(
  metadata: unknown,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const m = metadata as { monthlyExpenseImpact?: unknown };
    if (m.monthlyExpenseImpact != null && String(m.monthlyExpenseImpact).trim() !== '') {
      return new Prisma.Decimal(String(m.monthlyExpenseImpact));
    }
  }
  return amount;
}
