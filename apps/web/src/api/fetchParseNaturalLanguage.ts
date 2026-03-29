import { assertOk } from '../lib/http/assertOk';
import { getApiBaseUrl } from './apiBaseUrl';

export type ParseNaturalLanguageResponse = {
  amount: number;
  description: string;
  category: string;
  targetAccount: string | null;
  isInvestment: boolean;
  /** Compra a meses (MSI) detectada por la IA. */
  installmentPurchase?: boolean;
  installmentMonths?: number | null;
  installmentInterestFree?: boolean;
  /** Alias MSI desde la IA (`isInstallment` en el JSON). */
  isInstallment?: boolean;
  transactionType: 'EXPENSE' | 'INCOME';
  /** Tipo inferido por la IA (el diálogo usa INVESTMENT para tramos). Opcional en respuestas antiguas. */
  aiTransactionType?: 'EXPENSE' | 'INCOME' | 'INVESTMENT';
  suggestedAccountId: string | null;
  suggestedCategoryId: string | null;
  /** Mensaje fijo cuando el gasto va a una tarjeta de crédito (lo arma el backend). */
  creditCardExpenseAcknowledgment?: string | null;
};

export async function postParseNaturalLanguage(
  getAccessToken: () => Promise<string>,
  text: string,
): Promise<ParseNaturalLanguageResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}/ai-processor/parse-natural-language`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });
  await assertOk(res);
  return res.json() as Promise<ParseNaturalLanguageResponse>;
}
