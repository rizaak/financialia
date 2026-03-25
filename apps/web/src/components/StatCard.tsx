type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
};

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-zinc-900',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
};

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}
