import { NextResponse } from 'next/server';
import {
  markNotificationReadAction,
  markNotificationResolvedAction,
  moveNotificationToTrashAction
} from '@/lib/actions/notification-actions';
import { INTERACTION_ACTION_KEYS } from '@/lib/interactions/registry';

type NotificationActionRequest = {
  actionKey?: string;
  notificationId?: string;
};

function toFormData(notificationId: string) {
  const formData = new FormData();
  formData.set('notificationId', notificationId);
  return formData;
}

export async function POST(request: Request) {
  let payload: NotificationActionRequest;
  try {
    payload = (await request.json()) as NotificationActionRequest;
  } catch {
    return NextResponse.json({ ok: false, message: '요청 본문을 해석할 수 없습니다.' }, { status: 400 });
  }

  const actionKey = `${payload.actionKey ?? ''}`.trim();
  const notificationId = `${payload.notificationId ?? ''}`.trim();
  if (!actionKey || !notificationId) {
    return NextResponse.json({ ok: false, message: 'actionKey 또는 notificationId가 누락되었습니다.' }, { status: 400 });
  }

  const formData = toFormData(notificationId);

  try {
    if (actionKey === INTERACTION_ACTION_KEYS.NOTIFICATIONS_MARK_READ) {
      await markNotificationReadAction(formData);
      return NextResponse.json({ ok: true });
    }
    if (actionKey === INTERACTION_ACTION_KEYS.NOTIFICATIONS_RESOLVE) {
      await markNotificationResolvedAction(formData);
      return NextResponse.json({ ok: true });
    }
    if (actionKey === INTERACTION_ACTION_KEYS.NOTIFICATIONS_ARCHIVE) {
      await moveNotificationToTrashAction(formData);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, message: `지원하지 않는 actionKey: ${actionKey}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알림 처리 요청 중 오류가 발생했습니다.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
