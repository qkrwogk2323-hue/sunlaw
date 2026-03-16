import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listClients(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_clients')
    .select('id, organization_id, case_id, client_name, client_email_snapshot, relation_label, is_portal_enabled, created_at, cases(title)')
    .order('created_at', { ascending: false });

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data } = await query;
  return data ?? [];
}
