import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { prepareViSpeechText } from '../lib/viSpeechText';
import { ensureSpeechVoicesLoaded, pickSpanishVoice, refreshSpeechVoices } from '../lib/viSpeechSynthesis';

const STORAGE_KEY = 'vi-voice-muted';
const WELCOME_SESSION_KEY = 'vi-welcome-tts-session';
const SPEAK_LEAD_MS = 200;
const WELCOME_MOUNT_DELAY_MS = 600;

/** Solo en producción app.vidya.center (saludo único por sesión). */
function isVidyaCenterAppHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'app.vidya.center';
}

type ViVoiceContextValue = {
  voiceMuted: boolean;
  setVoiceMuted: (muted: boolean) => void;
  /** True mientras Vi prepara o reproduce voz (incluye ~200 ms previos al audio). */
  isSpeaking: boolean;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  userFirstName: string;
};

const ViVoiceContext = createContext<ViVoiceContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  userFirstName: string;
};

export function ViVoiceProvider({ children, userFirstName }: ProviderProps) {
  const [voiceMuted, setVoiceMutedState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakDelayRef = useRef<number | null>(null);

  useEffect(() => {
    ensureSpeechVoicesLoaded();
    refreshSpeechVoices();
  }, []);

  const clearSpeakDelay = useCallback(() => {
    if (speakDelayRef.current != null) {
      window.clearTimeout(speakDelayRef.current);
      speakDelayRef.current = null;
    }
  }, []);

  const setVoiceMuted = useCallback(
    (muted: boolean) => {
      setVoiceMutedState(muted);
      try {
        localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
      } catch {
        /* ignore */
      }
      if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
        clearSpeakDelay();
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    },
    [clearSpeakDelay],
  );

  const cancelSpeech = useCallback(() => {
    clearSpeakDelay();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [clearSpeakDelay]);

  const speak = useCallback(
    (text: string) => {
      const raw = text.trim();
      if (!raw || voiceMuted) return;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      clearSpeakDelay();
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      const prepared = prepareViSpeechText(raw);
      if (!prepared) return;

      setIsSpeaking(true);

      speakDelayRef.current = window.setTimeout(() => {
        speakDelayRef.current = null;
        refreshSpeechVoices();

        const utterance = new SpeechSynthesisUtterance(prepared);
        utterance.lang = 'es-MX';
        const voice = pickSpanishVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.9;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }, SPEAK_LEAD_MS);
    },
    [voiceMuted, clearSpeakDelay],
  );

  useEffect(() => {
    if (voiceMuted || !isVidyaCenterAppHost()) return;
    try {
      if (sessionStorage.getItem(WELCOME_SESSION_KEY) === '1') return;
    } catch {
      return;
    }

    const name = userFirstName.trim() || 'Inversor';
    const msg = `Sistemas listos. Bienvenido a Vidya, ${name}. ¿En qué puedo ayudarte hoy?`;

    const welcomeTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(WELCOME_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      speak(msg);
    }, WELCOME_MOUNT_DELAY_MS);

    return () => {
      window.clearTimeout(welcomeTimer);
    };
  }, [userFirstName, voiceMuted, speak]);

  const value = useMemo<ViVoiceContextValue>(
    () => ({
      voiceMuted,
      setVoiceMuted,
      isSpeaking,
      speak,
      cancelSpeech,
      userFirstName,
    }),
    [voiceMuted, setVoiceMuted, isSpeaking, speak, cancelSpeech, userFirstName],
  );

  return <ViVoiceContext.Provider value={value}>{children}</ViVoiceContext.Provider>;
}

export function useViVoice(): ViVoiceContextValue {
  const ctx = useContext(ViVoiceContext);
  if (!ctx) {
    throw new Error('useViVoice debe usarse dentro de ViVoiceProvider');
  }
  return ctx;
}

export function useViVoiceOptional(): ViVoiceContextValue | null {
  return useContext(ViVoiceContext);
}
