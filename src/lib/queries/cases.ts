import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getCaseScopeAccess } from '@/lib/case-scope';

export async function listCases(organizationId?: string | null) {
  const auth = await requireAuthenticatedUser();
  const scope = await getCaseScopeAccess(auth, organizationId);
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('cases')
    .select('id, organization_id, reference_no, title, case_type, case_status, stage_key, stage_template_key, principal_amount, opened_on, updated_at, court_name, case_number, lifecycle_status, module_flags')
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  if (scope.restrictedOrganizationIds.length) {
    if (!scope.assignedCaseIds.length) return [];
    query = query.in('id', scope.assignedCaseIds);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getCaseDetail(caseId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: caseRecord } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
  if (!caseRecord) return null;
  const scope = await getCaseScopeAccess(auth, caseRecord.organization_id);
  if (scope.restrictedOrganizationIds.length && !scope.assignedCaseIds.includes(caseId)) {
    return null;
  }

  const [
    { data: handlers },
    { data: clients },
    { data: parties },
    { data: documents },
    { data: documentReviews },
    { data: schedules },
    { data: recoveryActivities },
    { data: messages },
    { data: requests },
    { data: billingEntries },
    { data: caseOrganizations },
    { data: feeAgreements },
    { data: invoices },
    { data: payments },
    { data: orgSettlements }
  ] = await Promise.all([
    supabase
      .from('case_handlers')
      .select('id, role, handler_name, created_at, profile_id')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase
      .from('case_clients')
      .select('id, client_name, client_email_snapshot, relation_label, is_portal_enabled, profile_id, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase
      .from('case_parties')
      .select('id, party_role, entity_type, display_name, company_name, registration_number_masked, resident_number_last4, phone, email, address_summary, notes, is_primary, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase
      .from('case_documents')
      .select('id, title, document_kind, approval_status, client_visibility, summary, storage_path, mime_type, file_size, row_version, created_by_name, approval_requested_by_name, reviewed_by_name, reviewed_at, review_note, created_at, updated_at')
      .eq('case_id', caseId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('case_document_reviews')
      .select('id, case_document_id, request_status, requested_by_name, decided_by_name, comment, snapshot_version, created_at, decided_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('case_schedules')
      .select('id, title, schedule_kind, scheduled_start, scheduled_end, location, is_important, client_visibility, notes, created_by_name, completed_at')
      .eq('case_id', caseId)
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('case_recovery_activities')
      .select('id, activity_kind, occurred_at, amount, outcome_status, client_visibility, notes, created_by_name')
      .eq('case_id', caseId)
      .order('occurred_at', { ascending: false }),
    supabase
      .from('case_messages')
      .select('id, body, is_internal, created_at, sender_role, sender:profiles(full_name, email)')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('case_requests')
      .select('id, request_kind, title, body, status, due_at, created_at, client_visible, creator:profiles(full_name, email), assigned:profiles!case_requests_assigned_to_fkey(full_name, email)')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('billing_entries')
      .select('id, entry_kind, title, amount, tax_amount, status, due_on, paid_at, notes, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('case_organizations')
      .select('id, role, status, access_scope, billing_scope, communication_scope, is_lead, can_submit_legal_requests, can_receive_legal_requests, can_manage_collection, can_view_client_messages, agreement_summary, organization:organizations(id, name, slug, kind)')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase
      .from('fee_agreements')
      .select('id, agreement_type, title, description, fixed_amount, rate, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, effective_from, effective_to, is_active, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_no, title, status, total_amount, due_on, issued_at, paid_at, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, amount, payment_status, payment_method, received_at, reference_text, created_at')
      .eq('case_id', caseId)
      .order('received_at', { ascending: false }),
    supabase
      .from('org_settlement_entries')
      .select('id, title, amount, status, due_on, paid_at, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
  ]);

  return {
    ...caseRecord,
    handlers: handlers ?? [],
    clients: clients ?? [],
    parties: parties ?? [],
    documents: documents ?? [],
    documentReviews: documentReviews ?? [],
    schedules: schedules ?? [],
    recoveryActivities: recoveryActivities ?? [],
    messages: messages ?? [],
    requests: requests ?? [],
    billingEntries: billingEntries ?? [],
    caseOrganizations: caseOrganizations ?? [],
    feeAgreements: feeAgreements ?? [],
    invoices: invoices ?? [],
    payments: payments ?? [],
    orgSettlements: orgSettlements ?? []
  };
}
