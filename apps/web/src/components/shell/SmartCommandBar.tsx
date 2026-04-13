import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic, Search, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ParseNaturalLanguageResponse } from '../../api/fetchParseNaturalLanguage';
import { postParseNaturalLanguage } from '../../api/fetchParseNaturalLanguage';
import { postProcessVoice } from '../../api/fetchProcessVoice';
import { useViVoice } from '../../hooks/useViVoice';
import { useViVoiceBar, VI_VOICE_MIN_SECONDS } from '../../hooks/useViVoiceBar';
import { VoiceRecorderPermissionError } from '../../hooks/useVoiceRecorder';
import { formatRecordingElapsed } from '../../lib/voiceRecording';
import { TransactionReviewDialog } from './TransactionReviewDialog';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onTransactionSaved: () => void | Promise<void>;
  /** `toolbar`: sin margen inferior (uso en AppBar). */
  variant?: 'default' | 'toolbar';
  /** Notifica al layout (p. ej. AppBar móvil) para liberar ancho mientras se graba. */
  onRecordingChange?: (recording: boolean) => void;
  /** Tras ~2s sin resultados de voz, muestra “Procesando…” y envía automáticamente. */
  voiceAutoSendAfterSilence?: boolean;
};

const CONTROL_Z = 999;
const OVERLAY_Z = 998;

const recordingBarPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.38), 0 8px 32px rgba(0, 0, 0, 0.35);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.55), 0 8px 28px rgba(239, 68, 68, 0.12);
  }
`;

const recordingDotBlink = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.92); }
`;

const viResponseWavePulse = keyframes`
  0%, 100% {
    transform: scaleY(0.32) translateY(6px);
    opacity: 0.45;
    filter: blur(5px);
  }
  50% {
    transform: scaleY(1) translateY(0);
    opacity: 0.95;
    filter: blur(1.5px);
  }
`;

function ViResponseWave({ reduceMotion }: { reduceMotion: boolean }) {
  const bars = 9;
  return (
    <Stack
      direction="row"
      alignItems="flex-end"
      justifyContent="center"
      aria-hidden
      sx={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 4,
        height: 28,
        pointerEvents: 'none',
        zIndex: 0,
        gap: 0.65,
        opacity: 0.85,
      }}
    >
      {Array.from({ length: bars }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            height: 22,
            borderRadius: 999,
            transformOrigin: 'center bottom',
            background:
              i % 2 === 0
                ? 'linear-gradient(180deg, rgba(34,211,238,0.95) 0%, rgba(99,102,241,0.35) 100%)'
                : 'linear-gradient(180deg, rgba(167,139,250,0.92) 0%, rgba(34,211,238,0.4) 100%)',
            boxShadow:
              i % 2 === 0
                ? '0 0 12px rgba(34,211,238,0.45), 0 0 20px rgba(99,102,241,0.2)'
                : '0 0 12px rgba(167,139,250,0.4), 0 0 18px rgba(34,211,238,0.2)',
            animation: reduceMotion ? undefined : `${viResponseWavePulse} ${1.05 + i * 0.06}s ease-in-out infinite`,
            animationDelay: reduceMotion ? undefined : `${i * 0.09}s`,
          }}
        />
      ))}
    </Stack>
  );
}

function VoiceLevelBars({ levels, reduceMotion }: { levels: number[]; reduceMotion: boolean }) {
  return (
    <Stack direction="row" alignItems="flex-end" justifyContent="center" gap={0.35} sx={{ height: 22, flexShrink: 0 }} aria-hidden>
      {levels.map((lv, i) => (
        <Box
          key={i}
          sx={{
            width: 3,
            borderRadius: 0.5,
            bgcolor: 'error.light',
            opacity: 0.75,
            height: `${Math.max(4, 5 + lv * 16)}px`,
            transition: reduceMotion ? undefined : 'height 90ms ease-out',
          }}
        />
      ))}
    </Stack>
  );
}

function AnimatedSparkle({ voiceActive = false }: { voiceActive?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex text-sky-400"
      aria-hidden
      title="Vi"
      animate={
        reduce
          ? undefined
          : voiceActive
            ? {
                scale: [1, 1.22, 1.05, 1.18, 1],
                opacity: [0.85, 1, 0.9, 1, 0.85],
                filter: [
                  'drop-shadow(0 0 10px rgba(56,189,248,0.65))',
                  'drop-shadow(0 0 22px rgba(167,139,250,0.75))',
                  'drop-shadow(0 0 14px rgba(56,189,248,0.55))',
                  'drop-shadow(0 0 20px rgba(236,72,153,0.45))',
                  'drop-shadow(0 0 10px rgba(56,189,248,0.65))',
                ],
              }
            : {
                scale: [1, 1.12, 1],
                opacity: [0.75, 1, 0.75],
                filter: [
                  'drop-shadow(0 0 6px rgba(56,189,248,0.4))',
                  'drop-shadow(0 0 14px rgba(167,139,250,0.55))',
                  'drop-shadow(0 0 6px rgba(56,189,248,0.4))',
                ],
              }
      }
      transition={
        voiceActive
          ? { duration: 1.75, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <Sparkles size={20} strokeWidth={2} className="shrink-0" />
    </motion.span>
  );
}

/**
 * Entrada tipo búsqueda con chispa animada (Vi) + voz → API → TransactionReviewDialog.
 */
export function SmartCommandBar({
  getAccessToken,
  defaultCurrency,
  onTransactionSaved,
  variant = 'default',
  onRecordingChange,
  voiceAutoSendAfterSilence = true,
}: Props) {
  const theme = useTheme();
  const { voiceMuted, setVoiceMuted, isSpeaking, cancelSpeech } = useViVoice();
  const [reviewFromVoice, setReviewFromVoice] = useState(false);
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<ParseNaturalLanguageResponse | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const onEmptyCapture = useCallback(() => {
    toast.warning('No se capturó audio en la grabación.');
  }, []);

  const runParse = useCallback(
    async (text: string, openedWithVoice: boolean) => {
      setParseError(null);
      setParsing(true);
      try {
        const res = await postParseNaturalLanguage(getAccessToken, text);
        setReviewFromVoice(openedWithVoice);
        setInitialValues(res);
        setDialogOpen(true);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : String(e));
      } finally {
        setParsing(false);
      }
    },
    [getAccessToken],
  );

  const {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    audioBlob,
    recordingTime,
    clearRecording,
    confirmedTranscript,
    interimTranscript,
    audioLevels,
    silenceProcessing,
    speechRecognitionAvailable,
  } = useViVoiceBar({
    onEmptyCapture,
    onSpeechTranscript: (text) => {
      void runParse(text, true);
    },
    onInvalidStop: (reason) => {
      if (reason === 'too_short') {
        toast.info(`Habla al menos ${VI_VOICE_MIN_SECONDS}s o escribe tu mensaje.`);
      } else {
        toast.info('No se detectó lo que dijiste. Intenta de nuevo.');
      }
    },
    autoSendAfterSilence: voiceAutoSendAfterSilence,
  });

  const voiceDeliveredRef = useRef<Blob | null>(null);
  const reduceMotion = useReducedMotion();

  const busy = parsing || audioProcessing;

  useEffect(() => {
    onRecordingChange?.(isRecording);
  }, [isRecording, onRecordingChange]);

  useEffect(() => {
    if (!isRecording) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (busy) return;
      cancelRecording();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecording, busy, cancelRecording]);

  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [confirmedTranscript, interimTranscript, isRecording]);

  useEffect(() => {
    if (!audioBlob || voiceDeliveredRef.current === audioBlob) return;
    voiceDeliveredRef.current = audioBlob;
    const mime = audioBlob.type || 'audio/webm';
    setParseError(null);
    setAudioProcessing(true);
    void (async () => {
      try {
        const res = await postProcessVoice(getAccessToken, audioBlob, mime);
        setReviewFromVoice(true);
        setInitialValues(res);
        setDialogOpen(true);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : String(e));
      } finally {
        setAudioProcessing(false);
        clearRecording();
        voiceDeliveredRef.current = null;
      }
    })();
  }, [audioBlob, getAccessToken, clearRecording]);

  const handleStartRecording = () => {
    if (busy || isRecording) return;
    cancelSpeech();
    void startRecording().catch((e: unknown) => {
      if (e instanceof VoiceRecorderPermissionError) {
        toast.warning('Necesitamos permiso de micrófono para grabar tu nota');
        return;
      }
      toast.error('No se pudo acceder al micrófono.');
    });
  };

  const handleStopAndSend = () => {
    if (!isRecording || busy) return;
    stopRecording();
  };

  const handleCancelRecording = () => {
    if (!isRecording || busy) return;
    cancelRecording();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const t = input.trim();
    if (!t || busy || isRecording) return;
    void runParse(t, false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setInitialValues(null);
    setReviewFromVoice(false);
  };

  const handleSaved = async () => {
    setInput('');
    await onTransactionSaved();
  };

  const touchTarget = {
    zIndex: CONTROL_Z,
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    pointerEvents: 'auto' as const,
    flexShrink: 0,
  };

  return (
    <>
      {isRecording ? (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: OVERLAY_Z,
            pointerEvents: 'none',
            bgcolor: 'rgba(15, 23, 42, 0.32)',
            backdropFilter: 'blur(2px)',
          }}
        />
      ) : null}
      <Box
        sx={{
          mb: variant === 'toolbar' ? 0 : 2,
          position: 'relative',
          zIndex: isRecording ? CONTROL_Z + 1 : undefined,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: isRecording
              ? alpha(theme.palette.error.main, 0.5)
              : isSpeaking && !isRecording
                ? alpha(theme.palette.info.main, 0.35)
                : 'rgba(255,255,255,0.1)',
            background: isRecording
              ? alpha(theme.palette.error.main, 0.09)
              : isSpeaking && !isRecording
                ? 'linear-gradient(180deg, rgba(34,211,238,0.06) 0%, rgba(99,102,241,0.05) 50%, rgba(255,255,255,0.03) 100%)'
              : 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            px: 0.5,
            py: 0.25,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            ...(isRecording
              ? {
                  animation: `${recordingBarPulse} 1.5s ease-in-out infinite`,
                }
              : {}),
          }}
        >
          {isSpeaking && !isRecording ? <ViResponseWave reduceMotion={Boolean(reduceMotion)} /> : null}
          {isRecording ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={0.75}
              sx={{
                px: 0.5,
                py: 0.5,
                minHeight: 52,
                pointerEvents: 'auto',
              }}
              role="status"
              aria-live="polite"
              aria-label={`Grabación activa, ${formatRecordingElapsed(recordingTime)}`}
            >
              <Tooltip title="Cancelar grabación (Escape)">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelRecording();
                  }}
                  disabled={busy}
                  aria-label="Cancelar grabación"
                  sx={{
                    ...touchTarget,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.14), color: 'error.light' },
                  }}
                >
                  <X size={22} strokeWidth={2} aria-hidden />
                </IconButton>
              </Tooltip>

              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <VoiceLevelBars levels={audioLevels} reduceMotion={Boolean(reduceMotion)} />
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.65)}`,
                    animation: reduceMotion ? undefined : `${recordingDotBlink} 1s ease-in-out infinite`,
                  }}
                  aria-hidden
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 800,
                    color: 'error.light',
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  {formatRecordingElapsed(recordingTime)}
                </Typography>
                {silenceProcessing ? (
                  <Typography variant="caption" sx={{ color: 'warning.light', fontWeight: 700, flexShrink: 0 }}>
                    Procesando…
                  </Typography>
                ) : null}
                <Box
                  ref={transcriptScrollRef}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    py: 0.25,
                    /** Oculta barra de scroll en móvil */
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                    pointerEvents: 'none',
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-block',
                      whiteSpace: 'nowrap',
                      minWidth: 'min-content',
                      maxWidth: '100%',
                      textAlign: 'left',
                    }}
                  >
                    {!speechRecognitionAvailable ? (
                      <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.5) }}>
                        Vista previa no disponible en este navegador. Sigue hablando; al detener enviaremos el audio.
                      </Typography>
                    ) : (
                      <>
                        <Box
                          component="span"
                          sx={{
                            color: theme.palette.common.white,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                          }}
                        >
                          {confirmedTranscript}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            color: alpha(theme.palette.common.white, 0.48),
                            fontWeight: 500,
                            fontSize: '0.875rem',
                          }}
                        >
                          {interimTranscript}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </Stack>

              <Tooltip title="Detener y enviar a Vi">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopAndSend();
                  }}
                  disabled={busy}
                  aria-label="Detener y enviar grabación"
                  sx={{
                    ...touchTarget,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  <Square size={18} fill="currentColor" aria-hidden />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <TextField
              variant="standard"
              fullWidth
              size="small"
              placeholder="Pregúntale a Vi o describe un movimiento…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              InputProps={{
                disableUnderline: true,
                sx: {
                  position: 'relative',
                  zIndex: 1,
                  px: 1.5,
                  pt: 1,
                  pb: isSpeaking ? 2.5 : 1,
                  minWidth: 0,
                  color: 'text.primary',
                  '& .MuiInputBase-input': {
                    minWidth: 0,
                    textOverflow: 'ellipsis',
                  },
                  '&::placeholder': { color: '#94a3b8', opacity: 1 },
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mr: 0.5 }}>
                      <Search size={18} className="shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
                      <AnimatedSparkle voiceActive={isSpeaking} />
                    </Stack>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ mr: 0.25, alignSelf: 'stretch' }}>
                    <Stack direction="row" alignItems="center" spacing={0.25}>
                      <Tooltip
                        title={
                          voiceMuted
                            ? 'Activar voz de Vi (confirmaciones habladas)'
                            : 'Silenciar voz de Vi'
                        }
                      >
                        <IconButton
                          size="small"
                          aria-label={voiceMuted ? 'Activar voz de Vi' : 'Silenciar voz de Vi'}
                          aria-pressed={voiceMuted}
                          onClick={(e) => {
                            e.stopPropagation();
                            setVoiceMuted(!voiceMuted);
                          }}
                          sx={{ pointerEvents: 'auto', flexShrink: 0, color: 'text.secondary' }}
                        >
                          {voiceMuted ? <VolumeX size={20} strokeWidth={2} /> : <Volume2 size={20} strokeWidth={2} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={audioProcessing ? 'Procesando audio…' : 'Dictar con el micrófono'}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRecording();
                          }}
                          disabled={busy}
                          aria-busy={audioProcessing}
                          aria-label={audioProcessing ? 'Procesando audio' : 'Iniciar grabación de voz'}
                          sx={{
                            pointerEvents: 'auto',
                            flexShrink: 0,
                          }}
                        >
                          {audioProcessing ? (
                            <CircularProgress size={20} thickness={5} color="primary" />
                          ) : (
                            <Mic size={20} strokeWidth={2} aria-hidden />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </InputAdornment>
                ),
              }}
            />
          )}
        </Box>
        {busy ? (
          <Box sx={{ mt: 1 }}>
            {audioProcessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={22} thickness={5} color="primary" />
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Vi está procesando tu audio…
                </Typography>
              </Box>
            ) : (
              <>
                <LinearProgress
                  color="secondary"
                  sx={{
                    height: 3,
                    borderRadius: 9999,
                    width: '100%',
                    opacity: 0.9,
                  }}
                />
                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#94a3b8' }}>
                  Vi interpreta tu mensaje…
                </Typography>
              </>
            )}
          </Box>
        ) : null}
        {parseError ? (
          <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setParseError(null)}>
            {parseError}
          </Alert>
        ) : null}
      </Box>

      <TransactionReviewDialog
        open={dialogOpen}
        onClose={closeDialog}
        getAccessToken={getAccessToken}
        defaultCurrency={defaultCurrency}
        initialValues={initialValues}
        onSaved={handleSaved}
        allowVoiceTts={reviewFromVoice}
      />
    </>
  );
}
