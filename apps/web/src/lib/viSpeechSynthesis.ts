/** Selección de voz en español: prioridad Google / Natural / Premium + calma profesional. */

let cachedVoices: SpeechSynthesisVoice[] = [];

export function refreshSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

export function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const list = cachedVoices.length > 0 ? cachedVoices : refreshSpeechVoices();
  if (list.length === 0) return null;

  const es = list.filter((v) => v.lang.toLowerCase().startsWith('es'));
  const pool = es.length > 0 ? es : list;

  const score = (v: SpeechSynthesisVoice) => {
    const n = `${v.name} ${v.lang}`.toLowerCase();
    let s = 0;
    if (n.includes('google')) s += 40;
    if (n.includes('natural')) s += 35;
    if (n.includes('premium')) s += 35;
    if (n.includes('neural') || n.includes('wavenet')) s += 25;
    if (n.includes('español') || n.includes('spanish')) s += 12;
    if (n.includes('es-mx') || n.includes('es_mx')) s += 10;
    if (n.includes('es-es') || n.includes('es_es')) s += 8;
    if (n.includes('female') || n.includes('mujer')) s += 4;
    if (v.default && n.startsWith('es')) s += 3;
    return s;
  };

  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? pool[0] ?? null;
}

export function ensureSpeechVoicesLoaded(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  refreshSpeechVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshSpeechVoices();
  };
}
