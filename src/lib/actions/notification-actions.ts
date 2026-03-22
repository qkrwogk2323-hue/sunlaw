'use server';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuthenticatedUser } from '@/lib/auth';
import { resolveNotificationOpenTarget } from '@/lib/notification-open';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function isMissingColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '42703'
  );
}

function revalidateNotificationViews() {
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}

async function logNotificationAudit({
  actorId,
  organizationId,
  notificationId,
  action,
  meta
}: {
  actorId: string;
  organizationId?: string | null;
  notificationId: string;
  action: string;
  meta?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  void supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    resource_type: 'notification',
    resource_id: notificationId,
    organization_id: organizationId ?? null,
    meta: meta ?? {}
  });
}

async function getOwnedNotification(notificationId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, recipient_profile_id, organization_id, read_at, requires_action, resolved_at, action_href, destination_url, status, trashed_at')
    .eq('id', notificationId)
    .eq('recipient_profile_id', auth.user.id)
    .single();

  if (error || !notification) {
    throw error ?? new Error('알림을 찾을 수 없습니다.');
  }

  return { auth, supabase, notification };
}

// 단일 알림을 읽음 상태로 변경한다.
export async function markNotificationReadAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('알림 식별자가 누락되었습니다.');
  }

  const { auth, supabase, notification } = await getOwnedNotification(id);
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: notification.organization_id,
    notificationId: id,
    action: 'notification.read'
  });
  revalidateNotificationViews();
}

// 현재 사용자의 알림을 모두 읽음 처리한다.
export async function markAllNotificationsReadAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const upgraded = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'active');

  if (upgraded.error && !isMissingColumnError(upgraded.error)) {
    throw upgraded.error;
  }

  if (upgraded.error && isMissingColumnError(upgraded.error)) {
    const legacy = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_profile_id', auth.user.id)
      .is('read_at', null);

    if (legacy.error) {
      throw legacy.error;
    }
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: auth.profile.default_organization_id,
    notificationId: auth.user.id,
    action: 'notification.read_all',
    meta: { scope: 'notifications_inbox' }
  });
  revalidateNotificationViews();
}

// 선택한 알림들을 일괄 상태 전이한다.
export async function bulkNotificationTransitionAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const operation = `${formData.get('operation') ?? ''}`;
  const ids = formData
    .getAll('notificationIds')
    .map((value) => `${value}`.trim())
    .filter(Boolean);

  if (!ids.length) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  if (operation === 'read') {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now, status: 'read' })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .eq('status', 'active');

    if (error) throw error;
    await logNotificationAudit({
      actorId: auth.user.id,
      organizationId: auth.profile.default_organization_id,
      notificationId: ids[0]!,
      action: 'notification.bulk_read',
      meta: { count: ids.length, notification_ids: ids }
    });
    revalidateNotificationViews();
    return;
  }

  if (operation === 'resolve') {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'resolved', resolved_at: now, read_at: now })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .in('status', ['active', 'read']);

    if (error) throw error;
    await logNotificationAudit({
      actorId: auth.user.id,
      organizationId: auth.profile.default_organization_id,
      notificationId: ids[0]!,
      action: 'notification.bulk_resolve',
      meta: { count: ids.length, notification_ids: ids }
    });
    revalidateNotificationViews();
    return;
  }

  if (operation === 'archive') {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'archived', trashed_at: now, trashed_by: auth.user.id, read_at: now })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .eq('status', 'resolved');

    if (error) throw error;
    await logNotificationAudit({
      actorId: auth.user.id,
      organizationId: auth.profile.default_organization_id,
      notificationId: ids[0]!,
      action: 'notification.bulk_archive',
      meta: { count: ids.length, notification_ids: ids }
    });
    revalidateNotificationViews();
    return;
  }

  if (operation === 'delete_now') {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'deleted', deleted_at: now })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .eq('status', 'archived');
    if (error) throw error;
    await logNotificationAudit({
      actorId: auth.user.id,
      organizationId: auth.profile.default_organization_id,
      notificationId: ids[0]!,
      action: 'notification.bulk_delete',
      meta: { count: ids.length, notification_ids: ids }
    });
    revalidateNotificationViews();
  }
}

// 알림을 해결 완료 상태로 바꾼다.
export async function markNotificationResolvedAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('알림 식별자가 누락되었습니다.');
  }

  const { auth, supabase, notification } = await getOwnedNotification(id);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'resolved',
      resolved_at: now,
      read_at: now
    })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .in('status', ['active', 'read']);

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: notification.organization_id,
    notificationId: id,
    action: 'notification.resolved'
  });
  revalidateNotificationViews();
}

// 알림을 보관함으로 이동한다.
export async function moveNotificationToTrashAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('알림 식별자가 누락되었습니다.');
  }

  const { auth, supabase, notification } = await getOwnedNotification(id);

  if (notification.status !== 'resolved') {
    throw new Error('보관은 resolved 상태에서만 가능합니다.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'archived',
      trashed_at: now,
      trashed_by: auth.user.id,
      read_at: notification.read_at ?? now
    })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id);

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: notification.organization_id,
    notificationId: id,
    action: 'notification.archived'
  });
  revalidateNotificationViews();
}

// 보관함의 알림을 다시 활성 목록으로 복구한다.
export async function restoreNotificationAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('알림 식별자가 누락되었습니다.');
  }

  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'resolved', trashed_at: null, trashed_by: null })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'archived');

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: auth.profile.default_organization_id,
    notificationId: id,
    action: 'notification.restored'
  });
  revalidateNotificationViews();
}

// 보관함에 있는 알림을 모두 비운다.
export async function emptyNotificationTrashAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'deleted', deleted_at: now })
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'archived');

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: auth.profile.default_organization_id,
    notificationId: auth.user.id,
    action: 'notification.trash_emptied'
  });
  revalidateNotificationViews();
}

// 보관된 알림을 영구 삭제한다.
export async function permanentlyDeleteNotificationAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('알림 식별자가 누락되었습니다.');
  }

  const { auth, supabase, notification } = await getOwnedNotification(id);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'deleted', deleted_at: now })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'archived');

  if (error) {
    throw error;
  }

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: notification.organization_id,
    notificationId: id,
    action: 'notification.deleted'
  });
  revalidateNotificationViews();
}

// 알림 채널별 수신 설정을 저장한다.
export async function updateNotificationChannelPreferenceAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const payload = {
    profile_id: auth.user.id,
    kakao_enabled: formData.get('kakao_enabled') === 'on',
    kakao_important_only: formData.get('kakao_important_only') === 'on',
    allow_case: formData.get('allow_case') === 'on',
    allow_schedule: formData.get('allow_schedule') === 'on',
    allow_client: formData.get('allow_client') === 'on',
    allow_collaboration: formData.get('allow_collaboration') === 'on'
  };

  const { error } = await supabase
    .from('notification_channel_preferences')
    .upsert(payload, { onConflict: 'profile_id' });

  if (error) throw error;
  revalidateNotificationViews();
}

// 알림 대상 화면으로 이동하기 전에 상태를 정리한다.
export async function openNotificationTargetAction(formData: FormData) {
  const notificationId = `${formData.get('notificationId') ?? ''}`;
  const nextOrganizationId = `${formData.get('organizationId') ?? ''}`;
  const submittedHref = `${formData.get('href') ?? ''}`.trim();
  const { auth, notification } = await getOwnedNotification(notificationId);
  const targetHref = await resolveNotificationOpenTarget({
    notificationId,
    nextOrganizationId,
    submittedHref
  });

  await logNotificationAudit({
    actorId: auth.user.id,
    organizationId: notification.organization_id,
    notificationId,
    action: 'notification.opened',
    meta: {
      target_href: targetHref,
      submitted_href: submittedHref || null,
      switched_organization_id: nextOrganizationId || null
    }
  });

  redirect(targetHref as Route);
}
