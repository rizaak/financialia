export type DashboardSummary = {
  period: { from: string; to: string };
  totals: {
    income: string;
    expense: string;
    net: string;
  };
  expensesByCategory: Array<{
    categoryId: string;
    name: string;
    slug: string;
    color: string | null;
    total: string;
  }>;
};
