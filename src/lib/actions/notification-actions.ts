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
  return value.startsWith('/') ? value : '/dashboard';
}

async function getOwnedNotification(notificationId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, recipient_profile_id, organization_id, read_at, requires_action, resolved_at, action_href, destination_url, status, trashed_at, snoozed_until')
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
    .update({ read_at: new Date().toISOString(), status: 'read' })
    .eq('id', id)
    .eq('status', 'active');

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

  revalidateNotificationViews();
}

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
    revalidateNotificationViews();
    return;
  }

  if (operation === 'snooze_1d' || operation === 'snooze_3d') {
    const days = operation === 'snooze_1d' ? 1 : 3;
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ snoozed_until: snoozedUntil, read_at: now, status: 'read' })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .in('status', ['active', 'read']);

    if (error) throw error;
    revalidateNotificationViews();
    return;
  }

  if (operation === 'unsnooze') {
    const { error } = await supabase
      .from('notifications')
      .update({ snoozed_until: null })
      .eq('recipient_profile_id', auth.user.id)
      .in('id', ids)
      .in('status', ['active', 'read']);

    if (error) throw error;
    revalidateNotificationViews();
  }
}

export async function markNotificationResolvedAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
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

  revalidateNotificationViews();
}

export async function moveNotificationToTrashAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
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
    .update({ status: 'resolved', trashed_at: null, trashed_by: null })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .eq('status', 'archived');

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function snoozeNotificationAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  const daysRaw = Number(`${formData.get('days') ?? '1'}`);
  const days = Number.isFinite(daysRaw) && [1, 3, 7].includes(daysRaw) ? daysRaw : 1;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({ snoozed_until: snoozedUntil, read_at: now, status: 'read' })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .in('status', ['active', 'read']);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

export async function unsnoozeNotificationAction(formData: FormData) {
  const id = `${formData.get('notificationId') ?? ''}`;
  if (!id) {
    throw new Error('notificationId is required');
  }

  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ snoozed_until: null })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id)
    .in('status', ['active', 'read']);

  if (error) {
    throw error;
  }

  revalidateNotificationViews();
}

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
