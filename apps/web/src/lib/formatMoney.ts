export function formatMoney(
  value: string | number,
  currencyCode: string = 'USD',
): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) {
    return '—';
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(n);
}
