import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /**
   * 마우스 호버 / 포커스 시 표시할 툴팁.
   * 실제 렌더링은 EnhancedButton (tooltip 인터랙션 필요 시) 또는
   * DangerActionButton 등 'use client' 컴포넌트에서 처리됩니다.
   */
  tooltip?: string;
  /**
   * disabled 상태일 때 표시할 이유 (스크린리더 + 툴팁).
   * 실제 렌더링은 EnhancedButton에서 처리됩니다.
   */
  disabledReason?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,#0f766e_0%,#0284c7_55%,#0f172a_100%)] text-white shadow-[0_14px_34px_rgba(14,165,164,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(14,165,164,0.24)]',
  secondary:
    'border border-slate-300 bg-white text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-[0_12px_24px_rgba(15,23,42,0.10)]',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950',
  destructive: 'bg-red-600 text-white shadow-[0_10px_24px_rgba(220,38,38,0.18)] hover:bg-red-500'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base'
};

export function segmentStyles({
  active = false,
  className
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    active
      ? 'bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]'
      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950',
    className
  );
}

export const buttonStyles = ({
  variant = 'primary',
  size = 'md',
  className
}: Pick<ButtonProps, 'variant' | 'size' | 'className'> = {}) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-200 transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-[busy=true]:cursor-progress',
    variantClasses[variant],
    sizeClasses[size],
    className
  );

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  isLoading = false,
  // tooltip/disabledReason are typed here for prop-passing convenience but
  // interactive rendering is handled by EnhancedButton ('use client' wrapper).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tooltip: _tooltip,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  disabledReason: _disabledReason,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={isLoading}
      disabled={disabled || isLoading}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
