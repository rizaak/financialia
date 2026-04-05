/**
 * Convierte texto de monto a número: acepta punto (.) como decimal;
 * la coma (,) se trata como separador decimal si no hay punto, o se elimina como miles.
 */
export function parseMoneyInput(raw: string): number {
  let s = raw.trim().replace(/\s/g, '');
  if (!s) return NaN;
  if (s.includes(',') && !s.includes('.')) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const lastDot = s.lastIndexOf('.');
  if (lastDot === -1) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const intPart = s.slice(0, lastDot).replace(/\./g, '');
  const decPart = s.slice(lastDot + 1).replace(/\./g, '');
  const merged = decPart.length > 0 ? `${intPart}.${decPart}` : intPart;
  const n = parseFloat(merged);
  return Number.isFinite(n) ? n : NaN;
}
