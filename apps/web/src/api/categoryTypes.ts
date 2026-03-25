export type CategoryKind = 'EXPENSE' | 'INCOME';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  kind: CategoryKind;
};
