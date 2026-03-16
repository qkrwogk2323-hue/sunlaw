import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listDocuments(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_documents')
    .select('id, title, document_kind, approval_status, client_visibility, updated_at, case_id, cases(title)')
    .order('updated_at', { ascending: false });
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data } = await query;
  return data ?? [];
}
