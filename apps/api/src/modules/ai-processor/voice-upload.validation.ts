import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';
import * as path from 'node:path';

/**
 * Tipos base admitidos por Whisper / grabación típica en navegador.
 * Se normaliza quitando parámetros (`audio/webm; codecs=opus` → `audio/webm`).
 */
const ALLOWED_AUDIO_BASE_MIMES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'video/webm',
  'video/mp4',
]);

/** Extensiones alineadas con formatos de audio seguros para Whisper. */
const ALLOWED_EXTENSIONS = new Set([
  '.webm',
  '.mp3',
  '.m4a',
  '.mp4',
  '.mpeg',
  '.mpga',
  '.wav',
  '.ogg',
  '.oga',
  '.flac',
]);

function normalizeBaseMime(mimetype: string | undefined): string {
  if (!mimetype?.trim()) {
    return '';
  }
  return mimetype.split(';')[0].trim().toLowerCase();
}

/**
 * Rechaza uploads que no parezcan audio (evita procesar ejecutables u otros tipos).
 */
export function assertAllowedVoiceUpload(file: Express.Multer.File): void {
  const baseMime = normalizeBaseMime(file.mimetype);
  const ext = path.extname(file.originalname ?? '').toLowerCase();

  if (ALLOWED_AUDIO_BASE_MIMES.has(baseMime)) {
    return;
  }

  const looseBinary =
    baseMime === '' ||
    baseMime === 'application/octet-stream' ||
    baseMime === 'binary/octet-stream';

  if (looseBinary && ALLOWED_EXTENSIONS.has(ext)) {
    return;
  }

  throw new BadRequestException(
    'Formato de audio no admitido. Envía un archivo de audio (p. ej. webm, mp3, m4a, wav, ogg).',
  );
}

/** MIME base admitidos para POST /ai/process-voice (Whisper + parser). */
const PROCESS_VOICE_BASE_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  /** Algunos navegadores etiquetan grabaciones webm/mp4 como video. */
  'video/webm',
  'video/mp4',
]);

const PROCESS_VOICE_LOOSE_EXTENSIONS = new Set([
  '.webm',
  '.mp4',
  '.m4a',
  '.mpeg',
  '.mp3',
  '.mpga',
]);

/**
 * Validación estricta para dictado: webm / mp4 / mpeg (y variantes típicas del navegador).
 */
export function assertProcessVoiceStrict(file: Express.Multer.File): void {
  const baseMime = normalizeBaseMime(file.mimetype);
  const ext = path.extname(file.originalname ?? '').toLowerCase();

  if (PROCESS_VOICE_BASE_MIMES.has(baseMime)) {
    return;
  }

  const looseBinary =
    baseMime === '' ||
    baseMime === 'application/octet-stream' ||
    baseMime === 'binary/octet-stream';

  if (looseBinary && PROCESS_VOICE_LOOSE_EXTENSIONS.has(ext)) {
    return;
  }

  throw new BadRequestException(
    'Formato de audio no admitido. Usa audio/webm, audio/mp4 o audio/mpeg (máx. 5 MB).',
  );
}
