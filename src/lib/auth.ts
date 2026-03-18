import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assertPlatformAdminAccess, evaluateOrganizationAccess } from '@/lib/access-control';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveMembershipPermissions } from '@/lib/permissions';
import type { AuthContext, Membership, PermissionKey, Profile } from '@/lib/types';
import { ACTIVE_VIEW_MODE_COOKIE, normalizeActiveViewMode } from '@/lib/view-mode';

type CoreProfile = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'platform_role' | 'default_organization_id' | 'is_active'
>;

type ClientAccountProfileFields = Pick<
  Profile,
  'is_client_account' | 'client_account_status' | 'client_account_status_changed_at' | 'client_account_status_reason' | 'client_last_approved_at' | 'legal_name' | 'legal_name_confirmed_at'
>;

const defaultClientAccountProfileFields: ClientAccountProfileFields = {
  is_client_account: false,
  client_account_status: 'pending_initial_approval',
  client_account_status_changed_at: null,
  client_account_status_reason: null,
  client_last_approved_at: null,
  legal_name: null,
  legal_name_confirmed_at: null
};

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || Boolean(error?.message?.includes('column'));
}

async function getProfileWithScopedFields(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: coreProfile, error: coreProfileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, platform_role, default_organization_id, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (coreProfileError) {
    throw coreProfileError;
  }

  if (!coreProfile || !coreProfile.is_active) {
    return null;
  }

  const { data: clientAccountFields, error: clientAccountError } = await supabase
    .from('profiles')
    .select('is_client_account, client_account_status, client_account_status_changed_at, client_account_status_reason, client_last_approved_at, legal_name, legal_name_confirmed_at')
    .eq('id', userId)
    .maybeSingle();

  if (clientAccountError && !isMissingColumnError(clientAccountError)) {
    throw clientAccountError;
  }

  return {
    ...(coreProfile as CoreProfile),
    ...defaultClientAccountProfileFields,
    ...((clientAccountError ? null : clientAccountFields) ?? {})
  };
}

export async function hasPlatformAdminSecurityClearance(auth: AuthContext) {
  return isPlatformOperator(auth);
}

export async function hasPlatformAdminScenarioAccess(auth: AuthContext) {
  if (!(await hasPlatformAdminSecurityClearance(auth))) return false;
  return false;
}

export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const profile = await getProfileWithScopedFields(user.id);

  if (!profile || !profile.is_active) {
    return null;
  }

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select(`
      id,
      organization_id,
      role,
      status,
      title,
      permissions,
      actor_category,
      permission_template_key,
      case_scope_policy,
      organization:organizations(id, name, slug, kind, enabled_modules, is_platform_root),
      permission_overrides:organization_membership_permission_overrides(permission_key, effect)
    `)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  return {
    user: {
      id: user.id,
      email: user.email ?? undefined
    },
    profile,
    memberships: ((memberships ?? []) as unknown[]).map((membership) => {
      const normalized = membership as Membership & {
        organization?: Membership['organization'] | Membership['organization'][];
      };

      return {
        ...normalized,
        organization: Array.isArray(normalized.organization)
          ? normalized.organization[0] ?? null
          : normalized.organization ?? null,
        permissions: resolveMembershipPermissions(normalized as Membership)
      };
    })
  };
});

export async function requireAuthenticatedUser() {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect('/login');
  }
  return auth;
}

export async function getActiveViewMode() {
  const cookieStore = await cookies();
  return normalizeActiveViewMode(cookieStore.get(ACTIVE_VIEW_MODE_COOKIE)?.value);
}

export async function hasActivePlatformAdminView(auth: AuthContext) {
  if (!isPlatformOperator(auth)) return false;
  return hasPlatformAdminSecurityClearance(auth);
}

export async function hasActivePlatformScenarioView(auth: AuthContext, activeViewMode?: string | null) {
  void auth;
  void activeViewMode;
  return false;
}

export async function requirePlatformAdmin() {
  const auth = await requireAuthenticatedUser();
  if (!(await hasActivePlatformAdminView(auth))) {
    redirect('/dashboard');
  }
  return auth;
}

export async function requirePlatformAdminAction(errorMessage = '플랫폼 관리자만 접근할 수 있습니다.') {
  const auth = await requireAuthenticatedUser();
  assertPlatformAdminAccess(await hasActivePlatformAdminView(auth), errorMessage);
  return auth;
}

export function getEffectiveOrganizationId(auth: AuthContext) {
  return auth.profile.default_organization_id ?? auth.memberships[0]?.organization_id ?? null;
}

export function findMembership(auth: AuthContext, organizationId: string) {
  return auth.memberships.find((membership) => membership.organization_id === organizationId) ?? null;
}

export function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

export function hasPlatformRootManagementMembership(auth: AuthContext) {
  return auth.memberships.some((membership) => (
    membership.organization?.is_platform_root === true
    && isManagementRole(membership.role)
  ));
}

export function isPlatformOperator(auth: AuthContext) {
  return auth.profile.platform_role === 'platform_admin' || hasPlatformRootManagementMembership(auth);
}

export function hasStaffMembership(auth: AuthContext, organizationId: string) {
  return auth.memberships.some((membership) => membership.organization_id === organizationId);
}

type OrganizationActionAccessOptions = {
  permission?: PermissionKey;
  requireManager?: boolean;
  errorMessage?: string;
};

export async function requireOrganizationActionAccess(
  organizationId: string,
  options: OrganizationActionAccessOptions = {}
) {
  const auth = await requireAuthenticatedUser();
  const membership = evaluateOrganizationAccess(auth, organizationId, options);
  return { auth, membership };
}
