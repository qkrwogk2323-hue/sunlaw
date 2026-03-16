import { cn } from '@/lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('relative isolate aspect-square w-14', className)} aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_12px_24px_rgba(34,211,238,0.24)]">
        <defs>
          <linearGradient id="vs-blade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f2748" />
            <stop offset="58%" stopColor="#2f79b7" />
            <stop offset="100%" stopColor="#8ae6ea" />
          </linearGradient>
          <radialGradient id="vs-core" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#eefeff" />
            <stop offset="42%" stopColor="#92f6ff" />
            <stop offset="100%" stopColor="#0a5478" />
          </radialGradient>
        </defs>
        <g transform="translate(60 60)">
          {Array.from({ length: 8 }).map((_, index) => (
            <path
              key={index}
              d="M5 -47 C26 -53 44 -45 57 -26 C42 -26 28 -22 15 -12 C3 -21 -4 -34 5 -47 Z"
              fill="url(#vs-blade)"
              opacity={1 - index * 0.06}
              transform={`rotate(${index * 45})`}
            />
          ))}
          <circle r="18" fill="url(#vs-core)" />
          <circle r="8" fill="#f6ffff" opacity="0.96" />
        </g>
      </svg>
      <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgba(110,231,255,0.38),transparent_64%)] blur-xl" />
    </div>
  );
}