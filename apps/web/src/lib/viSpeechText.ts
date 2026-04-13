/**
 * Normaliza texto para speechSynthesis: símbolos y marcas a palabras en español.
 */

/** Convierte montos tipo $500 o $1,234.50 a forma hablada con "pesos". */
export function prepareViSpeechText(text: string): string {
  let s = text.trim();
  if (!s) return s;

  s = s.replace(/\bvidya\.center\b/gi, 'Vidya center');
  s = s.replace(/\bUSD\b/gi, 'dólares estadounidenses');
  s = s.replace(/\bMXN\b/gi, 'pesos mexicanos');

  s = s.replace(/\$\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|[\d]+(?:[.,]\d+)?)/g, (_, raw: string) => {
    const compact = raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.');
    const num = parseFloat(compact);
    if (!Number.isFinite(num)) return `${raw} pesos`;
    const spoken = Number.isInteger(num) ? String(num) : String(num).replace('.', ' punto ');
    return `${spoken} pesos`;
  });

  s = s.replace(/\$/g, ' pesos ');
  s = s.replace(/%/g, ' por ciento ');
  s = s.replace(/[#*_/]/g, ' ');
  s = s.replace(/[·•]/g, ', ');
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}
