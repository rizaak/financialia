/** Error HTTP con mensaje ya parseado desde el cuerpo de respuesta (p. ej. Nest). */
export class HttpRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rawBody?: string,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}
