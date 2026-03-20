'use client';

import { cn } from '@/lib/cn';

export function HubReadinessRing({
  percent,
  label = '허브 준비도',
  size = 'md'
}: {
  percent: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = size === 'sm' ? 'size-14' : size === 'lg' ? 'size-28' : 'size-20';
  const innerClass = size === 'sm' ? 'size-10 text-sm' : size === 'lg' ? 'size-20 text-2xl' : 'size-14 text-lg';

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn('relative grid place-items-center rounded-full', sizeClass)}
        style={{
          background: `conic-gradient(rgb(14 165 233) 0deg ${percent * 3.6}deg, rgba(148,163,184,0.18) ${percent * 3.6}deg 360deg)`
        }}
        aria-label={`${label} ${percent}%`}
        role="img"
      >
        <div className={cn('grid place-items-center rounded-full bg-white text-slate-900 shadow-inner', innerClass)}>
          <span className="font-semibold tabular-nums">{percent}</span>
        </div>
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
    </div>
  );
}
