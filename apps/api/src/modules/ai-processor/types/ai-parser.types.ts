/**
 * Contexto enviado a la IA: cuentas reales del usuario para mapear `cuenta_origen`.
 */
export type AiUserContext = {
  /** Lista simple de nombres de cuentas bancarias / efectivo */
  accountNames?: string[];
  /** Detalle opcional (id + nombre) para descripciones más precisas */
  accounts?: ReadonlyArray<{
    id: string;
    name: string;
    type?: string;
    currency?: string;
  }>;
  defaultCurrency?: string;
  /** Extensible sin romper el contrato */
  [key: string]: unknown;
};

/** Salida JSON esperada del modelo (claves en español). */
export type ParsedExpenseJson = {
  monto: number | null;
  categoría: string;
  descripción: string;
  cuenta_origen: string;
};

/** Tipo de movimiento inferido por `parseTransaction`. */
export type TransactionParseType = 'EXPENSE' | 'INCOME' | 'INVESTMENT';

/** Salida estructurada de OpenAI (JSON Schema) para `parseTransaction`. */
export type TransactionParseResult = {
  amount: number;
  description: string;
  category: string;
  /** Nombre de cuenta/banco mencionado; debe coincidir con la lista o ser null. */
  accountName: string | null;
  transactionType: TransactionParseType;
  /** Compra a meses (MSI/diferidos) en tarjeta; el monto es el total financiado. */
  installmentPurchase: boolean;
  /** Plazo en meses (2–60) o null si no aplica. */
  installmentMonths: number | null;
  /** MSI sin intereses (ej. promociones bancarias). */
  installmentInterestFree: boolean;
  /** true si installmentPurchase o isInstallment en el JSON de la IA. */
  isInstallment: boolean;
};

/** Salida de `parseNaturalLanguage` (Structured Outputs / OpenAI). */
export type NaturalLanguageParseResult = {
  amount: number;
  description: string;
  category: string;
  /** Cuenta destino; `null` si la IA no puede mapear con certeza a `availableAccounts`. */
  targetAccount: string | null;
  isInvestment: boolean;
  installmentPurchase: boolean;
  installmentMonths: number | null;
  installmentInterestFree: boolean;
  isInstallment: boolean;
  /**
   * Mensaje fijo para gastos en tarjeta de crédito (lo añade `parseForUser` al resolver la cuenta).
   * No lo genera el modelo de parseo.
   */
  creditCardExpenseAcknowledgment?: string | null;
};

/** Resumen de gastos (mismo shape que `DashboardSummaryResponse`) para consejos de ahorro. */
export type ExpenseSummaryForAdvice = {
  period: { from: string; to: string };
  totals: { income: string; expense: string; net: string };
  expensesByCategory: Array<{
    categoryId: string;
    name: string;
    slug: string;
    color: string | null;
    total: string;
  }>;
};
