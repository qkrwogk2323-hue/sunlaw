'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markCollaborationHubReadAction } from '@/lib/actions/organization-actions';

export function CollaborationHubLiveShell({
  hubId,
  organizationId,
  children
}: {
  hubId: string;
  organizationId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const sendRead = () => {
      const formData = new FormData();
      formData.set('hubId', hubId);
      formData.set('organizationId', organizationId);

      startTransition(async () => {
        try {
          await markCollaborationHubReadAction(formData);
        } catch {
          // Keep the hub usable even if read-state sync fails.
        }
      });
    };

    sendRead();

    const intervalId = window.setInterval(() => {
      router.refresh();
      sendRead();
    }, 10000);

    const onFocus = () => {
      router.refresh();
      sendRead();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [hubId, organizationId, router, startTransition]);

  return <>{children}</>;
}