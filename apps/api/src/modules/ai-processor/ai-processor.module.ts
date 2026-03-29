import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CategoriesModule } from '../categories/categories.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { InvestmentsModule } from '../investments/investments.module';
import { LoansModule } from '../loans/loans.module';
import { AiQueryController } from './ai-query.controller';
import { AiParserService } from './ai-parser.service';
import { AiProcessorController, AiVoiceController } from './ai-processor.controller';
import { AiProcessorService } from './ai-processor.service';
import { FinancialQueryService } from './financial-query.service';
import { NaturalLanguageParseService } from './natural-language-parse.service';
import { VoiceTranscriptionService } from './voice-transcription.service';

@Module({
  imports: [AccountsModule, CategoriesModule, DashboardModule, InvestmentsModule, LoansModule],
  controllers: [AiProcessorController, AiVoiceController, AiQueryController],
  providers: [
    AiProcessorService,
    AiParserService,
    NaturalLanguageParseService,
    FinancialQueryService,
    VoiceTranscriptionService,
  ],
  exports: [AiProcessorService, AiParserService, NaturalLanguageParseService],
})
export class AiProcessorModule {}
