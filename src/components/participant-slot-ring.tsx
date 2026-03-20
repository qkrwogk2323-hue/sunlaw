import { cn } from '@/lib/cn';
import { normalizeSlotCount } from '@/lib/case-hub-metrics';

export function ParticipantSlotRing({
  occupied,
  limit,
  label
}: {
  occupied: number;
  limit: number;
  label: string;
}) {
  const visibleLimit = normalizeSlotCount(limit);
  const slots = Array.from({ length: visibleLimit }, (_, index) => index < Math.min(occupied, visibleLimit));
  const overflow = Math.max(0, limit - visibleLimit);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 tabular-nums">{occupied}/{limit}</span>
          {overflow ? (
            <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600">
              +{overflow}
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
        {slots.map((filled, index) => (
          <div
            key={`${label}-${index}`}
            className={cn(
              'grid aspect-square place-items-center rounded-2xl border text-xs font-semibold',
              filled
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-slate-50 text-slate-300'
            )}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
