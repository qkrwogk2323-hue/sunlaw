'use client';

import { cn } from '@/lib/cn';

export function HubMetricBadge({
  label,
  value,
  tone = 'slate'
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : tone === 'violet'
          ? 'border-violet-200 bg-violet-50 text-violet-800'
          : tone === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', toneClass)}>
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
