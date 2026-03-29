export type CategoryKind = 'EXPENSE' | 'INCOME' | 'ADJUSTMENT';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  kind: CategoryKind;
};
