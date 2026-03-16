import type { AuthContext, Membership, PermissionKey } from './types';

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
  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const errorMessage = options.errorMessage ?? '조직 접근 권한이 없습니다.';

  if (!membership) {
    throw new Error(errorMessage);
  }

  if (options.requireManager && membership.role !== 'org_owner' && membership.role !== 'org_manager') {
    throw new Error(errorMessage);
  }

  if (options.permission && !membership.permissions?.[options.permission]) {
    throw new Error(errorMessage);
  }

  return membership;
}

export function assertPlatformAdminAccess(hasPlatformAdminView: boolean, errorMessage = '플랫폼 관리자만 접근할 수 있습니다.') {
  if (!hasPlatformAdminView) {
    throw new Error(errorMessage);
  }
}