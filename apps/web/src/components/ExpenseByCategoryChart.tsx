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

/** Paleta vibrante sobre fondo oscuro: azul eléctrico, esmeralda, morado, cian, violeta, teal, índigo. */
const BAR_PALETTE = ['#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#8b5cf6', '#14b8a6', '#6366f1', '#22c55e'];

const axisTick = { fontSize: 13, fill: '#E2E8F0', opacity: 1 };

const tooltipStyles = {
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 8,
  color: '#FFFFFF',
  fontSize: 13,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: 'none',
} as const;

export function ExpenseByCategoryChart({
  rows,
  currencyCode,
}: {
  rows: DashboardSummary['expensesByCategory'];
  currencyCode: string;
}) {
  const data: Row[] = rows.map((r, i) => ({
    name: r.name,
    total: Number(r.total),
    color: BAR_PALETTE[i % BAR_PALETTE.length],
  }));

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-[0.9rem] text-[#E2E8F0]" style={{ textShadow: 'none' }}>
        Sin gastos por categoría en este periodo.
      </p>
    );
  }

  return (
    <div className="h-72 w-full" style={{ boxShadow: 'none', filter: 'none' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
          style={{ outline: 'none' }}
        >
          <XAxis
            type="number"
            tick={axisTick}
            tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v) =>
              typeof v === 'number' && Math.abs(v) >= 1000
                ? `${(v / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}k`
                : String(v)
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={112}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tick={{ ...axisTick, fontSize: 13 }}
            interval={0}
          />
          <Tooltip
            formatter={(v: number | string) => [formatMoney(Number(v), currencyCode), 'Gasto']}
            contentStyle={tooltipStyles}
            itemStyle={{ color: '#FFFFFF' }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
            cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
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
