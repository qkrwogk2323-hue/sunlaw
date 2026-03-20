'use client';

import { permanentlyDeleteNotificationAction } from '@/lib/actions/notification-actions';
import { DangerActionButton } from '@/components/ui/danger-action-button';

export function ImmediateDeleteForm({ notificationId }: { notificationId: string }) {
  return (
    <DangerActionButton
      action={permanentlyDeleteNotificationAction}
      fields={{ notificationId }}
      confirmTitle="알림 즉시 삭제"
      confirmDescription="이 알림을 즉시 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
      confirmLabel="즉시 삭제"
      buttonVariant="destructive"
      successTitle="알림 삭제 완료"
      className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs"
    >
      즉시 삭제
    </DangerActionButton>
  );
}
