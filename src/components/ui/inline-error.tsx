'use client';

/**
 * InlineErrorMessage — UX 체크리스트 6·10번 구현
 * "에러 발생" 금지 → 원인 + 해결 가이드 구체적으로 제시
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InlineErrorMessageProps {
  /** 한 줄 요약 (무슨 문제인지) */
  title: string;
  /** 원인 설명 */
  cause?: string;
  /** 해결 방법 안내 */
  resolution?: string;
  /** 재시도 버튼 콜백 */
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function InlineErrorMessage({
  title,
  cause,
  resolution,
  onRetry,
  className,
  size = 'md',
}: InlineErrorMessageProps) {
  const isSmall = size === 'sm';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-red-200 bg-red-50',
        isSmall ? 'px-3 py-2.5' : 'px-4 py-3.5',
        className
      )}
    >
      <AlertCircle
        className={cn('shrink-0 text-red-500', isSmall ? 'mt-0.5 size-4' : 'mt-0.5 size-5')}
        aria-hidden
      />

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('font-semibold text-red-800', isSmall ? 'text-xs' : 'text-sm')}>
          {title}
        </p>

        {cause ? (
          <p className={cn('text-red-700 leading-relaxed', isSmall ? 'text-xs' : 'text-sm')}>
            <span className="font-medium">원인: </span>
            {cause}
          </p>
        ) : null}

        {resolution ? (
          <p className={cn('text-red-700 leading-relaxed', isSmall ? 'text-xs' : 'text-sm')}>
            <span className="font-medium">해결 방법: </span>
            {resolution}
          </p>
        ) : null}

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold text-red-700 hover:text-red-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded',
              isSmall ? 'mt-1 text-xs' : 'mt-1.5 text-sm'
            )}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            다시 시도
          </button>
        ) : null}
      </div>
    </div>
  );
}
