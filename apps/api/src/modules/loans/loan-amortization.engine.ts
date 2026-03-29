import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const MAX_MONTHS = 1200;

export type AmortizationTableRow = {
  month: number;
  payment: string;
  interest: string;
  principal: string;
  balanceAfter: string;
};

function decMin(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.lte(b) ? a : b;
}

/** Tasa mensual: i = annualRate / 12 */
export function monthlyRateFromAnnual(annualRate: Prisma.Decimal): Prisma.Decimal {
  return annualRate.div(12);
}

/**
 * Cuota fija (francés): P = principal * i / (1 - (1+i)^(-termMonths))
 */
export function calculateFixedMonthlyPayment(
  principal: Prisma.Decimal,
  annualRate: Prisma.Decimal,
  termMonths: number,
): Prisma.Decimal {
  if (termMonths <= 0) {
    throw new BadRequestException('El plazo en meses debe ser positivo.');
  }
  if (principal.lte(0)) {
    return new Prisma.Decimal(0);
  }
  const i = monthlyRateFromAnnual(annualRate);
  if (i.eq(0)) {
    return principal.div(termMonths);
  }
  const onePlus = new Prisma.Decimal(1).plus(i);
  const powNeg = onePlus.pow(-termMonths);
  const denom = new Prisma.Decimal(1).minus(powNeg);
  if (denom.lte(0) || denom.abs().lt('1e-24')) {
    throw new BadRequestException('No se puede calcular la cuota con la tasa y plazo indicados.');
  }
  return principal.mul(i).div(denom);
}

/**
 * Tabla de amortización mes a mes (saldo insoluto, interés, capital).
 */
export function calculateAmortizationTable(
  principal: Prisma.Decimal,
  annualRate: Prisma.Decimal,
  termMonths: number,
): AmortizationTableRow[] {
  if (principal.lte(0)) {
    return [];
  }
  const P = calculateFixedMonthlyPayment(principal, annualRate, termMonths);
  const i = monthlyRateFromAnnual(annualRate);
  const rows: AmortizationTableRow[] = [];
  let b = principal;
  for (let m = 1; m <= termMonths && b.gt(0.01); m++) {
    const interest = b.mul(i);
    const toPrincipal = P.minus(interest);
    const capital = decMin(toPrincipal, b);
    b = b.minus(capital);
    rows.push({
      month: m,
      payment: P.toString(),
      interest: interest.toString(),
      principal: capital.toString(),
      balanceAfter: b.lt(0) ? '0' : b.toString(),
    });
  }
  return rows;
}

/**
 * Proyecta meses hasta liquidar y suma de intereses futuros con cuota fija P (método francés).
 */
export function simulateFutureWithFixedPayment(
  balance: Prisma.Decimal,
  monthlyPayment: Prisma.Decimal,
  annualRate: Prisma.Decimal,
): { months: number; totalInterest: Prisma.Decimal } {
  const monthlyR = monthlyRateFromAnnual(annualRate);
  let b = balance;
  let totalInterest = new Prisma.Decimal(0);
  let months = 0;
  while (b.gt(0.01) && months < MAX_MONTHS) {
    const interest = b.mul(monthlyR);
    totalInterest = totalInterest.plus(interest);
    const toPrincipal = monthlyPayment.minus(interest);
    if (toPrincipal.lte(0)) {
      return { months: MAX_MONTHS, totalInterest: new Prisma.Decimal('999999999') };
    }
    const principalPay = decMin(toPrincipal, b);
    b = b.minus(principalPay);
    months++;
  }
  return { months, totalInterest };
}

/**
 * Suma exacta de intereses en `termMonths` meses con cuota fija P sobre saldo inicial `principal`
 * (amortización estándar; último mes ajusta capital).
 */
export function totalInterestOverFixedTerm(
  principal: Prisma.Decimal,
  fixedPayment: Prisma.Decimal,
  annualRate: Prisma.Decimal,
  termMonths: number,
): Prisma.Decimal {
  const monthlyR = monthlyRateFromAnnual(annualRate);
  let b = principal;
  let totalInterest = new Prisma.Decimal(0);
  for (let m = 0; m < termMonths && b.gt(0.01); m++) {
    const interest = b.mul(monthlyR);
    totalInterest = totalInterest.plus(interest);
    const toPrincipal = fixedPayment.minus(interest);
    const cap = decMin(toPrincipal, b);
    b = b.minus(cap);
  }
  return totalInterest;
}
