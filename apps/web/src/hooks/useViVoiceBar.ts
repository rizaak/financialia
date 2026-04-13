import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionInstance,
} from '../lib/speechRecognitionEnv';
import { pickMediaRecorderMime } from '../lib/voiceRecording';
import { VoiceRecorderPermissionError } from './useVoiceRecorder';

const TIMESLICE_MS = 200;
const TIMER_TICK_MS = 250;
export const VI_VOICE_MIN_SECONDS = 1.5;
const DEFAULT_SILENCE_MS = 2000;
const SILENCE_PROCESSING_HINT_MS = 450;
const LEVEL_BARS = 5;

function stopMediaStreamTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

export type UseViVoiceBarOptions = {
  onEmptyCapture?: () => void;
  onSpeechTranscript: (text: string) => void;
  onInvalidStop?: (reason: 'too_short' | 'empty_transcript') => void;
  autoSendAfterSilence?: boolean;
  silenceMs?: number;
  speechLang?: string;
};

export type UseViVoiceBarReturn = {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  isRecording: boolean;
  recordingTime: number;
  confirmedTranscript: string;
  interimTranscript: string;
  audioLevels: number[];
  silenceProcessing: boolean;
  speechRecognitionAvailable: boolean;
  audioBlob: Blob | null;
  clearRecording: () => void;
};

export function useViVoiceBar(options: UseViVoiceBarOptions): UseViVoiceBarReturn {
  const {
    onEmptyCapture,
    onSpeechTranscript,
    onInvalidStop,
    autoSendAfterSilence = true,
    silenceMs = DEFAULT_SILENCE_MS,
    speechLang = 'es-MX',
  } = options;

  const onSpeechTranscriptRef = useRef(onSpeechTranscript);
  const onInvalidStopRef = useRef(onInvalidStop);
  useEffect(() => {
    onSpeechTranscriptRef.current = onSpeechTranscript;
  }, [onSpeechTranscript]);
  useEffect(() => {
    onInvalidStopRef.current = onInvalidStop;
  }, [onInvalidStop]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [confirmedTranscript, setConfirmedTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(LEVEL_BARS).fill(0));
  const [silenceProcessing, setSilenceProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const speechCtor = useRef(getSpeechRecognitionCtor());
  const speechRecognitionAvailable = speechCtor.current != null;

  const chunksRef = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const discardOnStopRef = useRef(false);
  const mimeRef = useRef<string>('audio/webm');
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const intentionalRecognitionStopRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const autoSendTimeoutRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const stoppingRef = useRef(false);
  const usedSpeechThisSessionRef = useRef(false);
  const startInFlightRef = useRef(false);

  const clearSilenceTimers = useCallback(() => {
    if (silenceTimeoutRef.current != null) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (autoSendTimeoutRef.current != null) {
      window.clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    setSilenceProcessing(false);
  }, []);

  const clearTimer = useCallback(() => {
    const id = timerRef.current;
    if (id != null) {
      window.clearInterval(id);
      timerRef.current = null;
    }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state !== 'closed') {
      void ctx.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevels(Array(LEVEL_BARS).fill(0));
  }, []);

  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (!r) return;
    intentionalRecognitionStopRef.current = true;
    try {
      r.abort();
    } catch {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const finalizeRecording = useCallback(() => {
    const started = recordingStartedAtRef.current;
    const durationSec = (Date.now() - started) / 1000;
    const fullText = `${finalTranscriptRef.current}${interimTranscriptRef.current}`.trim();

    intentionalRecognitionStopRef.current = true;
    stopRecognition();
    clearSilenceTimers();

    const tooShort = durationSec < VI_VOICE_MIN_SECONDS;
    const emptySpeech = usedSpeechThisSessionRef.current && !fullText;

    if (tooShort || emptySpeech) {
      discardOnStopRef.current = true;
      const r = recRef.current;
      if (r && r.state !== 'inactive') r.stop();
      setConfirmedTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      if (tooShort) onInvalidStopRef.current?.('too_short');
      else onInvalidStopRef.current?.('empty_transcript');
      return;
    }

    if (usedSpeechThisSessionRef.current && fullText) {
      discardOnStopRef.current = true;
      const r = recRef.current;
      if (r && r.state !== 'inactive') r.stop();
      onSpeechTranscriptRef.current(fullText);
      setConfirmedTranscript('');
      setInterimTranscript('');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      return;
    }

    discardOnStopRef.current = false;
    const r = recRef.current;
    if (r && r.state !== 'inactive') r.stop();
  }, [clearSilenceTimers, stopRecognition]);

  const bumpSilenceTimer = useCallback(() => {
    clearSilenceTimers();
    if (!autoSendAfterSilence || silenceMs <= 0) return;
    silenceTimeoutRef.current = window.setTimeout(() => {
      if (!isRecordingRef.current || stoppingRef.current) return;
      setSilenceProcessing(true);
      autoSendTimeoutRef.current = window.setTimeout(() => {
        if (!isRecordingRef.current || stoppingRef.current) return;
        stoppingRef.current = true;
        finalizeRecording();
      }, SILENCE_PROCESSING_HINT_MS);
    }, silenceMs);
  }, [autoSendAfterSilence, clearSilenceTimers, finalizeRecording, silenceMs]);

  const startTimer = useCallback(() => {
    clearTimer();
    recordingStartedAtRef.current = Date.now();
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, TIMER_TICK_MS);
  }, [clearTimer]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      clearSilenceTimers();
      stopVisualizer();
      stopRecognition();
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
      const rec = recRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.stop();
      }
      recRef.current = null;
    };
  }, [clearTimer, clearSilenceTimers, stopRecognition, stopVisualizer]);

  const clearRecording = useCallback(() => {
    clearTimer();
    clearSilenceTimers();
    stopVisualizer();
    setAudioBlob(null);
    setRecordingTime(0);
    setConfirmedTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    usedSpeechThisSessionRef.current = false;
  }, [clearTimer, clearSilenceTimers, stopVisualizer]);

  const startRecording = useCallback(async () => {
    if (startInFlightRef.current || isRecordingRef.current) return;
    startInFlightRef.current = true;

    discardOnStopRef.current = false;
    stoppingRef.current = false;
    intentionalRecognitionStopRef.current = false;
    setAudioBlob(null);
    clearTimer();
    clearSilenceTimers();
    setConfirmedTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    usedSpeechThisSessionRef.current = false;
    setRecordingTime(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: unknown) {
      startInFlightRef.current = false;
      if (
        e instanceof DOMException &&
        (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
      ) {
        throw new VoiceRecorderPermissionError(undefined, e);
      }
      throw e;
    }

    setIsRecording(true);
    startInFlightRef.current = false;
    streamRef.current = stream;
    chunksRef.current = [];

    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyserRef.current = analyser;
      await ctx.resume();
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!isRecordingRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / LEVEL_BARS));
        const levels: number[] = [];
        for (let i = 0; i < LEVEL_BARS; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          levels.push(Math.min(1, sum / (step * 255)));
        }
        setAudioLevels(levels);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      stopVisualizer();
    }

    const mime = pickMediaRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e: unknown) {
      stopMediaStreamTracks(stream);
      streamRef.current = null;
      stopVisualizer();
      setIsRecording(false);
      throw e;
    }

    const resolvedMime: string = recorder.mimeType || mime || 'audio/webm';
    mimeRef.current = resolvedMime;

    recorder.ondataavailable = (ev: BlobEvent) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    recorder.onstop = () => {
      clearTimer();
      clearSilenceTimers();
      stopVisualizer();
      stopMediaStreamTracks(stream);
      streamRef.current = null;
      recRef.current = null;
      setIsRecording(false);
      stoppingRef.current = false;

      const discard = discardOnStopRef.current;
      discardOnStopRef.current = false;

      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      chunksRef.current = [];
      if (discard) return;
      if (blob.size > 0) setAudioBlob(blob);
      else onEmptyCapture?.();
    };

    recRef.current = recorder;
    recorder.start(TIMESLICE_MS);
    startTimer();

    const Ctor = speechCtor.current;
    if (Ctor) {
      try {
        const recognition: SpeechRecognitionInstance = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechLang;
        recognitionRef.current = recognition;
        usedSpeechThisSessionRef.current = true;
        intentionalRecognitionStopRef.current = false;

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const row = event.results[i];
            const piece = row[0]?.transcript ?? '';
            if (row.isFinal) {
              finalTranscriptRef.current = `${finalTranscriptRef.current}${piece} `;
              setConfirmedTranscript(finalTranscriptRef.current.trim());
            } else {
              interim += piece;
            }
          }
          interimTranscriptRef.current = interim;
          setInterimTranscript(interim);
          bumpSilenceTimer();
        };

        recognition.onerror = () => {
          /* ignored */
        };

        recognition.onend = () => {
          if (intentionalRecognitionStopRef.current) return;
          if (!isRecordingRef.current) return;
          const live = recognitionRef.current;
          if (!live) return;
          try {
            live.start();
          } catch {
            /* ignore */
          }
        };

        recognition.start();
        bumpSilenceTimer();
      } catch {
        recognitionRef.current = null;
        usedSpeechThisSessionRef.current = false;
      }
    }
  }, [
    bumpSilenceTimer,
    clearSilenceTimers,
    clearTimer,
    onEmptyCapture,
    speechLang,
    startTimer,
    stopVisualizer,
  ]);

  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    finalizeRecording();
  }, [finalizeRecording]);

  const cancelRecording = useCallback(() => {
    clearSilenceTimers();
    intentionalRecognitionStopRef.current = true;
    stopRecognition();
    discardOnStopRef.current = true;
    const r = recRef.current;
    if (r && r.state !== 'inactive') {
      r.stop();
      return;
    }
    discardOnStopRef.current = false;
    clearTimer();
    stopVisualizer();
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    recRef.current = null;
    setIsRecording(false);
    stoppingRef.current = false;
    setRecordingTime(0);
    setConfirmedTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    chunksRef.current = [];
  }, [clearSilenceTimers, clearTimer, stopRecognition, stopVisualizer]);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    recordingTime,
    confirmedTranscript,
    interimTranscript,
    audioLevels,
    silenceProcessing,
    speechRecognitionAvailable,
    audioBlob,
    clearRecording,
  };
}
