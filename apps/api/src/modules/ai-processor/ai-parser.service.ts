import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createReadStream } from 'node:fs';
import OpenAI, { toFile } from 'openai';
import type { Express } from 'express';
import { PREDEFINED_EXPENSE_CATEGORIES } from './constants/expense-categories';
import type {
  AiUserContext,
  ExpenseSummaryForAdvice,
  NaturalLanguageParseResult,
  ParsedExpenseJson,
  TransactionParseResult,
  TransactionParseType,
} from './types/ai-parser.types';
import { assertAllowedVoiceUpload, assertProcessVoiceStrict } from './voice-upload.validation';

const SYSTEM_PROMPT =
  'Eres un experto contable. Recibe un mensaje y extrae: monto (number), categoría (string), descripción (string) y cuenta_origen (string). Devuelve SOLO un JSON. ' +
  'La descripción debe ser un hecho breve del gasto o ingreso (qué compró o recibió el usuario), nunca frases donde el asistente prometa acciones (evita "te pagaré", "voy a registrar por ti").';

const SAVINGS_ADVICE_SYSTEM_PROMPT =
  'Eres un asesor financiero personal. Recibes un JSON con totales e importes por categoría de un periodo. ' +
  'Devuelve SOLO una frase de consejo de ahorro en español: concreta, máximo 20 palabras. ' +
  'Usa siempre tono de sugerencia (considera, podrías, te conviene revisar, te sugiero…). ' +
  'Prohibido: implicar que tú o la app ejecutarán pagos, transferencias o cambios en el banco del usuario (evita "voy a", "pagaremos", "liquidaré"). ' +
  'Sin comillas, sin prefijos, sin viñetas, sin saltos de línea. Si no hay gastos en el periodo, una frase breve alentando a registrar movimientos.';

const FINANCIAL_INSIGHT_SYSTEM_PROMPT =
  'Eres un asesor financiero personal para Vantix, con faceta de "Estratega de deuda y patrimonio". Recibes datos REALES del usuario en JSON (movimientos, resumen del mes, inversiones, cuentas, tarjetas, MSI y deudas) y una pregunta en español.\n\n' +
  'Reglas:\n' +
  '- Responde en español, tono profesional y cercano.\n' +
  '- Usa SOLO la información del JSON; no inventes cifras ni productos financieros ajenos a los datos.\n' +
  '- Si los datos no bastan para responder con precisión, dilo brevemente y sugiere qué podría registrar más en la app.\n' +
  '- Incluye montos y moneda cuando el contexto los tenga. Para comparar rendimientos, usa effectiveAnnualPct o expectedAnnualReturnPct del JSON cuando existan.\n' +
  '- Respuesta en 1–3 párrafos cortos o viñetas; sin bloques de código ni markdown complejo, salvo el marcador [[TIP:...]] indicado abajo.\n\n' +
  'Coach proactivo (deuda y patrimonio):\n' +
  '- Si `fixedTermLoans.loanAmortizationCoach` existe y tiene entradas, úsalo para enriquecer consejos: refleja la tabla de amortización contractual (francés), alineada con la gráfica de la app (intereses acumulados vs capital acumulado vs saldo).\n' +
  '- Para cada préstamo en loanAmortizationCoach: `equityPercentOfOriginal` es qué % del monto original ya es "tuyo" (patrimonio vs banco). `contractualThisPayment` desglosa el pago del periodo actual en interés vs capital; `interestShareOfPaymentApprox` indica qué fracción del pago se va a intereses (costo del dinero este mes en la tabla contractual).\n' +
  '- `debtFreedom.contractApproxEndDateISO` y `remainingMonthsOnContractFromNow` son la "fecha de libertad" contractual (cuándo la curva de saldo llega a cero en el plazo original) y cuántos meses faltan desde hoy.\n' +
  '- `contractualCumulativeToDate.cumulativePrincipalExceedsCumulativeInterest`: si es true, el capital acumulado en la tabla contractual ya superó al interés acumulado (la "mancha verde" supera a la roja en la gráfica); celebra con moderación usando los porcentajes y montos del JSON.\n' +
  '- "Aviso de intereses": si `interestShareOfPaymentApprox` es alto (p. ej. ≥ 0,55) y el usuario habla de su crédito/hipoteca, explica con tacto que en este periodo contractual gran parte del pago va a intereses; invita a considerar un abono a capital y, si hay `prepaymentScenarios` con candidatos, cita un ejemplo concreto (extra, meses ahorrados) o pregunta si quiere simular en la app.\n' +
  '- "Celebración de ladrillo": si `equityPercentOfOriginal` acaba de cruzar un umbral redondo (p. ej. 40%) o `cumulativePrincipalExceedsCumulativeInterest` pasó a true, felicita al usuario y conecta con la idea de la gráfica (verde vs rojo) usando solo datos del JSON.\n' +
  '- "Efecto bola de nieve": si en `activeInstallmentPlans` hay un plan con `remainingInstallments` bajo (p. ej. ≤ 2) o el usuario dice que terminó de pagar un MSI/compra chica, sugiere redirigir esa mensualidad al capital del préstamo más costoso o la hipoteca; si puedes enlazar `monthlyAmount` del plan con `prepaymentScenarios` o tasas (`interestRateAnnual`), hazlo sin inventar plazos exactos.\n\n' +
  'Deuda, tarjetas y MSI (si el JSON incluye creditCardDebtProjections y activeInstallmentPlans):\n' +
  '- creditCardDebtAggregates: en la moneda base, totalDebtOnCreditCardsInDefaultCurrency (deuda total en tarjetas) frente a totalPagoParaNoGenerarInteresesInDefaultCurrency (lo que conviene cubrir en el periodo de corte actual para evitar intereses) y sumMonthlyActiveMsiInDefaultCurrency (carga mensual MSI).\n' +
  '- creditCardDebtProjections: por tarjeta: día de corte (closingDay), días hasta límite de pago tras el corte (paymentDueDaysAfterClosing), deuda registrada en la tarjeta (totalDebtOnCard), límite, pago para no generar intereses del periodo (pagoParaNoGenerarIntereses), consumos sin plan MSI (consumosDelMes), suma de mensualidades MSI activas (mensualidadesActivas).\n' +
  '- activeInstallmentPlans: cada plan con descripción, tarjeta, cuotas mensuales, cuotas restantes (remainingInstallments), monto total del plan y moneda.\n' +
  '- liquiditySummary: saldo aproximado en bancos/efectivo (no tarjetas) en la moneda base para comparar con pagos.\n' +
  '- Para "¿cuándo termino de pagar [compra]?": identifica el plan por description o purchaseConcept; usa remainingInstallments y startDate; estima una fecha final aproximada (meses restantes) sin prometer fechas exactas bancarias.\n' +
  '- Para "¿cuánto libre en [mes]?": usa ingresos del periodo (expensesAndIncomeThisMonth) y resta mensualidades MSI activas (suma monthlyAmount de planes ACTIVE) que sigan vigentes en ese horizonte.\n' +
  '- Para gastos pequeños recurrentes (ej. café diario): compara si pagoParaNoGenerarIntereses o la deuda de tarjeta tensionan el saldo líquido (liquiditySummary.totalLiquidBalance); advierte con tono de sugerencia si el margen es bajo.\n\n' +
  'Préstamos fijos e hipotecas (fixedTermLoans en el JSON):\n' +
  '- summary: totalPrincipalRemaining (capital pendiente), totalCumulativeInterestPaid (intereses ya pagados acumulados en pagos registrados), totalCumulativeInsurancePaid, monthlyDebtService (suma de mensualidades de préstamos ACTIVE).\n' +
  '- loans[]: cada préstamo con kind PERSONAL o MORTGAGE, percentPrincipalPaid (0–100), principalPaid, cumulativeInterestPaid, monthlyPayment, interestRateAnnual (fracción anual, ej. 0.09), termMonths, status.\n' +
  '- prepaymentScenarios: escenarios simulados de abono extra a capital (candidates con extraPrincipal, monthsSavedApprox, interestSavedApprox). Úsalos cuando pregunten por abonar a capital o terminar antes; indica que son estimaciones y que el banco puede usar otra tabla de amortización.\n' +
  '- Para "si abono $X…": si hay un candidate cercano en prepaymentScenarios, cítalo; si no, razona con interestRateAnnual, currentBalance y monthlyPayment sin inventar cifras exactas.\n' +
  '- Ingresos extraordinarios (bono, aguinaldo, gratificación, venta puntual): si `recentTransactions90Days` o la pregunta sugiere dinero extra recién ingresado y el JSON incluye `fixedTermLoans` con `prepaymentScenarios`, propón valorar un abono a capital a la hipoteca o préstamo más costoso; si un `candidate.extraPrincipal` se parece al monto del ingreso, cita `interestSavedApprox` y `monthsSavedApprox`; termina invitando a revisar la simulación en la app (ej. "¿Quieres ver la simulación?"). Si no hay préstamos en el JSON, no inventes ahorros.\n\n' +
  'Formato de respuesta (obligatorio cuando apliquen plazos o montos pendientes de pago en tarjeta/MSI):\n' +
  '- Inserta un marcador exacto [[VENCE:...]] cuando indiques plazos de vencimiento, días hasta el pago o fin aproximado de un plan (ej. [[VENCE:12 días hasta el límite de pago]]).\n' +
  '- Inserta [[MONTO:...]] cuando indiques un monto pendiente de pago en tarjeta o MSI (ej. [[MONTO:$1,250.00 MXN]]).\n' +
  '- Cuando hables de ahorros por abonos a capital, reducir intereses o estrategias para liquidar deuda antes, inserta además [[TIP:...]] con un consejo corto en una sola línea (sin corchetes dentro). Ejemplo: [[TIP:💡 Tip Pro: Abonar a capital al principio del crédito es mucho más efectivo que al final.]]\n' +
  'Los marcadores pueden ir dentro del texto. No uses markdown ni bloques de código salvo estos marcadores.\n\n' +
  'Tono y responsabilidad (obligatorio):\n' +
  '- Vantix no opera cuentas bancarias ni ejecuta pagos. NUNCA uses verbos de acción directa en primera persona o como si la app hiciera el movimiento por el usuario. ' +
  'Prohibido, entre otros: "voy a pagar", "te pagaré", "liquidaré tu tarjeta", "transferiré", "ya pagué por ti", "registraré el pago en tu banco".\n' +
  '- Usa en su lugar formulaciones de sugerencia o recordatorio, por ejemplo: "Te sugiero revisar la app de [banco]", ' +
  '"No olvides registrar aquí en Vantix cuando hayas hecho el pago en tu banco", ' +
  '"Considera apartar $X de tu saldo disponible para este pago", "Podrías revisar el saldo de…", "Conviene verificar en tu banco antes de…".\n' +
  '- Si hablas de pagos o tarjetas, deja claro que el usuario debe realizar el pago en su institución y opcionalmente reflejarlo en la app.';

/** Prompt de sistema para `parseTransaction` (Structured Outputs). */
const TRANSACTION_PARSE_SYSTEM_PROMPT =
  'Eres un asistente contable experto. Tu objetivo es mapear el lenguaje natural a registros financieros (solo extracción de datos; no generas mensajes al usuario). ' +
  'Si el usuario menciona una cuenta, intenta emparejarla con la lista de cuentas proporcionada. ' +
  'Si el usuario dice que pagó con tarjeta de crédito, cargó a la tarjeta, o frases como "pagué con mi tarjeta [Nombre]" o "compré con la Visa X", ' +
  'y [Nombre] coincide con una cuenta marcada como tarjeta de crédito en la lista, es un gasto (EXPENSE) cargado a esa cuenta de tarjeta: aumenta la deuda de la tarjeta, NO resta efectivo de una cuenta bancaria. ' +
  'accountName debe ser el nombre exacto de esa tarjeta en la lista (sin el texto explicativo entre corchetes). ' +
  'Si es una inversión con rendimientos, identifícalo claramente. ' +
  'Compras a meses sin intereses (MSI) o diferidos: si el usuario dice "a 12 meses sin intereses", "MSI 6 meses", "diferido a 18 meses", ' +
  '"compré una tele de 12 mil a 12 meses sin intereses", etc., ' +
  'pon installmentPurchase=true (o isInstallment=true como alias), installmentMonths igual al número de meses (entero 2–60), installmentInterestFree=true si dice "sin intereses", "MSI", "meses sin intereses" o equivalente; ' +
  'si hay intereses del comercio/banco, installmentInterestFree=false. amount es el precio total financiado (no la mensualidad). ' +
  'Si NO es compra a meses, installmentPurchase=false e installmentMonths=null. ' +
  'El campo description debe ser una etiqueta breve y factual de qué compró o recibió el usuario (ej. "Supermercado", "Netflix"), ' +
  'nunca frases del asistente prometiendo acciones ("te pagaré la tarjeta", "voy a transferir") ni mensajes de confirmación al usuario; ' +
  'el aviso sobre deuda vs efectivo lo añade la API al resolver la cuenta. ' +
  'Devuelve solo el JSON que cumple el esquema: amount positivo, description breve, category del enum, ' +
  'accountName exacto de la lista o null si no hay certeza, transactionType EXPENSE/INCOME/INVESTMENT.';

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Whisper: audio (buffer Multer memory o archivo temporal en disco) → texto.
   * `processVoiceStrict` usa la lista MIME de POST /ai/process-voice (webm/mp4/mpeg).
   */
  async transcribeAudio(
    file: Express.Multer.File,
    options?: { assertMime?: 'default' | 'processVoiceStrict' },
  ): Promise<string> {
    if (options?.assertMime === 'processVoiceStrict') {
      assertProcessVoiceStrict(file);
    } else {
      assertAllowedVoiceUpload(file);
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY no configurada (Whisper requiere OpenAI).',
      );
    }

    const safeName = (file.originalname?.trim() || 'recording.webm').replace(/[^\w.\-]+/g, '_');

    const client = new OpenAI({ apiKey });
    try {
      const upload =
        file.buffer != null && file.buffer.length > 0
          ? await toFile(file.buffer, safeName)
          : file.path
            ? createReadStream(file.path)
            : null;
      if (!upload) {
        throw new BadRequestException('Archivo de audio vacío o inválido.');
      }

      const transcription = await client.audio.transcriptions.create({
        file: upload,
        model: 'whisper-1',
        language: 'es',
      });
      return transcription.text?.trim() ?? '';
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ServiceUnavailableException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Whisper transcribeAudio failed: ${msg}`);
      throw new ServiceUnavailableException(
        'No pudimos transcribir el audio. Comprueba el formato o inténtalo de nuevo.',
      );
    }
  }

  /**
   * Voz → Whisper → texto → `parseNaturalLanguage` (misma lógica que el texto libre, sin resolver IDs de usuario).
   */
  async processVoice(
    file: Express.Multer.File,
    userAccounts: string[],
  ): Promise<NaturalLanguageParseResult> {
    const text = await this.transcribeAudio(file, { assertMime: 'processVoiceStrict' });
    if (!text) {
      throw new BadRequestException('No se detectó texto en el audio.');
    }
    return this.parseNaturalLanguage(text, userAccounts);
  }

  /**
   * Interpreta texto libre (gasto/ingreso) y devuelve campos estructurados.
   * `userContext` debe incluir nombres reales de cuentas (p. ej. `accounts` / `accountNames`) para mapear `cuenta_origen`.
   */
  async parseInput(input: string, userContext: any): Promise<ParsedExpenseJson> {
    const trimmed = input?.trim() ?? '';
    if (!trimmed) {
      return this.emptyParsed();
    }

    const provider = this.resolveProvider();
    const userPayload = this.buildUserPayload(trimmed, this.toUserContext(userContext));

    try {
      if (provider === 'openai') {
        return await this.parseWithOpenAI(userPayload);
      }
      return await this.parseWithGemini(userPayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`parseInput failed (${provider}): ${msg}`);
      throw new ServiceUnavailableException(
        'El servicio de IA no está disponible o no pudo interpretar el mensaje.',
      );
    }
  }

  /**
   * Una sola llamada a `parseTransaction` + resultado natural y crudo (para mapeo de categorías/cuentas).
   */
  async parseNaturalLanguageWithRaw(
    text: string,
    availableAccounts: string[],
    /** Misma longitud que `availableAccounts`: líneas mostradas al modelo (p. ej. etiqueta "tarjeta"). */
    accountPromptLines?: string[],
  ): Promise<{ natural: NaturalLanguageParseResult; raw: TransactionParseResult }> {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      return {
        natural: this.emptyNaturalLanguageParse(availableAccounts),
        raw: this.emptyTransactionParse(),
      };
    }
    const tx = await this.parseTransaction(text, availableAccounts, accountPromptLines);
    const natural = this.transactionParseToNaturalLanguage(tx, availableAccounts);
    return { natural, raw: tx };
  }

  /**
   * Interpreta lenguaje natural con OpenAI Structured Outputs (`parseTransaction`) y mapea al formato legacy.
   * `targetAccount` es `null` si la cuenta no coincide con `availableAccounts`.
   */
  async parseNaturalLanguage(
    text: string,
    availableAccounts: string[],
  ): Promise<NaturalLanguageParseResult> {
    const { natural } = await this.parseNaturalLanguageWithRaw(text, availableAccounts);
    return natural;
  }

  /**
   * Mapea texto informal a un registro financiero usando ConfigService (OPENAI_API_KEY, AI_MODEL) y JSON Schema estricto.
   */
  async parseTransaction(
    text: string,
    userAccounts: string[],
    accountPromptLines?: string[],
  ): Promise<TransactionParseResult> {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      return this.emptyTransactionParse();
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY no configurada (parseTransaction requiere OpenAI).',
      );
    }

    const seen = new Set<string>();
    const uniqueAccounts: string[] = [];
    const displayLines: string[] = [];
    userAccounts.forEach((raw, i) => {
      const name = raw.trim();
      if (!name || seen.has(name)) {
        return;
      }
      seen.add(name);
      uniqueAccounts.push(name);
      displayLines.push(accountPromptLines?.[i] ?? name);
    });
    const model = this.resolveOpenAiModel();
    const client = new OpenAI({ apiKey });
    const schema = this.buildTransactionParseJsonSchema(uniqueAccounts);

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: TRANSACTION_PARSE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              'Cuentas del usuario (emparejar accountName solo con nombres exactos de la lista interna; si no hay certeza, null):',
              uniqueAccounts.length
                ? uniqueAccounts.map((name, i) => `- ${displayLines[i] ?? name}`).join('\n')
                : '(ninguna)',
              '',
              'Mensaje:',
              trimmed,
            ].join('\n'),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'transaction_parse',
            strict: true,
            schema,
          },
        },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw?.trim()) {
        throw new Error('Respuesta vacía de OpenAI');
      }
      const parsed = JSON.parse(raw) as unknown;
      return this.normalizeTransactionParse(parsed, uniqueAccounts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`parseTransaction failed: ${msg}`);
      throw new ServiceUnavailableException(
        'El servicio de IA no está disponible o no pudo interpretar el mensaje.',
      );
    }
  }

  /**
   * Genera un consejo de ahorro breve (máx. 20 palabras) a partir del resumen de gastos del periodo.
   */
  /**
   * Responde preguntas de insight financiero usando un contexto ya agregado desde la base de datos.
   */
  async composeFinancialInsightAnswer(question: string, contextPayload: unknown): Promise<string> {
    const provider = this.resolveProvider();
    const userContent = [
      'Datos del usuario (JSON):',
      JSON.stringify(contextPayload, null, 2),
      '',
      'Pregunta:',
      question.trim(),
    ].join('\n');

    try {
      if (provider === 'openai') {
        return await this.financialInsightOpenAI(userContent);
      }
      return await this.financialInsightGemini(userContent);
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`composeFinancialInsightAnswer failed (${provider}): ${msg}`);
      throw new ServiceUnavailableException(
        'El servicio de IA no está disponible o no pudo generar la respuesta.',
      );
    }
  }

  async getSavingsAdvice(summary: ExpenseSummaryForAdvice): Promise<string> {
    const expenseNum = Number(summary?.totals?.expense ?? '0');
    const catCount = summary.expensesByCategory?.length ?? 0;
    this.logger.debug(
      `[getSavingsAdvice] period=${summary.period?.from ?? '?'} expense=${summary.totals?.expense ?? 'n/a'} categories=${catCount}`,
    );
    if (!Number.isFinite(expenseNum) || (expenseNum <= 0 && catCount === 0)) {
      this.logger.warn('[getSavingsAdvice] Datos insuficientes; respuesta fallback sin llamar al modelo.');
      return 'Registra gastos en el mes anterior para recibir un consejo personalizado.';
    }

    const provider = this.resolveProvider();
    const userContent = JSON.stringify(
      {
        resumen: summary,
        instruccion:
          'Responde con exactamente una frase: consejo de ahorro en español, máximo 20 palabras.',
      },
      null,
      2,
    );

    try {
      const raw =
        provider === 'openai'
          ? await this.savingsAdviceOpenAI(userContent)
          : await this.savingsAdviceGemini(userContent);
      return this.sanitizeAdvice(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`getSavingsAdvice failed (${provider}): ${msg}`);
      throw new ServiceUnavailableException(
        'El servicio de IA no está disponible o no pudo generar el consejo.',
      );
    }
  }

  private resolveProvider(): 'openai' | 'gemini' {
    const explicit = this.config.get<string>('AI_PROVIDER')?.trim().toLowerCase();
    if (explicit === 'gemini') {
      return 'gemini';
    }
    if (explicit === 'openai') {
      return 'openai';
    }
    const geminiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    const openaiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (geminiKey && !openaiKey) {
      return 'gemini';
    }
    if (openaiKey) {
      return 'openai';
    }
    if (geminiKey) {
      return 'gemini';
    }
    throw new ServiceUnavailableException(
      'Falta configuración de IA: define OPENAI_API_KEY o GEMINI_API_KEY (y opcionalmente AI_PROVIDER=openai|gemini).',
    );
  }

  /** `AI_MODEL` tiene prioridad; `OPENAI_MODEL` es alias legacy. */
  private resolveOpenAiModel(): string {
    const explicit =
      this.config.get<string>('AI_MODEL')?.trim() || this.config.get<string>('OPENAI_MODEL')?.trim();
    return explicit || 'gpt-4o-mini';
  }

  /** JSON Schema (Structured Outputs) para `parseTransaction`. */
  private buildTransactionParseJsonSchema(userAccounts: string[]): Record<string, unknown> {
    const categories = [...PREDEFINED_EXPENSE_CATEGORIES];
    const accountNameSchema: Record<string, unknown> =
      userAccounts.length === 0
        ? {
            type: 'null',
            description: 'Sin cuentas: siempre null.',
          }
        : {
            anyOf: [
              {
                type: 'null',
                description: 'null si no hay certeza o la cuenta no está en la lista.',
              },
              {
                type: 'string',
                enum: [...userAccounts],
                description: 'Nombre exacto de una cuenta de la lista del usuario.',
              },
            ],
          };

    return {
      type: 'object',
      additionalProperties: false,
      properties: {
        amount: {
          type: 'number',
          description: 'Valor monetario (positivo).',
        },
        description: {
          type: 'string',
          description: 'Breve detalle del gasto o ingreso.',
        },
        category: {
          type: 'string',
          enum: categories,
          description: 'Clasificación (Comida, Transporte, Servicios, etc.).',
        },
        accountName: accountNameSchema,
        transactionType: {
          type: 'string',
          enum: ['EXPENSE', 'INCOME', 'INVESTMENT'],
          description: 'EXPENSE gasto; INCOME ingreso; INVESTMENT inversión o rendimientos de inversión.',
        },
        installmentPurchase: {
          type: 'boolean',
          description: 'true si es compra a meses (MSI/diferidos) en tarjeta.',
        },
        installmentMonths: {
          anyOf: [
            { type: 'null', description: 'No es compra a meses o no se conoce el plazo.' },
            {
              type: 'integer',
              minimum: 2,
              maximum: 60,
              description: 'Plazo total en meses.',
            },
          ],
        },
        installmentInterestFree: {
          type: 'boolean',
          description: 'true si es MSI sin intereses.',
        },
        isInstallment: {
          type: 'boolean',
          description: 'Alias de installmentPurchase: true si el gasto es en mensualidades / MSI / diferido.',
        },
      },
      required: [
        'amount',
        'description',
        'category',
        'accountName',
        'transactionType',
        'installmentPurchase',
        'installmentMonths',
        'installmentInterestFree',
        'isInstallment',
      ],
    };
  }

  private normalizeTransactionParse(raw: unknown, userAccounts: string[]): TransactionParseResult {
    const empty = this.emptyTransactionParse();
    const accountSet = new Set(userAccounts);
    const categorySet = new Set<string>(PREDEFINED_EXPENSE_CATEGORIES);
    const typeSet = new Set<TransactionParseType>(['EXPENSE', 'INCOME', 'INVESTMENT']);

    if (!raw || typeof raw !== 'object') {
      return empty;
    }
    const o = raw as Record<string, unknown>;

    const amountRaw = o.amount;
    const amountNum =
      typeof amountRaw === 'number' && Number.isFinite(amountRaw)
        ? amountRaw
        : typeof amountRaw === 'string'
          ? Number(amountRaw.replace(',', '.'))
          : NaN;
    const amount = Number.isFinite(amountNum) ? Math.abs(amountNum) : 0;

    const description = typeof o.description === 'string' ? o.description : '';
    const category =
      typeof o.category === 'string' && categorySet.has(o.category) ? o.category : 'Otros';

    let transactionType: TransactionParseType = 'EXPENSE';
    if (typeof o.transactionType === 'string' && typeSet.has(o.transactionType as TransactionParseType)) {
      transactionType = o.transactionType as TransactionParseType;
    }

    let accountName: string | null = null;
    if (o.accountName === null) {
      accountName = null;
    } else if (typeof o.accountName === 'string' && accountSet.has(o.accountName)) {
      accountName = o.accountName;
    }

    const installmentPurchase = o.installmentPurchase === true || o.isInstallment === true;
    let installmentMonths: number | null = null;
    if (o.installmentMonths === null) {
      installmentMonths = null;
    } else if (
      typeof o.installmentMonths === 'number' &&
      Number.isFinite(o.installmentMonths) &&
      Number.isInteger(o.installmentMonths) &&
      o.installmentMonths >= 2 &&
      o.installmentMonths <= 60
    ) {
      installmentMonths = o.installmentMonths;
    }
    if (!installmentPurchase) {
      installmentMonths = null;
    }
    const installmentInterestFree = o.installmentInterestFree === true;

    return {
      amount,
      description,
      category,
      accountName,
      transactionType,
      installmentPurchase,
      installmentMonths,
      installmentInterestFree,
      isInstallment: installmentPurchase,
    };
  }

  private emptyTransactionParse(): TransactionParseResult {
    return {
      amount: 0,
      description: '',
      category: 'Otros',
      accountName: null,
      transactionType: 'EXPENSE',
      installmentPurchase: false,
      installmentMonths: null,
      installmentInterestFree: false,
      isInstallment: false,
    };
  }

  private transactionParseToNaturalLanguage(
    r: TransactionParseResult,
    availableAccounts: string[],
  ): NaturalLanguageParseResult {
    const accountSet = new Set(availableAccounts);
    let targetAccount: string | null = null;
    if (r.accountName != null && accountSet.has(r.accountName)) {
      targetAccount = r.accountName;
    }
    return {
      amount: r.amount,
      description: r.description,
      category: r.category,
      targetAccount,
      isInvestment: r.transactionType === 'INVESTMENT',
      installmentPurchase: r.installmentPurchase,
      installmentMonths: r.installmentMonths,
      installmentInterestFree: r.installmentInterestFree,
      isInstallment: r.isInstallment,
    };
  }

  private emptyNaturalLanguageParse(availableAccounts: string[]): NaturalLanguageParseResult {
    return this.transactionParseToNaturalLanguage(this.emptyTransactionParse(), availableAccounts);
  }

  private toUserContext(raw: any): AiUserContext {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as AiUserContext;
    }
    return {};
  }

  private buildUserPayload(input: string, userContext: AiUserContext): string {
    const ctx = {
      ...userContext,
      accountNames: userContext.accountNames ?? userContext.accounts?.map((a) => a.name) ?? [],
    };
    return [
      'Contexto del usuario (cuentas reales; usa estos nombres si el mensaje menciona o sugiere una cuenta):',
      JSON.stringify(ctx, null, 2),
      '',
      'Mensaje a interpretar:',
      input,
    ].join('\n');
  }

  private async parseWithOpenAI(userPayload: string): Promise<ParsedExpenseJson> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }
    const model = this.resolveOpenAiModel();
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('Respuesta vacía de OpenAI');
    }
    return this.normalizeParsed(JSON.parse(raw));
  }

  private async parseWithGemini(userPayload: string): Promise<ParsedExpenseJson> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }
    const modelName = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
    const result = await model.generateContent(userPayload);
    const raw = result.response.text();
    if (!raw?.trim()) {
      throw new Error('Respuesta vacía de Gemini');
    }
    return this.normalizeParsed(JSON.parse(raw));
  }

  private async financialInsightOpenAI(userContent: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }
    const model = this.resolveOpenAiModel();
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: FINANCIAL_INSIGHT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.35,
      max_tokens: 900,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error('Respuesta vacía de OpenAI');
    }
    return raw.trim();
  }

  private async financialInsightGemini(userContent: string): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }
    const modelName = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: FINANCIAL_INSIGHT_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1024,
      },
    });
    const result = await model.generateContent(userContent);
    const raw = result.response.text();
    if (!raw?.trim()) {
      throw new Error('Respuesta vacía de Gemini');
    }
    return raw.trim();
  }

  private async savingsAdviceOpenAI(userPayload: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no configurada');
    }
    const model = this.resolveOpenAiModel();
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SAVINGS_ADVICE_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      temperature: 0.35,
      max_tokens: 96,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new Error('Respuesta vacía de OpenAI');
    }
    return raw.trim();
  }

  private async savingsAdviceGemini(userPayload: string): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }
    const modelName = this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SAVINGS_ADVICE_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 96,
      },
    });
    const result = await model.generateContent(userPayload);
    const raw = result.response.text();
    if (!raw?.trim()) {
      throw new Error('Respuesta vacía de Gemini');
    }
    return raw.trim();
  }

  private sanitizeAdvice(text: string): string {
    let t = text.trim();
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith('«') && t.endsWith('»')) ||
      (t.startsWith("'") && t.endsWith("'"))
    ) {
      t = t.slice(1, -1).trim();
    }
    const oneLine = t.replace(/\s+/g, ' ');
    return this.enforceMaxWords(oneLine, 20);
  }

  private enforceMaxWords(text: string, max: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.slice(0, max).join(' ');
  }

  private normalizeParsed(raw: unknown): ParsedExpenseJson {
    if (!raw || typeof raw !== 'object') {
      return this.emptyParsed();
    }
    const o = raw as Record<string, unknown>;
    const monto =
      typeof o.monto === 'number'
        ? o.monto
        : typeof o.monto === 'string'
          ? Number(o.monto.replace(',', '.'))
          : null;
    return {
      monto: Number.isFinite(monto as number) ? (monto as number) : null,
      categoría: typeof o.categoría === 'string' ? o.categoría : typeof o.categoria === 'string' ? o.categoria : '',
      descripción: typeof o.descripción === 'string' ? o.descripción : typeof o.descripcion === 'string' ? o.descripcion : '',
      cuenta_origen:
        typeof o.cuenta_origen === 'string'
          ? o.cuenta_origen
          : typeof o.cuentaOrigen === 'string'
            ? o.cuentaOrigen
            : '',
    };
  }

  private emptyParsed(): ParsedExpenseJson {
    return {
      monto: null,
      categoría: '',
      descripción: '',
      cuenta_origen: '',
    };
  }
}
