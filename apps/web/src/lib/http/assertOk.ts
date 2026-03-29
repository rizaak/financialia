import { HttpRequestError } from './HttpRequestError';
import { parseNestErrorBody } from './parseNestErrorBody';

/** Lanza HttpRequestError si `res` no es ok. Consume el cuerpo de la respuesta. */
export async function assertOk(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  throw new HttpRequestError(parseNestErrorBody(text), res.status, text);
}
