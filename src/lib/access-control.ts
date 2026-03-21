import type { AuthContext, Membership, PermissionKey } from './types';
import { createAccessDeniedFeedback, throwGuardFeedback } from '@/lib/guard-feedback';

type OrganizationAccessOptions = {
  permission?: PermissionKey;
  requireManager?: boolean;
  errorMessage?: string;
};

export function evaluateOrganizationAccess(
  auth: AuthContext,
  organizationId: string,
  options: OrganizationAccessOptions = {}
): Membership {
  const membership = auth.memberships.find(
    (item) => item.organization_id === organizationId && item.status === 'active'
  ) ?? null;
  const errorMessage = options.errorMessage ?? '조직 접근 권한이 없습니다.';

  if (!membership) {
    throwGuardFeedback(createAccessDeniedFeedback({
      code: 'ORG_MEMBERSHIP_REQUIRED',
      blocked: errorMessage,
      cause: '현재 요청 조직에 활성 멤버십이 확인되지 않았습니다.',
      resolution: '조직 전환 상태를 확인하고, 해당 조직 멤버로 초대 또는 승인된 뒤 다시 시도해 주세요.'
    }));
  }

  if (options.requireManager && membership.role !== 'org_owner' && membership.role !== 'org_manager') {
    throwGuardFeedback(createAccessDeniedFeedback({
      code: 'ORG_MANAGER_REQUIRED',
      blocked: errorMessage,
      cause: '관리자(오너/매니저) 권한이 필요한 작업입니다.',
      resolution: '조직 관리자 계정으로 전환하거나 관리자 권한 승인을 요청해 주세요.'
    }));
  }

  if (options.permission && !membership.permissions?.[options.permission]) {
    throwGuardFeedback(createAccessDeniedFeedback({
      code: 'ORG_PERMISSION_REQUIRED',
      blocked: errorMessage,
      cause: `현재 계정에 ${options.permission} 권한이 부여되어 있지 않습니다.`,
      resolution: '권한 설정에서 해당 권한을 부여받은 뒤 다시 시도해 주세요.'
    }));
  }

  return membership;
}

export function assertPlatformAdminAccess(hasPlatformAdminView: boolean, errorMessage = '플랫폼 관리자만 접근할 수 있습니다.') {
  if (!hasPlatformAdminView) {
    throwGuardFeedback(createAccessDeniedFeedback({
      code: 'PLATFORM_ADMIN_REQUIRED',
      blocked: errorMessage,
      cause: '현재 조직 또는 현재 계정 권한으로는 플랫폼 관리자 기능을 사용할 수 없습니다.',
      resolution: '플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요.'
    }));
  }
}
