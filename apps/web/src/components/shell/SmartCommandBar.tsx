import {
  Alert,
  Backdrop,
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
import { Mic, Sparkles, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ParseNaturalLanguageResponse } from '../../api/fetchParseNaturalLanguage';
import { postParseNaturalLanguage } from '../../api/fetchParseNaturalLanguage';
import { postProcessVoice } from '../../api/fetchProcessVoice';
import { useVoiceRecorder, VoiceRecorderPermissionError } from '../../hooks/useVoiceRecorder';
import { formatRecordingElapsed } from '../../lib/voiceRecording';
import { TransactionReviewDialog } from './TransactionReviewDialog';

type Props = {
  getAccessToken: () => Promise<string>;
  defaultCurrency: string;
  onTransactionSaved: () => void | Promise<void>;
  /** `toolbar`: sin margen inferior (uso en AppBar). */
  variant?: 'default' | 'toolbar';
};

/**
 * Entrada inteligente: texto o voz → API → TransactionReviewDialog.
 * Voz: `useVoiceRecorder` + `useEffect` en `audioBlob` → POST /ai/process-voice.
 */
export function SmartCommandBar({
  getAccessToken,
  defaultCurrency,
  onTransactionSaved,
  variant = 'default',
}: Props) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [audioProcessing, setAudioProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialValues, setInitialValues] = useState<ParseNaturalLanguageResponse | null>(null);

  const onEmptyCapture = useCallback(() => {
    toast.warning('No se capturó audio en la grabación.');
  }, []);

  const {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    recordingTime,
    clearRecording,
  } = useVoiceRecorder({ onEmptyCapture });

  const voiceDeliveredRef = useRef<Blob | null>(null);

  const busy = parsing || audioProcessing;

  const runParse = useCallback(
    async (text: string) => {
      setParseError(null);
      setParsing(true);
      try {
        const res = await postParseNaturalLanguage(getAccessToken, text);
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

  useEffect(() => {
    if (!audioBlob || voiceDeliveredRef.current === audioBlob) return;
    voiceDeliveredRef.current = audioBlob;
    const mime = audioBlob.type || 'audio/webm';
    setParseError(null);
    setAudioProcessing(true);
    void (async () => {
      try {
        const res = await postProcessVoice(getAccessToken, audioBlob, mime);
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

  const handleMicClick = () => {
    if (busy) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording().catch((e: unknown) => {
      if (e instanceof VoiceRecorderPermissionError) {
        toast.warning(
          '⚠️ Necesitamos permiso de micrófono para grabar tu nota',
        );
        return;
      }
      toast.error('No se pudo acceder al micrófono.');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const t = input.trim();
    if (!t || busy || isRecording) return;
    void runParse(t);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setInitialValues(null);
  };

  const handleSaved = async () => {
    setInput('');
    await onTransactionSaved();
  };

  return (
    <>
      <Backdrop
        open={isRecording}
        sx={{
          zIndex: theme.zIndex.modal - 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'common.white' }}>
          <CircularProgress size={28} color="inherit" />
          <Typography variant="subtitle1" fontWeight={700}>
            Grabando… {formatRecordingElapsed(recordingTime)} — pulsa el micrófono otra vez para enviar
          </Typography>
        </Box>
      </Backdrop>

      <Box sx={{ mb: variant === 'toolbar' ? 0 : 2 }}>
        <TextField
          variant="outlined"
          fullWidth
          size="small"
          placeholder="¿Qué pasó hoy? (Ej: Gasté 200 en tacos con BBVA)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy || isRecording}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 9999,
              pl: 1.25,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span
                  className="inline-flex text-violet-600 dark:text-amber-400"
                  aria-hidden
                  title="Asistente IA"
                >
                  <Sparkles size={20} strokeWidth={2} className="shrink-0" />
                </span>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ mr: 0.25 }}>
                <Tooltip
                  title={
                    audioProcessing && !isRecording
                      ? 'Procesando audio…'
                      : isRecording
                        ? 'Detener y transcribir'
                        : 'Dictar con el micrófono'
                  }
                >
                  <Stack
                    component="span"
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{
                      position: 'relative',
                      zIndex: isRecording ? theme.zIndex.modal + 2 : undefined,
                      display: 'inline-flex',
                    }}
                  >
                    {isRecording ? (
                      <Typography
                        variant="caption"
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: 'error.main',
                          minWidth: '3.25rem',
                        }}
                        aria-live="polite"
                      >
                        {formatRecordingElapsed(recordingTime)}
                      </Typography>
                    ) : null}
                    <IconButton
                      onClick={handleMicClick}
                      disabled={busy}
                      size="small"
                      aria-pressed={isRecording}
                      aria-busy={audioProcessing && !isRecording}
                      aria-label={
                        audioProcessing && !isRecording
                          ? 'Procesando audio'
                          : isRecording
                            ? 'Detener grabación'
                            : 'Iniciar grabación de voz'
                      }
                      className={isRecording ? 'animate-pulse' : undefined}
                      sx={
                        isRecording
                          ? {
                              bgcolor: 'error.main',
                              color: 'error.contrastText',
                              '&:hover': { bgcolor: 'error.dark' },
                            }
                          : {}
                      }
                    >
                      {audioProcessing && !isRecording ? (
                        <CircularProgress size={20} thickness={5} color="primary" />
                      ) : isRecording ? (
                        <Square size={16} fill="currentColor" />
                      ) : (
                        <Mic size={20} strokeWidth={2} />
                      )}
                    </IconButton>
                  </Stack>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
        {busy ? (
          <Box sx={{ mt: 1 }}>
            {audioProcessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={22} thickness={5} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  La IA está escuchando…
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
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Interpretando tu mensaje…
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
      />
    </>
  );
}
