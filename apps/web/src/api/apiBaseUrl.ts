/**
 * Base del API Nest. Si `VITE_API_URL` falta o es cadena vacía (muy común en .env),
 * `fetch` usaría rutas relativas al origen de Vite (5173) y devolvería 404.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    return 'http://localhost:3000';
  }
  return raw.replace(/\/+$/, '');
}
