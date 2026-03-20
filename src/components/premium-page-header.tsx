import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PremiumPageHeader({
  eyebrow,
  title,
  description,
  metrics,
  actions,
  className
}: {
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: Array<{ label: string; value: string | number; helper?: string }>;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mx-auto max-w-[1440px] rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef6ff)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:p-8', className)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">{eyebrow}</p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 md:text-base">{description}</p>
          </div>
          {metrics?.length ? (
            <div className={cn('grid gap-3', metrics.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3')}>
              {metrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="min-h-28 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold leading-none text-slate-950 tabular-nums">{metric.value}</p>
                  <p className="mt-4 text-xs text-slate-500">{metric.helper ?? ''}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}
