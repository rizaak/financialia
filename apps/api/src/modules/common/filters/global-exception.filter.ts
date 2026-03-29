import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Asegura respuestas JSON con `message` legible. Los {@link HttpException} ya vienen
 * con mensaje del dominio; el resto se oculta al cliente.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message: string | string[];
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = (body as { message: unknown }).message;
        message = Array.isArray(m) ? m.map(String) : String(m);
      } else {
        message = exception.message;
      }
      response.status(status).json({
        statusCode: status,
        message,
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Algo salió mal en el servidor. Inténtalo de nuevo más tarde.',
    });
  }
}
