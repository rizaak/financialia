/** Detección y construcción de Web Speech API (prefijo webkit en algunos navegadores). */

export type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
};

export type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [i: number]: SpeechRecognitionResultLike };
};

export type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: Event & { error?: string }) => void) | null;
  onend: ((this: SpeechRecognitionInstance) => void) | null;
};

export function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
