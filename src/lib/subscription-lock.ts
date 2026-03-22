import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type SubscriptionState =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'locked_soft'
  | 'locked_hard'
  | 'cancelled';

type SubscriptionSnapshot = {
  organizationId: string;
  state: SubscriptionState;
  planCode: string | null;
  trialEndAt: string | null;
  renewalDueAt: string | null;
  pastDueStartedAt: string | null;
  lockedSoftAt: string | null;
  lockedHardAt: string | null;
  cancelledAt: string | null;
  exportAllowedWhenCancelled: boolean;
  lockReason: string | null;
};

const LOCKED_SOFT_ALLOWED_PREFIXES = ['/billing', '/settings/subscription', '/admin/support', '/login', '/collections', '/reports'];
const LOCKED_HARD_ALLOWED_PREFIXES = ['/billing', '/settings/subscription', '/admin/support', '/login'];
const CANCELLED_ALLOWED_PREFIXES = ['/billing', '/settings/subscription', '/admin/support', '/login'];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const getOrganizationSubscriptionSnapshot = cache(async (organizationId: string | null | undefined): Promise<SubscriptionSnapshot | null> => {
  if (!organizationId) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('organization_subscription_states')
    .select('organization_id, state, plan_code, trial_end_at, renewal_due_at, past_due_started_at, locked_soft_at, locked_hard_at, cancelled_at, export_allowed_when_cancelled, lock_reason')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    console.error('[getOrganizationSubscriptionSnapshot] query error:', error.message);
    return null;
  }

  if (!data) {
    return {
      organizationId,
      state: 'active',
      planCode: null,
      trialEndAt: null,
      renewalDueAt: null,
      pastDueStartedAt: null,
      lockedSoftAt: null,
      lockedHardAt: null,
      cancelledAt: null,
      exportAllowedWhenCancelled: false,
      lockReason: null
    };
  }

  return {
    organizationId: data.organization_id,
    state: data.state as SubscriptionState,
    planCode: data.plan_code,
    trialEndAt: data.trial_end_at,
    renewalDueAt: data.renewal_due_at,
    pastDueStartedAt: data.past_due_started_at,
    lockedSoftAt: data.locked_soft_at,
    lockedHardAt: data.locked_hard_at,
    cancelledAt: data.cancelled_at,
    exportAllowedWhenCancelled: data.export_allowed_when_cancelled ?? false,
    lockReason: data.lock_reason
  };
});

export function getSubscriptionLockMessage(snapshot: SubscriptionSnapshot | null) {
  if (!snapshot) return null;
  if (snapshot.state === 'locked_soft') {
    return {
      title: '결제 확인이 지연되어 일부 기능이 잠겼습니다.',
      description: '결제, 고객센터, 내보내기만 허용됩니다. 구독 관리 페이지에서 결제를 재개해 주세요.'
    };
  }
  if (snapshot.state === 'locked_hard') {
    return {
      title: '구독이 장기 미납 상태여서 업무 화면이 잠겼습니다.',
      description: '결제 또는 고객센터 경로만 허용됩니다. 결제를 완료하면 바로 해제됩니다.'
    };
  }
  if (snapshot.state === 'past_due') {
    return {
      title: '결제 갱신이 지연되고 있습니다.',
      description: '구독 관리 페이지에서 갱신을 완료해 주세요.'
    };
  }
  if (snapshot.state === 'cancelled') {
    return {
      title: '구독이 종료되었습니다.',
      description: snapshot.exportAllowedWhenCancelled
        ? '결제와 고객센터, 데이터 내보내기만 허용됩니다.'
        : '결제와 고객센터 경로만 허용됩니다.'
    };
  }
  return null;
}

export async function enforceSubscriptionRouteAccess(snapshot: SubscriptionSnapshot | null) {
  if (!snapshot) return;

  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '/dashboard';

  if (snapshot.state === 'locked_soft' && !matchesPrefix(pathname, LOCKED_SOFT_ALLOWED_PREFIXES)) {
    redirect('/settings/subscription?locked=soft' as Route);
  }

  if (snapshot.state === 'locked_hard' && !matchesPrefix(pathname, LOCKED_HARD_ALLOWED_PREFIXES)) {
    redirect('/settings/subscription?locked=hard' as Route);
  }

  if (snapshot.state === 'cancelled') {
    const allowed = [...CANCELLED_ALLOWED_PREFIXES];
    if (snapshot.exportAllowedWhenCancelled) {
      allowed.push('/collections');
      allowed.push('/reports');
    }
    if (!matchesPrefix(pathname, allowed)) {
      redirect('/settings/subscription?locked=cancelled' as Route);
    }
  }
}
