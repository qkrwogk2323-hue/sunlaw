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

export async function listOrganizationTableHistory(organizationId: string, tableName: string, limit = 80) {
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

