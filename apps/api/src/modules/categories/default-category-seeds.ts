import { TransactionType } from '@prisma/client';

export type CategorySeed = {
  slug: string;
  name: string;
  icon?: string;
  color?: string;
  kind: TransactionType;
};

export const DEFAULT_EXPENSE_CATEGORY_SEEDS: readonly CategorySeed[] = [
  { slug: 'alimentacion', name: 'Alimentación', color: '#22c55e', kind: TransactionType.EXPENSE },
  { slug: 'transporte', name: 'Transporte', color: '#3b82f6', kind: TransactionType.EXPENSE },
  { slug: 'ocio', name: 'Ocio', color: '#a855f7', kind: TransactionType.EXPENSE },
  { slug: 'servicios', name: 'Servicios', color: '#64748b', kind: TransactionType.EXPENSE },
  { slug: 'salud', name: 'Salud', color: '#ef4444', kind: TransactionType.EXPENSE },
  { slug: 'vivienda', name: 'Vivienda', color: '#f97316', kind: TransactionType.EXPENSE },
  { slug: 'educacion', name: 'Educación', color: '#0ea5e9', kind: TransactionType.EXPENSE },
  { slug: 'otros', name: 'Otros', color: '#94a3b8', kind: TransactionType.EXPENSE },
  { slug: 'comisiones-bancarias', name: 'Comisiones bancarias', color: '#78716c', kind: TransactionType.EXPENSE },
];

export const DEFAULT_INCOME_CATEGORY_SEEDS: readonly CategorySeed[] = [
  { slug: 'salario', name: 'Salario / nómina', color: '#059669', kind: TransactionType.INCOME },
  { slug: 'freelance', name: 'Freelance / honorarios', color: '#10b981', kind: TransactionType.INCOME },
  { slug: 'negocio', name: 'Negocio', color: '#34d399', kind: TransactionType.INCOME },
  { slug: 'inversiones', name: 'Inversiones / intereses', color: '#6ee7b7', kind: TransactionType.INCOME },
  {
    slug: 'intereses-inversion',
    name: 'Intereses de inversión',
    color: '#2dd4bf',
    kind: TransactionType.INCOME,
  },
  { slug: 'regalos', name: 'Regalos / apoyos', color: '#a7f3d0', kind: TransactionType.INCOME },
  { slug: 'reembolsos', name: 'Reembolsos', color: '#86efac', kind: TransactionType.INCOME },
  { slug: 'ventas', name: 'Ventas', color: '#4ade80', kind: TransactionType.INCOME },
  { slug: 'otros-ingreso', name: 'Otros ingresos', color: '#94a3b8', kind: TransactionType.INCOME },
];
