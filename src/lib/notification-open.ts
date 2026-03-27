import 'server-only';

import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { createAccessDeniedFeedback, createConditionFailedFeedback, createValidationFailedFeedback, throwGuardFeedback } from '@/lib/guard-feedback';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyPlatformBugAlert } from '@/lib/platform-alerts';
import { resolveSafeInternalHref } from '@/lib/navigation/safe-navigation';
import { ROUTES } from '@/lib/routes/registry';

function revalidateNotificationViews() {
  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}

function normalizeRelativeHref(value: string) {
  return resolveSafeInternalHref(value, ROUTES.NOTIFICATIONS);
}

import { isPlatformOnlyNotification } from '@/lib/notification-policy';

function isPlatformOnlyHref(value: string) {
  return value.startsWith('/admin')
    || value.startsWith('/settings/platform')
    || value.startsWith('/settings/features');
}

async function getOwnedNotification(notificationId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, recipient_profile_id, organization_id, read_at, status, destination_url, action_href, notification_type')
    .eq('id', notificationId)
    .eq('recipient_profile_id', auth.user.id)
    .single();

  if (error || !notification) {
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'NOTIFICATION_NOT_FOUND',
      blocked: '알림을 찾지 못했습니다.',
      cause: error?.message ?? '이미 처리되었거나 현재 계정에 속하지 않는 알림입니다.',
      resolution: '알림 목록을 새로고침한 뒤 다시 시도해 주세요.'
    }));
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
    throwGuardFeedback(createValidationFailedFeedback({
      code: 'NOTIFICATION_ID_MISSING',
      blocked: '열 알림 정보를 찾지 못했습니다.',
      cause: '알림 식별자가 함께 전달되지 않았습니다.',
      resolution: '알림 목록에서 다시 열어 주세요.'
    }));
  }

  const resolvedOrganizationId = `${nextOrganizationId ?? ''}`.trim();
  const resolvedHref = `${submittedHref ?? ''}`.trim();
  const { auth, supabase, notification } = await getOwnedNotification(id);
  const targetHref = normalizeRelativeHref(notification.destination_url ?? notification.action_href ?? resolvedHref);
  const hasPlatformAccess = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));

  if ((isPlatformOnlyHref(targetHref) || isPlatformOnlyNotification(notification.notification_type ?? '')) && !hasPlatformAccess) {
    await notifyPlatformBugAlert({
      actorId: auth.user.id,
      organizationId: auth.profile.default_organization_id,
      title: '플랫폼 전용 알림이 일반 조직 화면에 노출되었습니다.',
      body: `플랫폼 전용 경로 ${targetHref} 를 일반 조직 화면에서 열려고 한 흔적이 감지되었습니다.`,
      actionHref: '/admin/audit?tab=general&table=notifications',
      actionLabel: '플랫폼 알림 기록 확인',
      resourceType: 'notification',
      resourceId: notification.id,
      meta: {
        notificationId: notification.id,
        targetHref,
        code: 'PLATFORM_NOTIFICATION_LEAK'
      }
    });

    throwGuardFeedback(createAccessDeniedFeedback({
      code: 'PLATFORM_NOTIFICATION_LEAK',
      blocked: '플랫폼 전용 알림은 현재 조직에서 열 수 없습니다.',
      cause: '플랫폼 관리자 화면 전용 알림이 일반 조직 알림센터에 섞여 들어온 버그가 감지되었습니다.',
      resolution: '이 알림은 열지 않고 알림센터로 돌아갑니다. 운영팀에 자동 기록되었습니다.'
    }));
  }

  if (resolvedOrganizationId && resolvedOrganizationId !== auth.profile.default_organization_id) {
    const hasMembership = auth.memberships.some((membership) => membership.organization_id === resolvedOrganizationId);
    if (!hasMembership) {
      throwGuardFeedback(createAccessDeniedFeedback({
        code: 'NOTIFICATION_TARGET_ORGANIZATION_FORBIDDEN',
        blocked: '해당 조직으로 전환할 수 없습니다.',
        cause: '현재 계정은 지정된 조직의 활성 구성원이 아닙니다.',
        resolution: '조직 전환 권한을 확인하거나 올바른 알림에서 다시 시도해 주세요.'
      }));
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ default_organization_id: resolvedOrganizationId })
      .eq('id', auth.user.id);

    if (profileError) {
      throwGuardFeedback(createConditionFailedFeedback({
        code: 'NOTIFICATION_ORGANIZATION_SWITCH_FAILED',
        blocked: '알림 확인 중 조직 전환을 저장하지 못했습니다.',
        cause: '프로필 업데이트 중 문제가 발생했습니다.',
        resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
      }));
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
    throwGuardFeedback(createConditionFailedFeedback({
      code: 'NOTIFICATION_MARK_READ_FAILED',
      blocked: '알림 읽음 처리를 저장하지 못했습니다.',
      cause: '알림 상태 업데이트 중 문제가 발생했습니다.',
      resolution: '잠시 후 다시 시도해 주세요. 반복되면 관리자에게 문의해 주세요.'
    }));
  }

  revalidateNotificationViews();
  if (resolvedOrganizationId && resolvedOrganizationId !== auth.profile.default_organization_id) {
    revalidatePath('/cases');
    revalidatePath('/clients');
    revalidatePath('/admin/support');
  }

  return targetHref as Route;
}
