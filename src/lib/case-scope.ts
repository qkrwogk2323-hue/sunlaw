import { isManagementRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthContext, Membership } from '@/lib/types';

export type CaseScopeAccess = {
  unrestrictedOrganizationIds: string[];
  restrictedOrganizationIds: string[];
  assignedCaseIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function resolveOrganizationCasePolicies(auth: AuthContext, organizationId?: string | null) {
  const memberships = auth.memberships.filter((membership: Membership) => (
    membership.status === 'active' && (!organizationId || membership.organization_id === organizationId)
  ));

  const unrestrictedOrganizationIds = unique(
    memberships
      .filter((membership) => (
        isManagementRole(membership.role)
        || (membership.case_scope_policy ?? 'assigned_cases_only') === 'all_org_cases'
      ))
      .map((membership) => membership.organization_id)
  );

  const restrictedOrganizationIds = unique(
    memberships
      .filter((membership) => !unrestrictedOrganizationIds.includes(membership.organization_id))
      .map((membership) => membership.organization_id)
  );

  return { unrestrictedOrganizationIds, restrictedOrganizationIds };
}

export async function getCaseScopeAccess(auth: AuthContext, organizationId?: string | null): Promise<CaseScopeAccess> {
  const { unrestrictedOrganizationIds, restrictedOrganizationIds } = resolveOrganizationCasePolicies(auth, organizationId);
  if (!restrictedOrganizationIds.length) {
    return { unrestrictedOrganizationIds, restrictedOrganizationIds, assignedCaseIds: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('case_handlers')
    .select('case_id, cases!inner(id, organization_id)')
    .eq('profile_id', auth.user.id)
    .in('cases.organization_id', restrictedOrganizationIds);

  const assignedCaseIds = unique((data ?? []).map((row: any) => row.case_id));
  return {
    unrestrictedOrganizationIds,
    restrictedOrganizationIds,
    assignedCaseIds
  };
}
