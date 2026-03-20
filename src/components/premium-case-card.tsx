import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PremiumCaseCard({
  href,
  title,
  subtitle,
  badges,
  meta,
  children,
  actionLabel = '열기',
  className
}: {
  href?: Route;
  title: string;
  subtitle?: string | null;
  badges?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  className?: string;
}) {
  const content = (
    <div className={cn('group rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]', className)}>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-slate-950">{title}</p>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
        {children}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">{meta}</div>
          {href ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700">
              {actionLabel}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
