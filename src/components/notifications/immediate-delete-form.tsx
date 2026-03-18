'use client';

import { permanentlyDeleteNotificationAction } from '@/lib/actions/notification-actions';
import { SubmitButton } from '@/components/ui/submit-button';

export function ImmediateDeleteForm({ notificationId }: { notificationId: string }) {
  return (
    <form
      action={permanentlyDeleteNotificationAction}
      className="shrink-0"
      onSubmit={(event) => {
        if (!window.confirm('이 알림을 즉시 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton variant="destructive" pendingLabel="삭제 중..." className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs">
        즉시 삭제
      </SubmitButton>
    </form>
  );
}
