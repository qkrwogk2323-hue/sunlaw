import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getEffectiveOrganizationId, isPlatformOperator } from '@/lib/auth';
import { hasCompletedLegalName, isClientAccountActive, isClientAccountPending } from '@/lib/client-account';
import { enforceSubscriptionRouteAccess, getOrganizationSubscriptionSnapshot, getSubscriptionLockMessage } from '@/lib/subscription-lock';
import { readSupportSessionCookie } from '@/lib/support-cookie';
import type { AuthContext } from '@/lib/types';

/**
 * 앱 진입 시 적용되는 모든 서버 정책을 순서대로 평가합니다.
 * layout.tsx에서 호출되며, 정책 위반 시 내부에서 redirect()를 실행합니다.
 *
 * 정책 실행 순서:
 * 1. 비밀번호 변경 강제
 * 2. 프로필 완성 강제
 * 3. 실명 입력 강제
 * 4. 의뢰인 계정 대기 상태
 * 5. 의뢰인 계정 활성화 → 포털로 이동
 * 6. 구독 잠금 검사
 * 7. 조직 미가입 처리
 */
export async function enforceAppEntryPolicy(auth: AuthContext) {
  if (auth.profile.must_change_password) {
    redirect('/start/password-reset' as Route);
  }
  if (auth.profile.must_complete_profile) {
    redirect('/start/member-profile' as Route);
  }
  if (!hasCompletedLegalName(auth.profile)) {
    redirect('/start/profile-name' as Route);
  }
  if (isClientAccountPending(auth.profile)) {
    redirect('/start/pending' as Route);
  }
  if (isClientAccountActive(auth.profile)) {
    redirect('/portal' as Route);
  }

  const effectiveOrganizationId = getEffectiveOrganizationId(auth);

  const [supportSession, subscriptionSnapshot] = await Promise.all([
    readSupportSessionCookie(),
    getOrganizationSubscriptionSnapshot(effectiveOrganizationId)
  ]);

  await enforceSubscriptionRouteAccess(subscriptionSnapshot);

  if (!auth.memberships.length && !isPlatformOperator(auth)) {
    redirect('/start/signup' as Route);
  }

  return {
    effectiveOrganizationId,
    supportSession,
    subscriptionSnapshot,
    lockMessage: getSubscriptionLockMessage(subscriptionSnapshot)
  };
}
