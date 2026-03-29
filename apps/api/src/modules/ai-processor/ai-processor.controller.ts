import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import * as path from 'node:path';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { AiParserService } from './ai-parser.service';
import { AiProcessorService } from './ai-processor.service';
import { ParseNaturalLanguageDto } from './dto/parse-natural-language.dto';
import { SavingsAdviceDto } from './dto/savings-advice.dto';
import { NaturalLanguageParseService } from './natural-language-parse.service';
import { VoiceTranscriptionService } from './voice-transcription.service';

const PROCESS_VOICE_MAX_BYTES = 5 * 1024 * 1024;

function processVoiceFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
): void {
  const base = (file.mimetype ?? '').split(';')[0].trim().toLowerCase();
  const allowed = new Set([
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'video/webm',
    'video/mp4',
  ]);
  if (allowed.has(base)) {
    cb(null, true);
    return;
  }
  const loose =
    base === '' ||
    base === 'application/octet-stream' ||
    base === 'binary/octet-stream';
  const ext = path.extname(file.originalname ?? '').toLowerCase();
  const okExt = new Set(['.webm', '.mp4', '.m4a', '.mpeg', '.mp3', '.mpga']);
  if (loose && okExt.has(ext)) {
    cb(null, true);
    return;
  }
  cb(
    new BadRequestException(
      'Formato de audio no admitido. Usa audio/webm, audio/mp4 o audio/mpeg (máx. 5 MB).',
    ),
    false,
  );
}

@Controller('ai-processor')
export class AiProcessorController {
  constructor(
    private readonly ai: AiProcessorService,
    private readonly aiParser: AiParserService,
    private readonly naturalLanguageParse: NaturalLanguageParseService,
  ) {}

  @Get('health')
  @Public()
  health() {
    return this.ai.health();
  }

  @Post('savings-advice')
  @HttpCode(200)
  savingsAdvice(@Body() body: SavingsAdviceDto): Promise<{ advice: string }> {
    return this.aiParser.getSavingsAdvice(body.summary).then((advice) => ({ advice }));
  }

  @Post('parse-natural-language')
  @HttpCode(200)
  parseNaturalLanguage(
    @CurrentUser('id') userId: string,
    @Body() body: ParseNaturalLanguageDto,
  ) {
    return this.naturalLanguageParse.parseForUser(userId, body.text);
  }
}

/**
 * Dictado de voz → Whisper + parser (ruta `/ai/process-voice`; mismo módulo que `AiProcessorController`).
 */
@Controller('ai')
export class AiVoiceController {
  constructor(private readonly voiceTranscription: VoiceTranscriptionService) {}

  @Post('process-voice')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: PROCESS_VOICE_MAX_BYTES },
      fileFilter: processVoiceFileFilter,
    }),
  )
  async processVoice(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta el archivo de audio.');
    }
    return this.voiceTranscription.processVoice(userId, file);
  }
}
