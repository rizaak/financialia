import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { Express } from 'express';
import { AiParserService } from './ai-parser.service';
import { NaturalLanguageParseService } from './natural-language-parse.service';
import type { ParseNaturalLanguageForUserResponse } from './natural-language-parse.service';

@Injectable()
export class VoiceTranscriptionService {
  constructor(
    private readonly aiParser: AiParserService,
    private readonly naturalLanguageParse: NaturalLanguageParseService,
  ) {}

  /**
   * Whisper → texto → `parseForUser` (parseNaturalLanguageWithRaw + IDs de categoría/cuenta).
   * El paso “parser” equivale a `parseNaturalLanguage` vía `parseForUser` (una sola llamada LLM al parser).
   * `AiParserService.processVoice` documenta Whisper + `parseNaturalLanguage` sin resolver IDs.
   */
  async processVoice(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ParseNaturalLanguageForUserResponse> {
    const text = await this.aiParser.transcribeAudio(file, { assertMime: 'processVoiceStrict' });
    if (!text) {
      throw new BadRequestException('No se detectó texto en el audio.');
    }
    return this.naturalLanguageParse.parseForUser(userId, text);
  }
}
