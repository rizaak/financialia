import { isAxiosError } from 'axios';
import { HttpRequestError } from '../lib/http/HttpRequestError';
import { parseNestErrorBody } from '../lib/http/parseNestErrorBody';
import { createApiClient } from '../services/api.service';
import type { ParseNaturalLanguageResponse } from './fetchParseNaturalLanguage';

function filenameForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('webm')) return 'recording.webm';
  if (m.includes('mp4') || m.includes('m4a')) return 'recording.m4a';
  if (m.includes('ogg')) return 'recording.ogg';
  return 'recording.webm';
}

export async function postProcessVoice(
  getAccessToken: () => Promise<string>,
  blob: Blob,
  mimeType: string,
): Promise<ParseNaturalLanguageResponse> {
  const client = createApiClient(getAccessToken);
  const form = new FormData();
  form.append('audio', blob, filenameForMime(mimeType || blob.type || 'audio/webm'));

  try {
    const { data } = await client.post<ParseNaturalLanguageResponse>('/ai/process-voice', form);
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response) {
      const raw =
        typeof e.response.data === 'string'
          ? e.response.data
          : JSON.stringify(e.response.data ?? '');
      throw new HttpRequestError(parseNestErrorBody(raw), e.response.status, raw);
    }
    throw e;
  }
}
