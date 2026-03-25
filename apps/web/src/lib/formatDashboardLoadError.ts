export function formatDashboardLoadError(e: unknown): string {
  const msg = e instanceof Error ? e.message : '';

  if (/\b404\b/i.test(msg)) {
    return 'No pudimos obtener la información. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (
    /\b401\b/i.test(msg) ||
    msg.includes('Unauthorized') ||
    msg.includes('"statusCode":401')
  ) {
    return 'Tu sesión no es válida o ha caducado. Cierra sesión e inicia de nuevo.';
  }

  if (msg && msg.length < 200 && !msg.includes('{')) {
    return msg;
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
