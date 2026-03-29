import { TransactionType } from '@prisma/client';

/** Mapea etiquetas del modelo (PREDEFINED_EXPENSE_CATEGORIES) a slugs de gasto del usuario. */
export function mapAiCategoryToExpenseSlug(label: string): string {
  const m: Record<string, string> = {
    Comida: 'alimentacion',
    Transporte: 'transporte',
    Servicios: 'servicios',
    Inversión: 'otros',
    Entretenimiento: 'ocio',
    Salud: 'salud',
    Educación: 'educacion',
    Hogar: 'vivienda',
    Ropa: 'otros',
    Regalos: 'otros',
    Otros: 'otros',
  };
  return m[label] ?? 'otros';
}

/** Mapea etiquetas de la IA a slugs de ingreso (cuando el usuario elige ingreso). */
export function mapAiCategoryToIncomeSlug(label: string): string {
  const m: Record<string, string> = {
    Inversión: 'inversiones',
    Regalos: 'regalos',
    Otros: 'otros-ingreso',
  };
  return m[label] ?? 'otros-ingreso';
}

export function mapAiLabelToSlug(label: string, kind: TransactionType): string {
  return kind === TransactionType.EXPENSE ? mapAiCategoryToExpenseSlug(label) : mapAiCategoryToIncomeSlug(label);
}
