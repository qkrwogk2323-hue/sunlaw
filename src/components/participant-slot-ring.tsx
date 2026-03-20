import { cn } from '@/lib/cn';

export function ParticipantSlotRing({
  occupied,
  limit,
  label
}: {
  occupied: number;
  limit: number;
  label: string;
}) {
  const slots = Array.from({ length: Math.max(limit, occupied) }, (_, index) => index < occupied);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
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
