import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import type { AuthContext } from '@/lib/types';
import { getCaseScopeAccess } from '@/lib/case-scope';

type CaseBucket = 'active' | 'completed' | 'deleted' | 'all';

const COMPLETED_CASE_STATUSES = ['closed', 'archived'];

async function buildCaseListContext(auth: AuthContext, organizationId?: string | null) {
  const scope = await getCaseScopeAccess(auth, organizationId);
  const supabase = await createSupabaseServerClient();
  return { auth, scope, supabase };
}

async function getCaseListContext(organizationId?: string | null) {
  const auth = await requireAuthenticatedUser();
  return buildCaseListContext(auth, organizationId);
}

function applyCaseBucketFilters(query: any, bucket: CaseBucket) {
  if (bucket === 'deleted') {
    query = query.eq('lifecycle_status', 'soft_deleted');
  } else {
    query = query.neq('lifecycle_status', 'soft_deleted').neq('lifecycle_status', 'archived');
  }

  if (bucket === 'completed') {
    query = query.in('case_status', COMPLETED_CASE_STATUSES);
  }

  if (bucket === 'active') {
    query = query.not('case_status', 'in', `(${COMPLETED_CASE_STATUSES.join(',')})`);
  }

  return query;
}

export async function purgeDeletedCasesPastRetention(organizationId?: string | null, retentionDays = 30) {
  const { scope, supabase } = await getCaseListContext(organizationId);
  const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const archivedAt = new Date().toISOString();

  let query = supabase
    .from('cases')
    .update({
      lifecycle_status: 'archived',
      case_status: 'archived',
      deleted_at: archivedAt,
      updated_at: archivedAt
    })
    .eq('lifecycle_status', 'soft_deleted')
    .lt('updated_at', cutoffIso);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (scope.restrictedOrganizationIds.length) {
    if (!scope.assignedCaseIds.length) return;
    query = query.in('id', scope.assignedCaseIds);
  }

  await query;
}

export async function listCases(
  organizationId?: string | null,
  options?: { bucket?: CaseBucket }
) {
  const { scope, supabase } = await getCaseListContext(organizationId);
  const bucket = options?.bucket ?? 'all';
  let query = applyCaseBucketFilters(supabase
    .from('cases')
    .select('id, organization_id, reference_no, title, case_type, case_status, stage_key, stage_template_key, principal_amount, opened_on, updated_at, court_name, case_number, lifecycle_status, module_flags')
    .order('updated_at', { ascending: false }), bucket);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  if (scope.restrictedOrganizationIds.length) {
    if (!scope.assignedCaseIds.length) return [];
    query = query.in('id', scope.assignedCaseIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listCases] orgId:', organizationId, 'bucket:', bucket, 'error:', error.message, 'restricted:', scope.restrictedOrganizationIds.length);
  }
  return data ?? [];
}

export async function countCasesByBucket(
  organizationId?: string | null,
  bucket: Exclude<CaseBucket, 'all'> = 'active'
) {
  const { scope, supabase } = await getCaseListContext(organizationId);

  let query = applyCaseBucketFilters(supabase
    .from('cases')
    .select('id', { count: 'exact', head: true }), bucket);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  if (scope.restrictedOrganizationIds.length) {
    if (!scope.assignedCaseIds.length) return 0;
    query = query.in('id', scope.assignedCaseIds);
  }

  const { count } = await query;
  return count ?? 0;
}

async function loadCasesPageBuckets(
  context: Awaited<ReturnType<typeof buildCaseListContext>>,
  organizationId?: string | null,
  selectedBucket: Exclude<CaseBucket, 'all'> = 'active'
) {
  const { scope, supabase } = context;

  const buildListQuery = (bucket: CaseBucket) => {
    let query = applyCaseBucketFilters(supabase
      .from('cases')
      .select('id, organization_id, reference_no, title, case_type, case_status, stage_key, stage_template_key, principal_amount, opened_on, updated_at, court_name, case_number, lifecycle_status, module_flags')
      .order('updated_at', { ascending: false }), bucket);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (scope.restrictedOrganizationIds.length) {
      if (!scope.assignedCaseIds.length) return Promise.resolve({ data: [] as any[], error: null });
      query = query.in('id', scope.assignedCaseIds);
    }
    return query;
  };

  const buildCountQuery = (bucket: Exclude<CaseBucket, 'all'>) => {
    let query = applyCaseBucketFilters(supabase
      .from('cases')
      .select('id', { count: 'exact', head: true }), bucket);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (scope.restrictedOrganizationIds.length) {
      if (!scope.assignedCaseIds.length) return Promise.resolve({ count: 0, error: null });
      query = query.in('id', scope.assignedCaseIds);
    }
    return query;
  };

  const [
    { data: selectedCases, error: selectedError },
    { count: activeCount },
    { count: completedCount },
    { count: deletedCount },
  ] = await Promise.all([
    buildListQuery(selectedBucket),
    buildCountQuery('active'),
    buildCountQuery('completed'),
    buildCountQuery('deleted'),
  ]);

  if (selectedError) {
    console.error('[getCasesPageBuckets] orgId:', organizationId, 'bucket:', selectedBucket, 'error:', selectedError.message, 'restricted:', scope.restrictedOrganizationIds.length);
  }

  return {
    selectedCases: selectedCases ?? [],
    counts: {
      active: activeCount ?? 0,
      completed: completedCount ?? 0,
      deleted: deletedCount ?? 0,
    }
  };
}

export async function getCasesPageBuckets(
  organizationId?: string | null,
  selectedBucket: Exclude<CaseBucket, 'all'> = 'active'
) {
  return loadCasesPageBuckets(await getCaseListContext(organizationId), organizationId, selectedBucket);
}

export async function getCasesPageBucketsForAuth(
  auth: AuthContext,
  organizationId?: string | null,
  selectedBucket: Exclude<CaseBucket, 'all'> = 'active'
) {
  return loadCasesPageBuckets(await buildCaseListContext(auth, organizationId), organizationId, selectedBucket);
}

export async function getCaseClientLinkedMap(caseIds: string[]) {
  if (!caseIds.length) return {} as Record<string, boolean>;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('case_clients').select('case_id').in('case_id', caseIds);
  const linkedIds = new Set((data ?? []).map((row: any) => `${row.case_id ?? ''}`));
  return caseIds.reduce<Record<string, boolean>>((acc, caseId) => {
    acc[caseId] = linkedIds.has(caseId);
    return acc;
  }, {});
}

export async function getCasePartiesForList(caseIds: string[]) {
  if (!caseIds.length) return {} as Record<string, { plaintiffs: string[]; defendants: string[] }>;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('case_parties')
    .select('case_id, party_role, display_name')
    .in('case_id', caseIds)
    .in('party_role', ['plaintiff', 'defendant', 'creditor', 'debtor']);
  const result: Record<string, { plaintiffs: string[]; defendants: string[] }> = {};
  for (const row of data ?? []) {
    const id = `${row.case_id}`;
    if (!result[id]) result[id] = { plaintiffs: [], defendants: [] };
    const name = `${row.display_name ?? ''}`.trim();
    if (!name) continue;
    if (row.party_role === 'plaintiff' || row.party_role === 'creditor') {
      result[id].plaintiffs.push(name);
    } else {
      result[id].defendants.push(name);
    }
  }
  return result;
}

export async function getCasePickerOptions(organizationId?: string | null) {
  const { scope, supabase } = await getCaseListContext(organizationId);

  let query = supabase
    .from('cases')
    .select('id, title, reference_no')
    .neq('lifecycle_status', 'soft_deleted')
    .neq('lifecycle_status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(80);

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
  const base = await getCaseBaseDetail(caseId);
  if (!base) return null;
  const sections = await getCaseDetailSections(caseId, 'overview', Boolean(base.module_flags?.collection || base.case_type === 'debt_collection'));
  return { ...base, ...sections };
}

export async function getCaseBaseDetail(caseId: string) {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const { data: caseRecord } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
  if (!caseRecord) return null;
  if (caseRecord.lifecycle_status === 'archived') return null;
  const scope = await getCaseScopeAccess(auth, caseRecord.organization_id);
  if (scope.restrictedOrganizationIds.length && !scope.assignedCaseIds.includes(caseId)) {
    return null;
  }
  return caseRecord;
}

export async function getCaseDetailSections(
  caseId: string,
  tab: string,
  collectionFocused = false
) {
  const supabase = await createSupabaseServerClient();

  const needsParticipants = tab === 'participants';
  const needsCommunication = tab === 'communication' || tab === 'timeline';
  const needsDocuments = tab === 'documents' || tab === 'timeline' || tab === 'collection';
  const needsSchedules = tab === 'schedule' || tab === 'overview';
  const needsRequests = tab === 'timeline' || tab === 'collection';
  const needsBilling = tab === 'billing' || (tab === 'overview' && collectionFocused);
  const needsCollection = tab === 'collection' || (tab === 'overview' && collectionFocused);

  const [
    { data: clients },
    { data: parties },
    { data: caseOrganizations },
    { data: documents },
    { data: documentReviews },
    { data: schedules },
    { data: recoveryActivities },
    { data: messages },
    { data: requests },
    { data: billingEntries },
    { data: feeAgreements },
    { data: invoices },
    { data: payments },
    { data: orgSettlements }
  ] = await Promise.all([
    supabase
      .from('case_clients')
      .select('id, client_name, client_email_snapshot, relation_label, is_portal_enabled, profile_id, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    needsParticipants
      ? supabase
          .from('case_parties')
          .select('id, party_role, entity_type, display_name, company_name, registration_number_masked, resident_number_last4, phone, email, address_summary, notes, is_primary, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    needsParticipants
      ? supabase
          .from('case_organizations')
          .select('id, role, status, access_scope, billing_scope, communication_scope, is_lead, can_submit_legal_requests, can_receive_legal_requests, can_manage_collection, can_view_client_messages, agreement_summary, organization:organizations(id, name, slug, kind)')
          .eq('case_id', caseId)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    needsDocuments
      ? supabase
          .from('case_documents')
          .select('id, title, document_kind, approval_status, client_visibility, summary, storage_path, mime_type, file_size, row_version, created_by_name, approval_requested_by_name, reviewed_by_name, reviewed_at, review_note, created_at, updated_at')
          .eq('case_id', caseId)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(tab === 'collection' ? 12 : 40)
      : Promise.resolve({ data: [] as any[] }),
    tab === 'documents'
      ? supabase
          .from('case_document_reviews')
          .select('id, case_document_id, request_status, requested_by_name, decided_by_name, comment, snapshot_version, created_at, decided_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    needsSchedules
      ? supabase
          .from('case_schedules')
          .select('id, title, schedule_kind, scheduled_start, scheduled_end, location, is_important, client_visibility, notes, created_by_name, completed_at')
          .eq('case_id', caseId)
          .order('scheduled_start', { ascending: true })
          .limit(tab === 'overview' ? 8 : 40)
      : Promise.resolve({ data: [] as any[] }),
    needsCollection
      ? supabase
          .from('case_recovery_activities')
          .select('id, activity_kind, occurred_at, amount, outcome_status, client_visibility, notes, created_by_name')
          .eq('case_id', caseId)
          .order('occurred_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] }),
    needsCommunication
      ? supabase
          .from('case_messages')
          .select('id, body, is_internal, created_at, sender_role, sender:profiles(full_name, email)')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    needsRequests
      ? supabase
          .from('case_requests')
          .select('id, request_kind, title, body, status, due_at, created_at, client_visible, creator:profiles(full_name, email), assigned:profiles!case_requests_assigned_to_fkey(full_name, email)')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    needsBilling
      ? supabase
          .from('billing_entries')
          .select('id, entry_kind, title, amount, tax_amount, status, due_on, paid_at, notes, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, created_at')
          .eq('case_id', caseId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    needsBilling
      ? supabase
          .from('fee_agreements')
          .select('id, agreement_type, title, description, fixed_amount, rate, bill_to_party_kind, bill_to_case_client_id, bill_to_case_organization_id, effective_from, effective_to, is_active, created_at')
          .eq('case_id', caseId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
    needsBilling
      ? supabase
          .from('invoices')
          .select('id, invoice_no, title, status, total_amount, due_on, issued_at, paid_at, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
    needsBilling
      ? supabase
          .from('payments')
          .select('id, amount, payment_status, payment_method, received_at, reference_text, created_at')
          .eq('case_id', caseId)
          .order('received_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as any[] }),
    needsBilling
      ? supabase
          .from('org_settlement_entries')
          .select('id, title, amount, status, due_on, paid_at, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] })
  ]);

  return {
    handlers: [],
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
