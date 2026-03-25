import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DonutSegment } from '../../investments/investmentDashboardTypes';

type Props = {
  segments: DonutSegment[];
  formatCurrency: (value: number, code: string) => string;
  currencyCode: string;
};

export function PortfolioDonutChart({ segments, formatCurrency, currencyCode }: Props) {
  if (segments.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-center text-sm text-zinc-500">
        <p>Sin datos para distribución.</p>
        <p className="mt-1 max-w-xs text-xs text-zinc-400">
          Usa palabras clave en la etiqueta (BTC, ETF, CETES…) para agrupar por categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-72 w-full flex-col sm:flex-row sm:items-center sm:gap-6">
      <div className="h-56 min-h-[14rem] flex-1 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
            >
              {segments.map((s) => (
                <Cell key={s.categoryId} fill={s.color} stroke="#fafafa" strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: DonutSegment }) => {
                const p = props?.payload;
                const pct = p?.pct ?? 0;
                return [`${formatCurrency(value, currencyCode)} (${pct}%)`, p?.name ?? ''];
              }}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e4e4e7',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-4 flex shrink-0 flex-col gap-2 sm:mt-0 sm:w-40">
        {segments.map((s) => (
          <li key={s.categoryId} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate font-medium text-zinc-700">{s.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
