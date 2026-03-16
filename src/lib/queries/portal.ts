import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth';

export async function countActivePortalLinks(): Promise<number> {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('case_clients')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', auth.user.id)
    .eq('is_portal_enabled', true);
  return count ?? 0;
}

export async function getPortalCases() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('case_clients')
    .select('id, case_id, client_name, relation_label, cases(id, title, reference_no, case_status, stage_key, case_type, updated_at)')
    .eq('is_portal_enabled', true)
    .eq('profile_id', auth.user.id)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getPortalCaseDetail(caseId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: clientRow } = await supabase
    .from('case_clients')
    .select('id')
    .eq('case_id', caseId)
    .eq('profile_id', auth.user.id)
    .eq('is_portal_enabled', true)
    .maybeSingle();
  if (!clientRow) return null;

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, reference_no, case_status, stage_key, summary, court_name, case_number, updated_at')
    .eq('id', caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const [{ data: documents }, { data: schedules }, { data: messages }, { data: requests }, { data: billingEntries }] = await Promise.all([
    supabase.from('case_documents').select('id, title, document_kind, approval_status, updated_at').eq('case_id', caseId).eq('client_visibility', 'client_visible').order('updated_at', { ascending: false }),
    supabase.from('case_schedules').select('id, title, schedule_kind, scheduled_start, location').eq('case_id', caseId).eq('client_visibility', 'client_visible').order('scheduled_start', { ascending: true }),
    supabase.from('case_messages').select('id, body, created_at, sender_role, sender:profiles(full_name)').eq('case_id', caseId).eq('is_internal', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('case_requests').select('id, request_kind, title, body, status, due_at, created_at').eq('case_id', caseId).eq('client_visible', true).order('created_at', { ascending: false }).limit(20),
    supabase.from('billing_entries').select('id, entry_kind, title, amount, status, due_on, paid_at, bill_to_case_client_id').eq('case_id', caseId).eq('bill_to_case_client_id', clientRow.id).order('created_at', { ascending: false })
  ]);

  return {
    ...caseRow,
    documents: documents ?? [],
    schedules: schedules ?? [],
    messages: messages ?? [],
    requests: requests ?? [],
    billingEntries: billingEntries ?? []
  };
}
