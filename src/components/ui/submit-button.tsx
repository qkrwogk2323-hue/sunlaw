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
  disabled = false,
  pending
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonProps['size'];
  className?: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending ?? formPending;
  return (
    <Button type="submit" variant={variant} size={size} isLoading={isPending} disabled={disabled} className={className}>
      {isPending ? pendingLabel : children}
    </Button>
  );
}
