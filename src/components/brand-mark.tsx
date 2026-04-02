import { cn } from '@/lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('relative isolate aspect-square w-14', className)} aria-hidden="true">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_8px_16px_rgba(34,211,238,0.14)]">
        <defs>
          <linearGradient id="vs-spiral-stroke" x1="8%" y1="18%" x2="92%" y2="82%">
            <stop offset="0%" stopColor="#8fb7d6" />
            <stop offset="46%" stopColor="#61c3f0" />
            <stop offset="100%" stopColor="#16b4f2" />
          </linearGradient>
          <radialGradient id="vs-spiral-dot" cx="50%" cy="50%" r="68%">
            <stop offset="0%" stopColor="#dff6ff" />
            <stop offset="52%" stopColor="#37bef0" />
            <stop offset="100%" stopColor="#1193d1" />
          </radialGradient>
        </defs>
        <g transform="translate(60 60) rotate(-14)">
          <path d="M -10 8 A 14 14 0 1 1 8 -10" fill="none" stroke="url(#vs-spiral-stroke)" strokeWidth="6" strokeLinecap="round" />
          <path d="M -19 12 A 24 24 0 1 1 12 -19" fill="none" stroke="url(#vs-spiral-stroke)" strokeWidth="6" strokeLinecap="round" opacity="0.96" />
          <path d="M -28 17 A 34 34 0 1 1 16 -28" fill="none" stroke="url(#vs-spiral-stroke)" strokeWidth="6" strokeLinecap="round" opacity="0.92" />
          <path d="M -37 22 A 44 44 0 1 1 20 -37" fill="none" stroke="url(#vs-spiral-stroke)" strokeWidth="6" strokeLinecap="round" opacity="0.82" />
          <path d="M -18 -6 A 18 18 0 0 1 -10 -18" fill="none" stroke="#78c8ee" strokeWidth="5" strokeLinecap="round" opacity="0.95" />
          <circle cx="0" cy="0" r="8" fill="url(#vs-spiral-dot)" />
          <circle cx="0" cy="0" r="2.7" fill="#0f2748" opacity="0.86" />
        </g>
      </svg>
      <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_70%)] blur-xl" />
    </div>
  );
}
