/**
 * Inicio y fin del mes calendario local (zona horaria del navegador), en ISO para el API.
 */
export function getLocalCalendarMonthRangeIso(reference = new Date()): { from: string; to: string } {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Convierte el valor de `<input type="date">` (día civil local) a ISO usando mediodía local
 * (evita desplazamientos al día anterior/siguiente al comparar con el mes local).
 */
export function localDateInputToIsoMidday(dateStr: string): string {
  const [yy, mm, dd] = dateStr.split('-').map(Number);
  if (!yy || !mm || !dd) {
    return new Date().toISOString();
  }
  const d = new Date(yy, mm - 1, dd, 12, 0, 0, 0);
  return d.toISOString();
}
