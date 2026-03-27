'use client';

import type { ReactNode } from 'react';
import { executeInteractionByKey, type ExecuteInteractionResult } from '@/lib/interactions/execute-interaction-by-key';
import type { InteractionKey } from '@/lib/interactions/registry';
import { createBrowserNavigateAdapter } from '@/lib/navigation/navigate-adapter';

type GuardedLinkProps = {
  interactionKey: InteractionKey;
  children: ReactNode;
  className?: string;
  navigateTarget?: string;
  onExecuted?: (result: ExecuteInteractionResult) => void;
};

export function GuardedLink({ interactionKey, children, className, navigateTarget, onExecuted }: GuardedLinkProps) {
  const adapter = createBrowserNavigateAdapter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void executeInteractionByKey(interactionKey, {
          navigate: adapter.navigate,
          navigateTarget
        }).then((result) => onExecuted?.(result));
      }}
    >
      {children}
    </button>
  );
}
