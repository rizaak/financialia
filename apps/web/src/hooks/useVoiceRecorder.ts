import { useCallback, useEffect, useRef, useState } from 'react';
import { pickMediaRecorderMime } from '../lib/voiceRecording';

const TIMESLICE_MS = 200;
const TIMER_TICK_MS = 250;

/** Permiso de micrófono denegado; captúralo en la UI (p. ej. Toast). */
export class VoiceRecorderPermissionError extends Error {
  readonly code = 'PERMISSION_DENIED' as const;
  override readonly name = 'VoiceRecorderPermissionError';

  constructor(message = 'Permiso de micrófono denegado', cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type UseVoiceRecorderReturn = {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  clearRecording: () => void;
};

export type UseVoiceRecorderOptions = {
  /** Si la grabación termina sin datos útiles (blob vacío). */
  onEmptyCapture?: () => void;
};

function stopMediaStreamTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track: MediaStreamTrack) => {
    track.stop();
  });
}

/**
 * Captura de audio con MediaRecorder (fragmentos) para envío a la IA (Whisper: webm/mp4).
 */
export function useVoiceRecorder(options?: UseVoiceRecorderOptions): UseVoiceRecorderReturn {
  const onEmptyCapture = options?.onEmptyCapture;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const chunksRef = useRef<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>('audio/webm');
  const timerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    const id = timerRef.current;
    if (id != null) {
      window.clearInterval(id);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    recordingStartedAtRef.current = Date.now();
    setRecordingTime(0);
    timerRef.current = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
    }, TIMER_TICK_MS);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
      const rec = recRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.stop();
      }
      recRef.current = null;
    };
  }, [clearTimer]);

  const clearRecording = useCallback(() => {
    clearTimer();
    setAudioBlob(null);
    setRecordingTime(0);
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    setAudioBlob(null);
    clearTimer();
    setRecordingTime(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: unknown) {
      if (
        e instanceof DOMException &&
        (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
      ) {
        throw new VoiceRecorderPermissionError(undefined, e);
      }
      throw e;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mime = pickMediaRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e: unknown) {
      stopMediaStreamTracks(stream);
      streamRef.current = null;
      throw e;
    }

    const resolvedMime: string = recorder.mimeType || mime || 'audio/webm';
    mimeRef.current = resolvedMime;

    recorder.ondataavailable = (ev: BlobEvent) => {
      if (ev.data.size > 0) {
        chunksRef.current.push(ev.data);
      }
    };

    recorder.onstop = () => {
      clearTimer();
      stopMediaStreamTracks(stream);
      streamRef.current = null;
      recRef.current = null;
      setIsRecording(false);

      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      chunksRef.current = [];
      if (blob.size > 0) {
        setAudioBlob(blob);
      } else {
        onEmptyCapture?.();
      }
    };

    recRef.current = recorder;
    recorder.start(TIMESLICE_MS);
    setIsRecording(true);
    startTimer();
  }, [isRecording, onEmptyCapture, clearTimer, startTimer]);

  const stopRecording = useCallback(() => {
    const r: MediaRecorder | null = recRef.current;
    if (r && r.state !== 'inactive') {
      r.stop();
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    recordingTime,
    audioBlob,
    clearRecording,
  };
}
