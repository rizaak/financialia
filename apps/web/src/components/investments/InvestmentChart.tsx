import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GrowthData } from '../../investments/investmentDashboardTypes';

type Props = {
  data: GrowthData[];
  currencyCode: string;
  formatCurrency: (value: number, code: string) => string;
};

export function InvestmentChart({ data, currencyCode, formatCurrency }: Props) {
  if (data.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-zinc-500">
        Añade posiciones para ver la proyección.
      </p>
    );
  }

  return (
    <div className="h-72 w-full min-h-[16rem]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="invGrowthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={{ stroke: '#e4e4e7' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#71717a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(Number(v), currencyCode)}
            width={72}
          />
          <Tooltip
            formatter={(v: number | string) => [formatCurrency(Number(v), currencyCode), 'Valor']}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #e4e4e7',
              fontSize: 13,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#invGrowthFill)"
            name="Proyección"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
