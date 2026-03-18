import { getCurrentAuth, hasActivePlatformAdminView } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listAuditChangeLog({
  limit = 100,
  actorUserId,
  tableName
}: {
  limit?: number;
  actorUserId?: string | null;
  tableName?: string | null;
} = {}) {
  const auth = await getCurrentAuth();
  if (!auth) return [];

  const canView = await hasActivePlatformAdminView(auth);
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

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
