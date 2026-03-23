import { type AuthContext, type Membership } from '@/lib/types';
import { isManagementRole, isPlatformOperator } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type ChangeLogRow = {
  id: number;
  table_name: string;
  operation: string;
  record_id: string | null;
  organization_id: string | null;
  case_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  changed_fields: string[] | null;
  logged_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
};

/**
 * Reads raw DB change log for an organization.
 * Requires caller to pass their AuthContext. Access is restricted to org managers
 * and platform admins — rejects silently with empty array for unauthorized callers.
 * This guard is at the data layer to prevent bypass through any future caller.
 */
export async function listOrganizationTableHistory(
  organizationId: string,
  tableName: string,
  limit = 80,
  auth?: AuthContext
) {
  // Enforce access control at the data layer, not just the caller layer.
  if (auth) {
    const membership = auth.memberships?.find((m: Membership) => m.organization_id === organizationId);
    const authorized = isPlatformOperator(auth) || isManagementRole(membership?.role);
    if (!authorized) {
      console.warn('[listOrganizationTableHistory] unauthorized access attempt', {
        userId: auth.user?.id,
        organizationId,
        tableName
      });
      return [];
    }
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .schema('audit')
    .from('change_log')
    .select('id, table_name, operation, record_id, organization_id, case_id, actor_user_id, actor_email, changed_fields, logged_at, old_values, new_values')
    .eq('organization_id', organizationId)
    .eq('table_name', tableName)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[listOrganizationTableHistory] query failed', {
      organizationId,
      tableName,
      message: error.message
    });
    return [];
  }

  return (data ?? []) as ChangeLogRow[];
}

export async function listOrganizationCaseTitles(caseIds: string[]) {
  const uniqueIds = [...new Set(caseIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, string>();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('cases')
    .select('id, title')
    .in('id', uniqueIds);

  if (error) {
    console.error('[listOrganizationCaseTitles] query failed', {
      caseIds: uniqueIds,
      message: error.message
    });
    return new Map<string, string>();
  }

  return new Map((data ?? []).map((item: any) => [item.id, item.title ?? '사건']));
}

