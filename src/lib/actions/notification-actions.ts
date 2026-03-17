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

function normalizeRelativeHref(value: string) {
  return value.startsWith('/') ? value : '/notifications';
}

async function getOwnedNotification(notificationId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, recipient_profile_id, organization_id, read_at, requires_action, resolved_at, action_href')
    .eq('id', notificationId)
    .eq('recipient_profile_id', auth.user.id)
    .single();

  if (error || !notification) {
    throw error ?? new Error('알림을 찾을 수 없습니다.');
  }

  return { auth, supabase, notification };
}

export async function markNotificationReadAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function markAllNotificationsReadAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const upgraded = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_profile_id', auth.user.id)
    .is('trashed_at', null)
    .is('read_at', null);

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

  revalidateNotificationViews();
}

export async function moveNotificationToTrashAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const { auth, supabase, notification } = await getOwnedNotification(id);

  if (notification.requires_action && !notification.resolved_at) {
    throw new Error('처리가 끝나지 않은 알림은 보관함으로 옮길 수 없습니다.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({
      trashed_at: now,
      trashed_by: auth.user.id,
      read_at: notification.read_at ?? now
    })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .is('trashed_at', null);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function restoreNotificationAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ trashed_at: null, trashed_by: null })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .not('trashed_at', 'is', null);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function emptyNotificationTrashAction() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_profile_id', auth.user.id)
    .not('trashed_at', 'is', null);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function openNotificationTargetAction(formData: FormData) {
  const targetHref = await resolveNotificationOpenTarget({
    notificationId: `${formData.get('notificationId') ?? ''}`,
    nextOrganizationId: `${formData.get('organizationId') ?? ''}`,
    submittedHref: `${formData.get('href') ?? ''}`.trim()
  });

  redirect(targetHref as Route);
}
