import { Injectable } from '@nestjs/common';

/**
 * Punto de extensión para NLP, webhooks (WhatsApp/Telegram) y clasificación asistida.
 */
@Injectable()
export class AiProcessorService {
  health(): { ok: boolean; module: string } {
    return { ok: true, module: 'ai-processor' };
  }
}
