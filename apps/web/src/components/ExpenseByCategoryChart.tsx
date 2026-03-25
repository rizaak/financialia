import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardSummary } from '../api/types';
import { formatMoney } from '../lib/formatMoney';

type Row = {
  name: string;
  total: number;
  color: string;
};

export function ExpenseByCategoryChart({
  rows,
  currencyCode,
}: {
  rows: DashboardSummary['expensesByCategory'];
  currencyCode: string;
}) {
  const data: Row[] = rows.map((r) => ({
    name: r.name,
    total: Number(r.total),
    color: r.color ?? '#64748b',
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Sin gastos por categoría en este periodo.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={108}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#71717a' }}
          />
          <Tooltip
            formatter={(v: number | string) => [formatMoney(Number(v), currencyCode), 'Gasto']}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #e4e4e7',
              fontSize: 13,
            }}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
