import { getCurrentAuth, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listAuditChangeLog({
  limit = 100,
  actorUserId,
  tableName,
  actionPrefix,
  actionIn
}: {
  limit?: number;
  actorUserId?: string | null;
  tableName?: string | null;
  actionPrefix?: string | null;
  actionIn?: string[] | null;
} = {}) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const canView = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!canView) return [];

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .schema('audit')
    .from('change_log')
    .select('id, table_name, action, organization_id, case_id, actor_user_id, logged_at')
    .order('logged_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 300));

  if (actorUserId) {
    query = query.eq('actor_user_id', actorUserId);
  }

  if (tableName) {
    query = query.eq('table_name', tableName);
  }

  if (actionPrefix) {
    query = query.ilike('action', `${actionPrefix}%`);
  }

  if (actionIn?.length) {
    query = query.in('action', actionIn);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listAuditChangeLog] query error:', error.message);
    return [];
  }
  return data ?? [];
}

// 조직 구성원이 자신의 조직 audit_logs를 조회한다.
export async function listOrganizationActivityLog({
  organizationId,
  limit = 80
}: {
  organizationId?: string | null;
  limit?: number;
}) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const effectiveOrgId = organizationId ?? getEffectiveOrganizationId(auth);
  if (!effectiveOrgId) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, resource_type, resource_id, organization_id, created_at, actor_id, actor:profiles!audit_logs_actor_id_fkey(full_name), meta')
    .eq('organization_id', effectiveOrgId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) {
    console.error('[listOrganizationActivityLog] query error:', error.message);
    return [];
  }
  return data ?? [];
}
