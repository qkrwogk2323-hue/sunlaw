'use client';

import { useState, type ReactNode } from 'react';
import { executeInteractionByKey, type ExecuteInteractionResult } from '@/lib/interactions/execute-interaction-by-key';
import type { InteractionKey } from '@/lib/interactions/registry';
import type { RunActionOptions } from '@/lib/actions/run-action-by-key';

type GuardedActionButtonProps = {
  interactionKey: InteractionKey;
  actionOptions?: RunActionOptions;
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
  onExecuted?: (result: ExecuteInteractionResult) => void;
};

export function GuardedActionButton({
  interactionKey,
  actionOptions,
  children,
  pendingLabel = '처리 중...',
  className,
  onExecuted
}: GuardedActionButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        setPending(true);
        void executeInteractionByKey(interactionKey, {
          actionOptions
        })
          .then((result) => onExecuted?.(result))
          .finally(() => setPending(false));
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
