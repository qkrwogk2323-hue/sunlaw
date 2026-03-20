import { getCurrentAuth, getPlatformOrganizationContextId, hasActivePlatformAdminView } from '@/lib/auth';
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
