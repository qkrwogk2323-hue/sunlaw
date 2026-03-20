'use client';

/**
 * EnhancedButton — tooltip + disabledReason 인터랙션을 Button에 추가하는 래퍼
 *
 * button.tsx의 Button은 서버 컴포넌트에서도 안전하게 사용되므로
 * tooltip/disabledReason 인터랙션(useState)은 이 'use client' 래퍼에서 처리합니다.
 *
 * - tooltip/disabledReason 이 필요 없는 곳: Button (button.tsx)
 * - tooltip/disabledReason 이 필요한 곳: EnhancedButton (이 파일) 또는 DangerActionButton
 *
 * ButtonProps를 그대로 받으므로 기존 Button 교체 없이 import만 바꾸면 됩니다.
 *
 * @example
 * <EnhancedButton tooltip="저장 후 페이지가 새로고침됩니다.">저장</EnhancedButton>
 * <EnhancedButton disabledReason="관리자 권한이 필요합니다." disabled>삭제</EnhancedButton>
 */

import { useId, useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/cn';

// EnhancedButtonProps = ButtonProps (tooltip/disabledReason already included)
export type EnhancedButtonProps = ButtonProps;

export function EnhancedButton({
  tooltip,
  disabledReason,
  disabled,
  isLoading,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: EnhancedButtonProps) {
  const tooltipId = useId();
  const [showTooltip, setShowTooltip] = useState(false);

  const activeTooltip = disabled && disabledReason ? disabledReason : tooltip;
  const isDisabled = disabled || isLoading;

  return (
    <span className="relative inline-flex">
      <Button
        disabled={disabled}
        isLoading={isLoading}
        className={className}
        aria-describedby={activeTooltip && showTooltip ? tooltipId : undefined}
        onMouseEnter={(e) => { setShowTooltip(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setShowTooltip(false); onMouseLeave?.(e); }}
        onFocus={(e) => { setShowTooltip(true); onFocus?.(e); }}
        onBlur={(e) => { setShowTooltip(false); onBlur?.(e); }}
        {...props}
      >
        {children}
      </Button>

      {activeTooltip && showTooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2',
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
            'bg-slate-900 text-white shadow-lg',
            isDisabled ? 'border border-slate-700' : ''
          )}
        >
          {activeTooltip}
          <span aria-hidden className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      ) : null}
    </span>
  );
}
