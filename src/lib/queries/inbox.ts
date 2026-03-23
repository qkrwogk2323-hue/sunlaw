import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getInboxSnapshot(organizationId?: string | null) {
  const supabase = await createSupabaseServerClient();

  let requestsQuery = supabase
    .from('case_requests')
    .select('id, title, status, request_kind, created_at, case_id, cases(title)')
    .in('status', ['open', 'in_review', 'waiting_client'])
    .order('created_at', { ascending: false })
    .limit(8);

  let messagesQuery = supabase
    .from('case_messages')
    .select('id, body, is_internal, created_at, case_id, cases(title), sender_profile_id')
    .order('created_at', { ascending: false })
    .limit(8);

  let approvalsQuery = supabase
    .from('case_documents')
    .select('id, title, approval_status, updated_at, case_id, cases(title)')
    .eq('approval_status', 'pending_review')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(8);

  let notificationsQuery = supabase
    .from('notifications')
    .select('id, title, body, kind, created_at, case_id')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(8);

  if (organizationId) {
    requestsQuery = requestsQuery.eq('organization_id', organizationId);
    messagesQuery = messagesQuery.eq('organization_id', organizationId);
    approvalsQuery = approvalsQuery.eq('organization_id', organizationId);
    notificationsQuery = notificationsQuery.eq('organization_id', organizationId);
  }

  const [{ data: requests }, { data: messages }, { data: approvals }, { data: notifications }] = await Promise.all([
    requestsQuery,
    messagesQuery,
    approvalsQuery,
    notificationsQuery
  ]);

  return {
    requests: requests ?? [],
    messages: messages ?? [],
    approvals: approvals ?? [],
    notifications: notifications ?? []
  };
}
