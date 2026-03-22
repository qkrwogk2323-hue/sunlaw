import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function listDocuments(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('case_documents')
    .select('id, title, document_kind, approval_status, client_visibility, updated_at, file_size, case_id, organization_id, storage_path, cases(title)')
    .order('updated_at', { ascending: false });
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data } = await query;
  return data ?? [];
}

export async function listDocumentHistory(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let auditQuery = supabase
    .from('audit_logs')
    .select('id, action, resource_id, created_at, actor_id, actor:profiles!audit_logs_actor_id_fkey(full_name), meta')
    .eq('resource_type', 'case_document')
    .order('created_at', { ascending: false })
    .limit(50);
  if (organizationId) auditQuery = auditQuery.eq('organization_id', organizationId);

  let reviewQuery = supabase
    .from('case_document_reviews')
    .select('id, case_document_id, request_status, requested_by_name, decided_by_name, comment, decided_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (organizationId) reviewQuery = reviewQuery.eq('organization_id', organizationId);

  const [{ data: auditLogs }, { data: reviewLogs }] = await Promise.all([auditQuery, reviewQuery]);
  return {
    auditLogs: auditLogs ?? [],
    reviewLogs: reviewLogs ?? []
  };
}
