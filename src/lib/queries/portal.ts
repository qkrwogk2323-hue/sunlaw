import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getCaseStageLabel, getNextCaseStageLabel } from '@/lib/case-stage';

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
  const links = data ?? [];
  const caseIds = Array.from(new Set(links.map((item: any) => item.case_id).filter(Boolean)));
  if (!caseIds.length) return links;

  const [handlersResult, requestsResult, schedulesResult, messagesResult] = await Promise.all([
    supabase
      .from('case_handlers')
      .select('case_id, role, handler_name, created_at')
      .in('case_id', caseIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('case_requests')
      .select('case_id, title, status, due_at, created_at')
      .in('case_id', caseIds)
      .eq('client_visible', true)
      .in('status', ['open', 'in_review', 'waiting_client'])
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('case_schedules')
      .select('case_id, title, scheduled_start')
      .in('case_id', caseIds)
      .gte('scheduled_start', new Date().toISOString())
      .order('scheduled_start', { ascending: true }),
    supabase
      .from('case_messages')
      .select('case_id, body, created_at, is_internal')
      .in('case_id', caseIds)
      .eq('is_internal', false)
      .order('created_at', { ascending: false })
  ]);

  const handlers = handlersResult.data ?? [];
  const openRequests = requestsResult.data ?? [];
  const upcomingSchedules = schedulesResult.data ?? [];
  const messages = messagesResult.data ?? [];

  const primaryHandlerByCase = new Map<string, any>();
  for (const row of handlers) {
    if (!row.case_id || primaryHandlerByCase.has(row.case_id)) continue;
    primaryHandlerByCase.set(row.case_id, row);
  }

  const requestByCase = new Map<string, any>();
  for (const row of openRequests) {
    if (!row.case_id || requestByCase.has(row.case_id)) continue;
    requestByCase.set(row.case_id, row);
  }

  const scheduleByCase = new Map<string, any>();
  for (const row of upcomingSchedules) {
    if (!row.case_id || scheduleByCase.has(row.case_id)) continue;
    scheduleByCase.set(row.case_id, row);
  }

  const messageByCase = new Map<string, any>();
  for (const row of messages) {
    if (!row.case_id || messageByCase.has(row.case_id)) continue;
    messageByCase.set(row.case_id, row);
  }

  return links.map((item: any) => {
    const caseId = item.case_id;
    const caseData = item.cases ?? {};
    const handler = caseId ? primaryHandlerByCase.get(caseId) : null;
    const request = caseId ? requestByCase.get(caseId) : null;
    const schedule = caseId ? scheduleByCase.get(caseId) : null;
    const lastMessage = caseId ? messageByCase.get(caseId) : null;
    const stageKey = caseData?.stage_key ?? null;

    let nextAction = '다음 진행 확인';
    if (request?.status === 'waiting_client') nextAction = '의뢰인 답변 필요';
    else if (request?.title) nextAction = `요청 확인: ${request.title}`;
    else if (schedule?.title) nextAction = `예정 일정: ${schedule.title}`;

    return {
      ...item,
      stageLabel: getCaseStageLabel(stageKey),
      nextStageLabel: getNextCaseStageLabel(stageKey),
      managerName: handler?.handler_name ?? '담당자 배정 중',
      managerRole: handler?.role ?? '배정 대기',
      lastProgressText: lastMessage?.body ?? '',
      nextAction
    };
  });
}

export async function getPortalActionQueue() {
  const auth = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();

  const { data: caseLinks } = await supabase
    .from('case_clients')
    .select('id, case_id, cases(title, stage_key, updated_at)')
    .eq('is_portal_enabled', true)
    .eq('profile_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(120);

  const links = caseLinks ?? [];
  const caseIds = Array.from(new Set(links.map((item: any) => item.case_id).filter(Boolean)));
  const caseClientIds = links.map((item: any) => item.id).filter(Boolean);

  if (!caseIds.length) return [];

  const caseTitleById = new Map<string, string>();
  for (const item of links) {
    if (!item.case_id || caseTitleById.has(item.case_id)) continue;
    const caseRelation = item.cases as any;
    const caseTitle = Array.isArray(caseRelation) ? caseRelation[0]?.title : caseRelation?.title;
    caseTitleById.set(item.case_id, caseTitle ?? '사건');
  }

  const [{ data: openRequests }, { data: openBilling }] = await Promise.all([
    supabase
      .from('case_requests')
      .select('id, case_id, title, status, due_at, request_kind, created_at')
      .in('case_id', caseIds)
      .eq('client_visible', true)
      .in('status', ['open', 'in_review', 'waiting_client'])
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(40),
    caseClientIds.length
      ? supabase
          .from('billing_entries')
          .select('id, case_id, title, status, due_on, created_at, bill_to_case_client_id')
          .in('case_id', caseIds)
          .in('bill_to_case_client_id', caseClientIds)
          .in('status', ['issued', 'partial'])
          .order('due_on', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const requestItems = (openRequests ?? []).map((item: any) => ({
    id: `request:${item.id}`,
    kind: 'request' as const,
    caseId: item.case_id,
    caseTitle: caseTitleById.get(item.case_id) ?? '사건',
    title: item.title ?? '요청 확인',
    dueAt: item.due_at ?? null,
    status: item.status
  }));

  const billingItems = (openBilling ?? []).map((item: any) => ({
    id: `billing:${item.id}`,
    kind: 'billing' as const,
    caseId: item.case_id,
    caseTitle: caseTitleById.get(item.case_id) ?? '사건',
    title: item.title ?? '청구 확인',
    dueAt: item.due_on ? `${item.due_on}T00:00:00+09:00` : null,
    status: item.status
  }));

  return [...requestItems, ...billingItems]
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 12);
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
    .select('id, title, reference_no, case_status, stage_key, summary, court_name, case_number, updated_at, case_type, insolvency_subtype')
    .eq('id', caseId)
    .maybeSingle();
  if (!caseRow) return null;

  const [
    { data: documents },
    { data: schedules },
    { data: messages },
    { data: requests },
    { data: billingEntries },
    { data: handlers },
    { data: contractAgreements },
    { data: insolvencyCreditors },
    { data: latestRepaymentPlan },
    { data: latestCorrectionJob }
  ] = await Promise.all([
    supabase.from('case_documents').select('id, title, document_kind, approval_status, updated_at').eq('case_id', caseId).eq('client_visibility', 'client_visible').order('updated_at', { ascending: false }),
    supabase.from('case_schedules').select('id, title, schedule_kind, scheduled_start, location').eq('case_id', caseId).eq('client_visibility', 'client_visible').order('scheduled_start', { ascending: true }),
    supabase.from('case_messages').select('id, body, created_at, sender_role, sender:profiles(full_name)').eq('case_id', caseId).eq('is_internal', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('case_requests').select('id, request_kind, title, body, status, due_at, created_at').eq('case_id', caseId).eq('client_visible', true).order('created_at', { ascending: false }).limit(20),
    supabase.from('billing_entries').select('id, entry_kind, title, amount, status, due_on, paid_at, bill_to_case_client_id').eq('case_id', caseId).eq('bill_to_case_client_id', clientRow.id).order('created_at', { ascending: false }),
    supabase.from('case_handlers').select('id, role, handler_name, created_at').eq('case_id', caseId).order('created_at', { ascending: true }),
    supabase
      .from('fee_agreements')
      .select('id, title, agreement_type, effective_from, effective_to, terms_json')
      .eq('case_id', caseId)
      .eq('bill_to_case_client_id', clientRow.id)
      .order('created_at', { ascending: false }),
    caseRow.case_type === 'insolvency'
      ? supabase
          .from('insolvency_creditors')
          .select('id, creditor_name, claim_class, total_claim_amount, is_confirmed')
          .eq('case_id', caseId)
          .neq('lifecycle_status', 'soft_deleted')
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    caseRow.case_type === 'insolvency'
      ? supabase
          .from('insolvency_repayment_plans')
          .select('id, version_number, status, repayment_months, general_repayment_rate_pct, total_repayment_amount, plan_start_date, plan_end_date, created_at')
          .eq('case_id', caseId)
          .order('version_number', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as any }),
    caseRow.case_type === 'insolvency'
      ? supabase
          .from('document_ingestion_jobs')
          .select('id, extracted_json, processing_completed_at')
          .eq('case_id', caseId)
          .in('document_type', ['correction_recommendation', 'correction_order'])
          .eq('status', 'completed')
          .order('processing_completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null as any })
  ]);

  return {
    ...caseRow,
    documents: documents ?? [],
    schedules: schedules ?? [],
    messages: messages ?? [],
    requests: requests ?? [],
    billingEntries: billingEntries ?? [],
    handlers: handlers ?? [],
    contractAgreements: contractAgreements ?? [],
    insolvency: caseRow.case_type === 'insolvency'
      ? {
          subtype: caseRow.insolvency_subtype ?? null,
          creditors: insolvencyCreditors ?? [],
          latestPlan: latestRepaymentPlan ?? null,
          latestCorrectionNotice: (latestCorrectionJob?.extracted_json as any)?.correctionNoticeSummary ?? null
        }
      : null
  };
}
