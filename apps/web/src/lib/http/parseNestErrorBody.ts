/**
 * Extrae texto legible del JSON de error de Nest (`{ message: string | string[] }`)
 * o devuelve un mensaje genérico si el cuerpo no es JSON.
 */
export function parseNestErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'No pudimos completar la operación. Inténtalo de nuevo más tarde.';
  }
  try {
    const j = JSON.parse(trimmed) as { message?: unknown; error?: string };
    if (Array.isArray(j.message)) {
      return j.message.map(String).join(', ');
    }
    if (typeof j.message === 'string') {
      return j.message;
    }
    if (typeof j.error === 'string') {
      return j.error;
    }
  } catch {
    /* no es JSON */
  }
  if (trimmed.length < 400 && !trimmed.startsWith('<')) {
    return trimmed;
  }
  return 'El servidor respondió con un error. Inténtalo de nuevo más tarde.';
}

/**
 * Mapea mensajes conocidos del backend a copy más clara para el usuario.
 */
export function humanizeApiMessage(message: string): string {
  const m = message.trim();
  if (/saldo insuficiente/i.test(m) || /insufficient.*balance/i.test(m)) {
    return '⚠️ No tienes saldo suficiente en esta cuenta para completar la operación.';
  }
  if (/no autorizado|unauthorized|401/i.test(m)) {
    return '⚠️ Tu sesión expiró o no tienes permiso. Vuelve a iniciar sesión.';
  }
  if (/not found|no encontrad/i.test(m) && m.length < 120) {
    return 'No encontramos el recurso solicitado.';
  }
  return m;
}
