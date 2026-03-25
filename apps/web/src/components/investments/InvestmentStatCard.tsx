type Tone = 'default' | 'positive' | 'negative';

type Props = {
  label: string;
  value: string;
  hint?: string;
  /** Tarjeta principal (patrimonio). */
  variant?: 'default' | 'hero';
  tone?: Tone;
  /** Flecha al lado del valor (p. ej. rendimiento %). */
  showTrendArrow?: boolean;
};

const toneClass: Record<Tone, string> = {
  default: 'text-zinc-900',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
};

function TrendArrow({ tone }: { tone: Tone }) {
  if (tone === 'positive') {
    return (
      <svg
        className="inline-block h-5 w-5 text-emerald-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  if (tone === 'negative') {
    return (
      <svg
        className="inline-block h-5 w-5 text-rose-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  }
  return null;
}

export function InvestmentStatCard({
  label,
  value,
  hint,
  variant = 'default',
  tone = 'default',
  showTrendArrow = false,
}: Props) {
  const isHero = variant === 'hero';
  return (
    <div
      className={`rounded-2xl border border-zinc-200/90 bg-white shadow-sm ${
        isHero ? 'p-6 ring-1 ring-emerald-500/10' : 'p-5'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className={`mt-2 flex items-center gap-2 ${isHero ? 'min-h-[2.75rem]' : ''}`}>
        {showTrendArrow ? <TrendArrow tone={tone} /> : null}
        <p
          className={`font-semibold tabular-nums ${toneClass[tone]} ${
            isHero ? 'text-3xl tracking-tight sm:text-4xl' : 'text-2xl'
          }`}
        >
          {value}
        </p>
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{hint}</p> : null}
    </div>
  );
}
