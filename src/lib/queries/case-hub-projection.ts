/**
 * 사건 허브 projection — 2026-04-16.
 *
 * 검증관 지시(backlog #2): 같은 사건, 같은 사용자, 같은 상태를 화면마다 다르게
 * 계산하는 구조가 허브를 끊는다. 사건 1건 기준 6개 섹션을 **한 곳에서** 모은 뒤
 * 대시보드/알림/허브 로비/사건 상세/의뢰인 포털이 전부 이 projection만 읽게 한다.
 *
 * 6개 섹션:
 *   progress   — 사건 진행 (제목, 단계, 담당자, 최근 일정)
 *   billing    — 비용·청구 집계
 *   recovery   — 회수·감사 집계
 *   audit      — 최근 변경 로그
 *   documents  — 문서 타임라인
 *   clients    — 이 사건의 의뢰인 명단
 *
 * 역할별 읽기/쓰기 권한은 호출자(= 화면)가 따로 가공하되, **원천 계산**은 여기서
 * 한 번만 이뤄진다. "3개 역할 화면이 같은 화면을 본다"는 데모 목표의 기반.
 *
 * 이 파일은 admin client를 쓰되, 호출 시 auth + organization membership 체크.
 * RLS 우회는 허용되나 "사건 접근 권한 없는 사용자"는 getCurrentAuth에서 막힘.
 */
import { getCurrentAuth } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ────────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────────

export type CaseHubProgress = {
  caseId: string;
  title: string | null;
  referenceNo: string | null;
  caseType: string | null;
  stageKey: string | null;
  caseStatus: string | null;
  lifecycleStatus: string | null;
  openedOn: string | null;
  updatedAt: string | null;
  handlers: Array<{
    profileId: string | null;
    name: string | null;
    role: string | null;
  }>;
  recentSchedule: {
    id: string;
    title: string | null;
    scheduledStart: string | null;
    completedAt: string | null;
  } | null;
};

export type CaseHubBilling = {
  entryCount: number;
  totalInvoiced: number;       // 청구 총액 (amount + tax)
  totalPaid: number;            // 입금 완료 금액
  totalPending: number;         // 미수금 (invoiced - paid)
  overdueCount: number;         // 연체 건수 (due_on < today & not paid)
  activeAgreements: number;
};

export type CaseHubRecovery = {
  activityCount: number;
  lastActivityAt: string | null;
  totalRecoveredAmount: number;
  recentActivities: Array<{
    id: string;
    activityKind: string | null;
    occurredAt: string | null;
    amount: number | null;
    outcomeStatus: string | null;
  }>;
};

export type CaseHubAudit = {
  recentChanges: Array<{
    id: number;
    loggedAt: string;
    tableName: string;
    operation: string;
    actorEmail: string | null;
    changedFields: string[];
  }>;
};

export type CaseHubDocumentSource = 'case_document' | 'contract';

export type CaseHubDocuments = {
  count: number;
  generatedCount: number; // case_documents (생성·업로드 문서)
  contractCount: number;  // fee_agreements (계약서)
  recent: Array<{
    id: string;
    source: CaseHubDocumentSource;
    title: string | null;
    documentKind: string | null;
    approvalStatus: string | null;
    createdAt: string | null;
    createdByName: string | null;
  }>;
};

export type CaseHubClients = {
  count: number;
  list: Array<{
    id: string;
    name: string | null;
    relation: string | null;
    linkStatus: string | null;
    portalEnabled: boolean;
    email: string | null;
  }>;
};

export type CaseHubProjection = {
  caseId: string;
  organizationId: string;
  progress: CaseHubProgress;
  billing: CaseHubBilling;
  recovery: CaseHubRecovery;
  audit: CaseHubAudit;
  documents: CaseHubDocuments;
  clients: CaseHubClients;
  fetchedAt: string;
};

// ────────────────────────────────────────────────────────────────────
// 메인 쿼리
// ────────────────────────────────────────────────────────────────────

const ACTIVE_LIFECYCLE = 'active';

export async function getCaseHubProjection(caseId: string): Promise<CaseHubProjection | null> {
  const auth = await getCurrentAuth();
  if (!auth) return null;

  const admin = createSupabaseAdminClient();

  // 1) 사건 기본 정보 + 조직 검증
  const { data: caseRow, error: caseErr } = await admin
    .from('cases')
    .select('id, title, reference_no, case_type, stage_key, case_status, lifecycle_status, opened_on, updated_at, organization_id')
    .eq('id', caseId)
    .maybeSingle();

  if (caseErr || !caseRow) {
    return null;
  }

  const organizationId = (caseRow as any).organization_id as string;
  const hasMembership = auth.memberships.some((m) => m.organization_id === organizationId);
  if (!hasMembership) return null;

  // 2) 6개 섹션 병렬 조회
  const [
    handlersResult,
    scheduleResult,
    billingResult,
    agreementsResult,
    paymentsResult,
    recoveryResult,
    auditResult,
    documentsResult,
    clientsResult,
  ] = await Promise.all([
    admin
      .from('case_handlers')
      .select('profile_id, handler_name, role')
      .eq('case_id', caseId),
    admin
      .from('case_schedules')
      .select('id, title, scheduled_start, completed_at')
      .eq('case_id', caseId)
      .order('scheduled_start', { ascending: false, nullsFirst: false })
      .limit(1),
    admin
      .from('billing_entries')
      .select('id, amount, tax_amount, status, due_on, paid_at')
      .eq('case_id', caseId),
    admin
      .from('fee_agreements')
      .select('id, is_active, title, agreement_type, created_at, created_by_name, effective_from, effective_to')
      .eq('case_id', caseId)
      .is('deleted_at', null),
    admin
      .from('payments')
      .select('id, amount, payment_status, received_at')
      .eq('case_id', caseId),
    admin
      .from('case_recovery_activities')
      .select('id, activity_kind, occurred_at, amount, outcome_status')
      .eq('case_id', caseId)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .limit(20),
    admin
      .schema('audit')
      .from('change_log')
      .select('id, logged_at, table_name, operation, actor_email, changed_fields')
      .eq('case_id', caseId)
      .order('logged_at', { ascending: false })
      .limit(10),
    admin
      .from('case_documents')
      .select('id, title, document_kind, approval_status, created_at, created_by_name')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(15),
    admin
      .from('case_clients')
      .select('id, client_name, relation_label, link_status, is_portal_enabled, client_email_snapshot')
      .eq('case_id', caseId),
  ]);

  // 3) 섹션별 집계
  const progress: CaseHubProgress = {
    caseId,
    title: (caseRow as any).title ?? null,
    referenceNo: (caseRow as any).reference_no ?? null,
    caseType: (caseRow as any).case_type ?? null,
    stageKey: (caseRow as any).stage_key ?? null,
    caseStatus: (caseRow as any).case_status ?? null,
    lifecycleStatus: (caseRow as any).lifecycle_status ?? null,
    openedOn: (caseRow as any).opened_on ?? null,
    updatedAt: (caseRow as any).updated_at ?? null,
    handlers: ((handlersResult.data ?? []) as any[]).map((h) => ({
      profileId: h.profile_id ?? null,
      name: h.handler_name ?? null,
      role: h.role ?? null,
    })),
    recentSchedule: ((scheduleResult.data ?? []) as any[])[0]
      ? {
          id: (scheduleResult.data as any[])[0].id,
          title: (scheduleResult.data as any[])[0].title ?? null,
          scheduledStart: (scheduleResult.data as any[])[0].scheduled_start ?? null,
          completedAt: (scheduleResult.data as any[])[0].completed_at ?? null,
        }
      : null,
  };

  const today = new Date().toISOString().slice(0, 10);
  const entries = (billingResult.data ?? []) as any[];
  const payments = (paymentsResult.data ?? []) as any[];
  const totalInvoiced = entries.reduce(
    (sum, e) => sum + (Number(e.amount ?? 0) + Number(e.tax_amount ?? 0)),
    0
  );
  const totalPaid = payments
    .filter((p) => p.payment_status === 'received' || p.payment_status === 'confirmed')
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const overdueCount = entries.filter(
    (e) => !e.paid_at && e.due_on && e.due_on < today
  ).length;

  const allAgreements = (agreementsResult.data ?? []) as any[];
  const billing: CaseHubBilling = {
    entryCount: entries.length,
    totalInvoiced,
    totalPaid,
    totalPending: Math.max(0, totalInvoiced - totalPaid),
    overdueCount,
    activeAgreements: allAgreements.filter((a) => a.is_active).length,
  };

  const activities = (recoveryResult.data ?? []) as any[];
  const recovery: CaseHubRecovery = {
    activityCount: activities.length,
    lastActivityAt: activities[0]?.occurred_at ?? null,
    totalRecoveredAmount: activities.reduce((sum, a) => sum + Number(a.amount ?? 0), 0),
    recentActivities: activities.slice(0, 5).map((a) => ({
      id: a.id,
      activityKind: a.activity_kind ?? null,
      occurredAt: a.occurred_at ?? null,
      amount: a.amount == null ? null : Number(a.amount),
      outcomeStatus: a.outcome_status ?? null,
    })),
  };

  const audit: CaseHubAudit = {
    recentChanges: ((auditResult.data ?? []) as any[]).map((r) => ({
      id: Number(r.id),
      loggedAt: r.logged_at,
      tableName: r.table_name,
      operation: r.operation,
      actorEmail: r.actor_email ?? null,
      changedFields: (r.changed_fields ?? []) as string[],
    })),
  };

  // case_documents (생성·업로드) + fee_agreements (계약서)를 **단일 타임라인**으로 통합.
  // 리뷰어 지시 "계약서든 생성문서든 case_documents 단일 타임라인으로 수렴".
  // 물리 테이블은 분리돼 있지만 projection에서 소비 관점으로 통합해 중복 쿼리 방지.
  const caseDocs = ((documentsResult.data ?? []) as any[]).map((d) => ({
    id: d.id,
    source: 'case_document' as const,
    title: d.title ?? null,
    documentKind: d.document_kind ?? null,
    approvalStatus: d.approval_status ?? null,
    createdAt: d.created_at ?? null,
    createdByName: d.created_by_name ?? null,
  }));
  const contractDocs = allAgreements.map((a) => ({
    id: a.id,
    source: 'contract' as const,
    title: a.title ?? (a.agreement_type ? `계약서 (${a.agreement_type})` : '계약서'),
    documentKind: a.agreement_type ?? 'contract',
    approvalStatus: a.is_active ? 'active' : 'inactive',
    createdAt: a.created_at ?? null,
    createdByName: a.created_by_name ?? null,
  }));
  const mergedDocs = [...caseDocs, ...contractDocs].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  const documents: CaseHubDocuments = {
    count: mergedDocs.length,
    generatedCount: caseDocs.length,
    contractCount: contractDocs.length,
    recent: mergedDocs.slice(0, 15),
  };

  const clients: CaseHubClients = {
    count: ((clientsResult.data ?? []) as any[]).length,
    list: ((clientsResult.data ?? []) as any[]).map((c) => ({
      id: c.id,
      name: c.client_name ?? null,
      relation: c.relation_label ?? null,
      linkStatus: c.link_status ?? null,
      portalEnabled: Boolean(c.is_portal_enabled),
      email: c.client_email_snapshot ?? null,
    })),
  };

  return {
    caseId,
    organizationId,
    progress,
    billing,
    recovery,
    audit,
    documents,
    clients,
    fetchedAt: new Date().toISOString(),
  };
}
