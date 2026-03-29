export type DisplayCurrency = 'USD' | 'MXN';

export function normalizeDisplayCurrency(code: string | undefined | null): DisplayCurrency {
  const c = code?.trim().toUpperCase();
  if (c === 'USD') return 'USD';
  return 'MXN';
}
