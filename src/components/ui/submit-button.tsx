'use client';

import type { ReactNode } from 'react';
import { useContext } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps, type ButtonVariant } from '@/components/ui/button';
import { ActionFormPendingContext } from '@/components/ui/client-action-form';

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
  const { pending: formPending } = useFormStatus();
  const contextPending = useContext(ActionFormPendingContext);
  const pending = formPending || contextPending;
  return (
    <Button type="submit" variant={variant} size={size} isLoading={pending} disabled={disabled} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
