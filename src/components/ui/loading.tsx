'use client';

/**
 * Loading Components — UX 체크리스트 5번 구현
 * LoadingOverlay: 전체/부분 영역 로딩 오버레이
 * InlineLoadingSpinner: 인라인 스피너 (텍스트 + 스피너)
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

// ── LoadingOverlay ─────────────────────────────────────────────────────────────

export interface LoadingOverlayProps {
  /** true면 fixed (전체 화면), false면 absolute (부모 relative 영역) */
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  fullScreen = false,
  message = '처리 중...',
  className,
}: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-label={message}
      aria-live="polite"
      className={cn(
        'flex items-center justify-center bg-white/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0 rounded-inherit',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
        <Loader2 className="size-8 animate-spin text-sky-600" aria-hidden />
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}

// ── InlineLoadingSpinner ───────────────────────────────────────────────────────

export interface InlineLoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function InlineLoadingSpinner({
  message,
  size = 'md',
  className,
}: InlineLoadingSpinnerProps) {
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      role="status"
      aria-label={message ?? '로딩 중'}
      className={cn('inline-flex items-center gap-2 text-slate-500', className)}
    >
      <Loader2 className={cn('animate-spin', iconSize)} aria-hidden />
      {message ? <span className={cn('font-medium', textSize)}>{message}</span> : null}
    </span>
  );
}
