import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PremiumInfoPanel({
  title,
  description,
  children,
  className
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]', className)}>
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
