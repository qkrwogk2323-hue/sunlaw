import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listMyClientServiceRequests(limit = 10) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('client_service_requests')
    .select('id, organization_id, request_kind, account_status_snapshot, title, body, status, resolved_note, resolved_at, created_at, organization:organizations(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit);

  return data ?? [];
}