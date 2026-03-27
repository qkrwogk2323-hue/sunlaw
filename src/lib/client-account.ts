import type { Route } from 'next';
import type { AuthContext, Profile } from '@/lib/types';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
import { getDefaultAppRoute } from '@/lib/auth';
import { ROUTES } from '@/lib/routes/registry';

export const CLIENT_ACCOUNT_STATUSES = [
  'active',
  'pending_initial_approval',
  'pending_reapproval'
] as const;

export type ClientAccountStatus = (typeof CLIENT_ACCOUNT_STATUSES)[number];

export function isClientAccount(profile: Pick<Profile, 'is_client_account'>) {
  return profile.is_client_account;
}

export function isClientAccountPending(profile: Pick<Profile, 'is_client_account' | 'client_account_status'>) {
  return profile.is_client_account && profile.client_account_status !== 'active';
}

export function isClientAccountActive(profile: Pick<Profile, 'is_client_account' | 'client_account_status'>) {
  return profile.is_client_account && profile.client_account_status === 'active';
}

export function clientAccountStatusLabel(status: ClientAccountStatus) {
  if (status === 'pending_initial_approval') return '최초 승인 대기';
  if (status === 'pending_reapproval') return '연결 해제 후 재대기';
  return '활성';
}

export function clientAccountStatusDescription(status: ClientAccountStatus) {
  if (status === 'pending_initial_approval') {
    return '본인정보 등록은 끝났습니다. 이제 조직에서 받은 초대번호를 입력하거나 조직가입신청을 남기고 승인 결과를 기다리면 됩니다.';
  }

  if (status === 'pending_reapproval') {
    return '이전 조직 연결이 해제되어 업무 화면 접근이 잠시 멈춘 상태입니다. 새 초대번호 입력, 조직가입신청, 또는 고객센터 문의가 필요합니다.';
  }

  return '로그인 후 포털과 연결 상태 화면으로 바로 진입할 수 있습니다.';
}

export function hasCompletedLegalName(profile: Pick<Profile, 'full_name' | 'legal_name' | 'legal_name_confirmed_at'>) {
  return Boolean(
    (profile.legal_name?.trim() && profile.legal_name_confirmed_at)
      || profile.full_name?.trim()
  );
}

export function getAuthenticatedHomePath(auth: AuthContext, options?: { activePortalLinkCount?: number }): Route {
  if (auth.profile.must_change_password) {
    return ROUTES.START_PASSWORD_RESET;
  }

  if (auth.profile.must_complete_profile) {
    return ROUTES.START_MEMBER_PROFILE;
  }

  if (!hasCompletedLegalName(auth.profile)) {
    return ROUTES.START_PROFILE_NAME;
  }

  if (isClientAccountPending(auth.profile)) {
    return ROUTES.START_PENDING;
  }

  if (isClientAccountActive(auth.profile)) {
    const linkCount = options?.activePortalLinkCount;
    if (linkCount !== undefined && linkCount === 0) {
      return ROUTES.START_PENDING;
    }
    return ROUTES.PORTAL;
  }

  const isPlatformOperator = auth.memberships.some(
    (membership) => isPlatformManagementOrganization(membership.organization)
      && (membership.role === 'org_owner' || membership.role === 'org_manager')
  );

  if (!auth.memberships.length && !isPlatformOperator) {
    return ROUTES.START_SIGNUP;
  }

  return getDefaultAppRoute(auth) as Route;
}
