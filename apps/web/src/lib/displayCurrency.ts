export type DisplayCurrency = 'USD' | 'MXN';

export function normalizeDisplayCurrency(code: string | undefined | null): DisplayCurrency {
  return code?.trim().toUpperCase() === 'MXN' ? 'MXN' : 'USD';
}
