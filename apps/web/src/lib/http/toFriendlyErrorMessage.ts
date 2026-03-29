import { HttpRequestError } from './HttpRequestError';
import { humanizeApiMessage, parseNestErrorBody } from './parseNestErrorBody';

export function toFriendlyErrorMessage(error: unknown): string {
  if (error instanceof HttpRequestError) {
    return humanizeApiMessage(error.message);
  }
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg.startsWith('{') || msg.startsWith('[')) {
      try {
        return humanizeApiMessage(parseNestErrorBody(msg));
      } catch {
        /* fall through */
      }
    }
    return humanizeApiMessage(msg);
  }
  return 'Inténtalo de nuevo más tarde.';
}
