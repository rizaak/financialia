/**
 * Categorías fijas para clasificación de gastos en lenguaje natural (parseNaturalLanguage).
 * Deben coincidir con el enum del JSON Schema enviado a OpenAI.
 */
export const PREDEFINED_EXPENSE_CATEGORIES = [
  'Comida',
  'Transporte',
  'Servicios',
  'Inversión',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Hogar',
  'Ropa',
  'Regalos',
  'Otros',
] as const;

export type PredefinedExpenseCategory = (typeof PREDEFINED_EXPENSE_CATEGORIES)[number];
