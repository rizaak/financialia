import type { ReactNode } from 'react';

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
