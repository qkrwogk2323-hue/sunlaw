import Link from 'next/link';
import type { Route } from 'next';
import { BrandMark } from '@/components/brand-mark';
import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/brand';

export function BrandBanner({ href, className, theme = 'dark' }: { href?: Route; className?: string; theme?: 'dark' | 'light' }) {
  const themeClasses =
    theme === 'light'
      ? 'border-slate-300/35 bg-[linear-gradient(145deg,#0d2442,#0a1d36)] text-sky-100 shadow-[0_24px_54px_rgba(15,23,42,0.18)]'
      : 'border-sky-400/18 bg-[linear-gradient(145deg,#0d2442,#0a1d36)] text-sky-100 shadow-[0_24px_54px_rgba(8,47,73,0.24)]';

  const content = (
    <div
      className={cn(
        'vs-brand-banner flex min-h-[6.25rem] w-full items-center justify-center gap-4 rounded-[1.5rem] border px-5 py-3 text-sm backdrop-blur-sm sm:gap-5 sm:px-7',
        themeClasses,
        className
      )}
    >
      <BrandMark className="w-11 shrink-0 sm:w-[3.1rem]" />
      <div className="text-left">
        <div className="text-xl font-extrabold tracking-[0.16em] text-white sm:text-[2.15rem] sm:tracking-[0.2em]">
          {BRAND.displayName}
        </div>
        <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:mt-1.5 sm:text-[0.82rem] sm:tracking-[0.24em]">
          {BRAND.identityLabel}
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
