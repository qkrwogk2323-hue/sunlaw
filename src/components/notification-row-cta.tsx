'use client';

import { useState } from 'react';
import { buttonStyles } from '@/components/ui/button';
import { executeInteractionByKey } from '@/lib/interactions/execute-interaction-by-key';
import { NOTIFICATION_INTERACTION_KEYS } from '@/lib/interactions/registry';
import { createBrowserNavigateAdapter } from '@/lib/navigation/navigate-adapter';

type Status = 'active' | 'read' | 'resolved' | 'archived' | 'deleted';

type NotificationRowCtaProps = {
  notificationId: string;
  openHref: string;
  status: Status;
  compact?: boolean;
};

export function NotificationRowCta({ notificationId, openHref, status, compact = false }: NotificationRowCtaProps) {
  const [pending, setPending] = useState<'read' | 'resolve' | 'archive' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const adapter = createBrowserNavigateAdapter();

  const openClassName = compact
    ? 'text-xs font-medium text-slate-700 underline hover:text-slate-900'
    : buttonStyles({ size: 'sm', className: 'h-8 rounded-lg px-3 text-xs !text-white' });
  const mutateButtonClassName = compact
    ? 'text-xs font-medium text-slate-600 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';

  const executeMutate = async (
    pendingKey: 'read' | 'resolve' | 'archive',
    key: typeof NOTIFICATION_INTERACTION_KEYS[keyof typeof NOTIFICATION_INTERACTION_KEYS]
  ) => {
    setErrorMessage(null);
    setPending(pendingKey);

    const executed = await executeInteractionByKey(key, {
      actionOptions: {
        notificationId
      }
    });

    if (!executed.actionResult.ok) {
      setErrorMessage(executed.actionResult.message);
      setPending(null);
      return;
    }

    adapter.reload();
  };

  return (
    <div className={compact ? 'mt-2 flex flex-wrap items-center gap-2' : 'mt-3 flex flex-wrap items-center gap-2'}>
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          void executeInteractionByKey(NOTIFICATION_INTERACTION_KEYS.OPEN, {
            navigate: () => adapter.navigate(openHref)
          });
        }}
        className={openClassName}
      >
        열기{compact ? ' →' : ''}
      </button>

      {(status === 'active' || status === 'read') ? (
        <button
          type="button"
          onClick={() => {
            void executeMutate('resolve', NOTIFICATION_INTERACTION_KEYS.RESOLVE);
          }}
          className={mutateButtonClassName}
          disabled={pending !== null}
        >
          {pending === 'resolve' ? '처리 중...' : '해결 처리'}
        </button>
      ) : null}

      {status === 'active' ? (
        <button
          type="button"
          onClick={() => {
            void executeMutate('read', NOTIFICATION_INTERACTION_KEYS.MARK_READ);
          }}
          className={mutateButtonClassName}
          disabled={pending !== null}
        >
          {pending === 'read' ? '반영 중...' : '읽음 처리'}
        </button>
      ) : null}

      {status === 'resolved' ? (
        <button
          type="button"
          onClick={() => {
            void executeMutate('archive', NOTIFICATION_INTERACTION_KEYS.ARCHIVE);
          }}
          className={mutateButtonClassName}
          disabled={pending !== null}
        >
          {pending === 'archive' ? '이동 중...' : '보관함'}
        </button>
      ) : null}

      {errorMessage ? (
        <p className="w-full text-xs font-medium text-rose-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
