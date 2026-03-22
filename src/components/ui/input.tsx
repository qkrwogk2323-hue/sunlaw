import * as React from 'react';
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={error || props['aria-invalid'] === true}
      className={cn(
        'flex h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400',
        error
          ? 'border-red-300 ring-1 ring-red-100 focus:border-red-500'
          : 'border-slate-200 focus:border-slate-900',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
