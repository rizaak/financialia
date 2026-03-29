import { Injectable } from '@nestjs/common';
import { AccountType, TransactionType } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { AiParserService } from './ai-parser.service';
import { mapAiLabelToSlug } from './ai-category-map';
import type { NaturalLanguageParseResult, TransactionParseResult } from './types/ai-parser.types';

export type ParseNaturalLanguageForUserResponse = NaturalLanguageParseResult & {
  /** Para POST /transactions (solo EXPENSE | INCOME). */
  transactionType: 'EXPENSE' | 'INCOME';
  /** Tipo inferido por la IA (incluye INVESTMENT). */
  aiTransactionType: 'EXPENSE' | 'INCOME' | 'INVESTMENT';
  suggestedAccountId: string | null;
  suggestedCategoryId: string | null;
};

@Injectable()
export class NaturalLanguageParseService {
  constructor(
    private readonly aiParser: AiParserService,
    private readonly accounts: AccountsService,
    private readonly categories: CategoriesService,
  ) {}

  async parseForUser(userId: string, text: string): Promise<ParseNaturalLanguageForUserResponse> {
    await this.categories.ensureDefaultsForUser(userId);
    const accountRows = await this.accounts.listAccounts(userId);
    const names = accountRows.map((a) => a.name);
    const accountPromptLines = accountRows.map((a) =>
      a.type === AccountType.CREDIT_CARD
        ? `${a.name} [tarjeta de crédito: cargos = más deuda, no menos efectivo]`
        : a.name,
    );
    const { raw: parsed } = await this.aiParser.parseNaturalLanguageWithRaw(
      text,
      names,
      accountPromptLines,
    );

    const transactionType = this.mapToApiTransactionType(parsed);
    const prismaKind = transactionType === 'EXPENSE' ? TransactionType.EXPENSE : TransactionType.INCOME;

    const suggestedAccountId =
      parsed.accountName != null
        ? accountRows.find((a) => a.name === parsed.accountName)?.id ?? null
        : null;

    const suggestedCategoryId = await this.resolveCategoryId(userId, parsed.category, prismaKind);

    const matchedAccount =
      parsed.accountName != null ? accountRows.find((a) => a.name === parsed.accountName) : undefined;
    const creditCardExpenseAcknowledgment =
      transactionType === 'EXPENSE' && matchedAccount?.type === AccountType.CREDIT_CARD
        ? (() => {
            const curCode = matchedAccount.currency.toUpperCase().slice(0, 3);
            const formatted = new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: curCode,
              maximumFractionDigits: 2,
            }).format(parsed.amount);
            return `He registrado ${formatted} de deuda en tu tarjeta ${matchedAccount.name}. Tu efectivo no ha cambiado, pero tu Patrimonio Neto bajó.`;
          })()
        : null;

    const natural: NaturalLanguageParseResult = {
      amount: parsed.amount,
      description: parsed.description,
      category: parsed.category,
      targetAccount:
        parsed.accountName != null && names.includes(parsed.accountName) ? parsed.accountName : null,
      isInvestment: parsed.transactionType === 'INVESTMENT',
      installmentPurchase: parsed.installmentPurchase,
      installmentMonths: parsed.installmentMonths,
      installmentInterestFree: parsed.installmentInterestFree,
      isInstallment: parsed.isInstallment,
      creditCardExpenseAcknowledgment,
    };

    return {
      ...natural,
      transactionType,
      aiTransactionType: parsed.transactionType,
      suggestedAccountId,
      suggestedCategoryId,
    };
  }

  /** La API de transacciones solo admite EXPENSE/INCOME; INVESTMENT se trata como gasto/inversión en UI. */
  private mapToApiTransactionType(parsed: TransactionParseResult): 'EXPENSE' | 'INCOME' {
    if (parsed.transactionType === 'INCOME') {
      return 'INCOME';
    }
    return 'EXPENSE';
  }

  private async resolveCategoryId(
    userId: string,
    aiLabel: string,
    kind: TransactionType,
  ): Promise<string | null> {
    const list = await this.categories.listForUser(userId, false, kind);
    if (list.length === 0) {
      return null;
    }
    const slug = mapAiLabelToSlug(aiLabel, kind);
    const bySlug = list.find((c) => c.slug === slug);
    if (bySlug) {
      return bySlug.id;
    }
    const fallbackSlug = kind === TransactionType.EXPENSE ? 'otros' : 'otros-ingreso';
    const fallback = list.find((c) => c.slug === fallbackSlug);
    return fallback?.id ?? list[0]?.id ?? null;
  }
}
