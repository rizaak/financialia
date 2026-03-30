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
    <section
      className="rounded-[20px] border border-white/10 bg-white/[0.03] p-6 shadow-none backdrop-blur-[12px]"
      style={{ boxShadow: 'none' }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight text-white" style={{ textShadow: 'none' }}>
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm font-normal text-[#94a3b8]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
