import Link from 'next/link';
import type { Route } from 'next';
import { Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { cn } from '@/lib/cn';

export function BrandBanner({ href, className, theme = 'dark' }: { href?: Route; className?: string; theme?: 'dark' | 'light' }) {
  const themeClasses =
    theme === 'light'
      ? 'border-slate-300/55 bg-[linear-gradient(145deg,rgba(44,55,78,0.92),rgba(37,47,67,0.94))] text-sky-100 shadow-[0_24px_54px_rgba(15,23,42,0.18)]'
      : 'border-sky-400/30 bg-[linear-gradient(145deg,rgba(28,35,56,0.96),rgba(31,41,55,0.94))] text-sky-100 shadow-[0_24px_54px_rgba(8,47,73,0.28)]';

  const content = (
    <div
      className={cn(
        'vs-brand-banner flex min-h-[6.25rem] w-full items-center justify-center gap-3 rounded-[1.5rem] border px-4 py-3 text-sm backdrop-blur-sm sm:gap-4 sm:px-6',
        themeClasses,
        className
      )}
    >
      <BrandMark className="w-12 sm:w-14" />
      <div>
        <div className={cn('text-xl font-semibold tracking-[0.16em] sm:text-3xl sm:tracking-[0.24em]', theme === 'light' ? 'text-white' : 'text-white')}>
          VEIN SPIRAL
        </div>
        <div className={cn('mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:mt-2 sm:text-sm', theme === 'light' ? 'text-slate-200/92' : 'text-sky-100/88')}>
          <span>전문가 협업 서비스</span>
          <span className={theme === 'light' ? 'text-slate-400/75' : 'text-sky-200/35'}>|</span>
          <span className={cn('inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em]', theme === 'light' ? 'text-emerald-300/90' : 'text-emerald-200/82')}>
            <Sparkles className="size-3.5" />
            Spiral Identity
          </span>
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block w-full"
    >
      {content}
    </Link>
  );
}
