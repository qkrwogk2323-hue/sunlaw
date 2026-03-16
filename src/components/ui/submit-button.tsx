'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps, type ButtonVariant } from '@/components/ui/button';

export function SubmitButton({
  children,
  pendingLabel = '처리 중...',
  variant = 'primary',
  className,
  size = 'md',
  disabled = false
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonProps['size'];
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} isLoading={pending} disabled={disabled} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
