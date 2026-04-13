/** Frases breves para TTS tras operaciones con Vi (español natural). */

export function phraseExpenseRegistered(amountLabel: string, categoryLabel: string): string {
  return `Listo, gasto de ${amountLabel} registrado en ${categoryLabel}.`;
}

export function phraseIncomeRegistered(amountLabel: string, categoryLabel: string): string {
  return `Listo, ingreso de ${amountLabel} registrado en ${categoryLabel}.`;
}

export function phraseBalanceUpdatedVidya(): string {
  return 'Hecho. He actualizado tu saldo en Vidya punto center.';
}

export function phraseCardPaymentEncouragement(firstName: string): string {
  return `Pago de tarjeta detectado. ¡Bien hecho, ${firstName}!`;
}

export function phraseMsiRegistered(months: number): string {
  return `Listo, compra a ${months} meses registrada.`;
}

export function phraseInvestmentRegistered(): string {
  return phraseBalanceUpdatedVidya();
}
