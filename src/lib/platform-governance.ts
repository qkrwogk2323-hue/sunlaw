import type { Membership } from '@/lib/types';

type OrganizationLike = Pick<NonNullable<Membership['organization']>, 'kind' | 'is_platform_root'>;

export function isPlatformManagementOrganization(
  organization: OrganizationLike | null | undefined
) {
  return Boolean(
    organization?.kind === 'platform_management'
      && organization?.is_platform_root === true
  );
}
