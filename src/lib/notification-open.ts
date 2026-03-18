import 'server-only';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    .select('id, recipient_profile_id, organization_id, read_at, status, destination_url, action_href')
    .eq('id', notificationId)
    .eq('recipient_profile_id', auth.user.id)
    .single();

  if (error || !notification) {
    throw error ?? new Error('알림을 찾을 수 없습니다.');
  }

  return { auth, supabase, notification };
}

export async function resolveNotificationOpenTarget({
  notificationId,
  nextOrganizationId,
  submittedHref
}: {
  notificationId: string;
  nextOrganizationId?: string | null;
  submittedHref?: string | null;
}): Promise<Route> {
  const id = notificationId.trim();

  if (!id) {
    throw new Error('notificationId is required');
  }

  const resolvedOrganizationId = `${nextOrganizationId ?? ''}`.trim();
  const resolvedHref = `${submittedHref ?? ''}`.trim();
  const { auth, supabase, notification } = await getOwnedNotification(id);

  if (resolvedOrganizationId && resolvedOrganizationId !== auth.profile.default_organization_id) {
    const hasMembership = auth.memberships.some((membership) => membership.organization_id === resolvedOrganizationId);
    if (!hasMembership) {
      throw new Error('해당 조직으로 전환할 수 없습니다.');
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ default_organization_id: resolvedOrganizationId })
      .eq('id', auth.user.id);

    if (profileError) {
      throw profileError;
    }
  }

  const { error: notificationError } = await supabase
    .from('notifications')
    .update({
      read_at: notification.read_at ?? new Date().toISOString(),
      status: notification.status === 'active' ? 'read' : notification.status
    })
    .eq('id', id)
    .eq('recipient_profile_id', auth.user.id);

  if (notificationError) {
    throw notificationError;
  }

  revalidateNotificationViews();
  if (resolvedOrganizationId && resolvedOrganizationId !== auth.profile.default_organization_id) {
    revalidatePath('/cases');
    revalidatePath('/clients');
    revalidatePath('/admin/support');
  }

  return normalizeRelativeHref(notification.destination_url ?? notification.action_href ?? resolvedHref) as Route;
}
