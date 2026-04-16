import type { ReactNode } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ROUTES } from '@/lib/routes/registry';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingEntryForm } from '@/components/forms/billing-entry-form';
import { CaseOrganizationForm } from '@/components/forms/case-organization-form';
import { ClientInvitationForm } from '@/components/forms/client-invitation-form';
import { ClientLinkForm } from '@/components/forms/client-link-form';
import { DocumentCreateForm } from '@/components/forms/document-create-form';
import { DocumentReviewForm } from '@/components/forms/document-review-form';
import { FeeAgreementForm } from '@/components/forms/fee-agreement-form';
import { MessageCreateFormWithVoice } from '@/components/forms/message-create-form-with-voice';
import { PartyCreateForm } from '@/components/forms/party-create-form';
import { PaymentRecordForm } from '@/components/forms/payment-record-form';
import { RecoveryCreateForm } from '@/components/forms/recovery-create-form';
import { RequestCreateForm } from '@/components/forms/request-create-form';
import { ScheduleCreateForm } from '@/components/forms/schedule-create-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { CaseDetailHubConnectButton } from '@/components/case-detail-hub-connect-button';
import { CaseCoverForm } from '@/components/forms/case-cover-form';
import { findMembership, requireAuthenticatedUser } from '@/lib/auth';
import { requestDocumentReviewAction, updateCaseStageAction } from '@/lib/actions/case-actions';
import { CASE_STAGE_OPTIONS, getCaseStageLabel, isCaseStageStale } from '@/lib/case-stage';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { hasPermission, isWorkspaceAdmin } from '@/lib/permissions';
import { getCaseBaseDetail, getCaseDetailSections } from '@/lib/queries/cases';
import { getCaseHubRegistrations } from '@/lib/queries/collaboration-hubs';
import { ExportLinks } from '@/components/export-links';
import { CaseDocumentChecklist } from '@/components/case-document-checklist';

const tabs = ['overview', 'communication', 'documents', 'schedule', 'participants', 'billing', 'timeline', 'cover'] as const;

type TabKey = (typeof tabs)[number] | 'collection';

function getTabLabel(tab: TabKey, collectionFocused: boolean) {
  if (tab === 'overview') return '기본정보';
  if (tab === 'communication') return collectionFocused ? '소통기록' : '소통';
  if (tab === 'documents') return '문서';
  if (tab === 'schedule') return '일정';
  if (tab === 'participants') return '관련자';
  if (tab === 'billing') return collectionFocused ? '약정/회수금' : '비용/정산';
  if (tab === 'timeline') return '진행이력';
  if (tab === 'cover') return '🖨 표지';
  return '추심실행';
}

function TabLink({ caseId, tab, current, children }: { caseId: string; tab: TabKey; current: string; children: ReactNode }) {
  const active = current === tab;
  return (
    <Link
      href={`${ROUTES.CASES}/${caseId}?tab=${tab}` as Route}
      className={`rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-[0_10px_20px_rgba(8,47,73,0.22)]' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
    >
      {children}
    </Link>
  );
}

function toneForApproval(status: string) {
  if (status === 'approved') return 'green';
  if (status === 'pending_review') return 'amber';
  if (status === 'rejected') return 'red';
  if (status === 'stale') return 'amber';
  return 'slate';
}

function mapLabel(value: string | null | undefined, labels: Record<string, string>, fallback = '-') {
  if (!value) return fallback;
  return labels[value] ?? value;
}

function getCaseTypeLabel(value: string | null | undefined) {
  return mapLabel(value, {
    civil: '민사',
    debt_collection: '채권추심',
    execution: '강제집행',
    injunction: '가처분',
    criminal: '형사',
    advisory: '자문',
    insolvency: '도산(회생·파산)',
    other: '기타'
  });
}

function getCaseStatusLabel(value: string | null | undefined) {
  return mapLabel(value, {
    intake: '접수',
    active: '진행중',
    pending_review: '검토대기',
    approved: '승인',
    closed: '종결',
    archived: '보관'
  });
}

function getApprovalStatusLabel(value: string | null | undefined) {
  return mapLabel(value, {
    draft: '초안',
    pending_review: '검토대기',
    approved: '승인',
    rejected: '반려',
    stale: '재확인 필요'
  });
}

function getVisibilityLabel(value: string | null | undefined) {
  return mapLabel(value, {
    internal_only: '내부 전용',
    client_visible: '의뢰인 공개',
    cross_org_only: '조직 간 공유'
  });
}

function getScheduleKindLabel(value: string | null | undefined) {
  return mapLabel(value, {
    hearing: '기일',
    deadline: '마감',
    meeting: '회의',
    reminder: '리마인더',
    collection_visit: '현장방문',
    other: '기타'
  });
}

function getRequestKindLabel(value: string | null | undefined) {
  return mapLabel(value, {
    question: '질문',
    document_submission: '서류 제출',
    document_request: '서류 요청',
    schedule_request: '일정 요청',
    call_request: '통화 요청',
    meeting_request: '미팅 요청',
    status_check: '진행상태 확인',
    signature_request: '서명 요청',
    other: '기타'
  });
}

function getDocumentKindLabel(value: string | null | undefined) {
  return mapLabel(value, {
    complaint: '소장',
    answer: '답변서',
    brief: '준비서면',
    evidence: '증거자료',
    contract: '계약서',
    order: '결정문',
    notice: '통지서',
    opinion: '의견서',
    internal_memo: '내부메모',
    other: '기타'
  });
}

function getWorkflowStatusLabel(value: string | null | undefined) {
  return mapLabel(value, {
    open: '진행중',
    pending: '대기',
    completed: '완료',
    approved: '승인',
    rejected: '반려',
    paid: '지급완료',
    unpaid: '미수',
    overdue: '연체',
    void: '무효',
    active: '활성'
  });
}

function getPartyRoleLabel(value: string | null | undefined) {
  return mapLabel(value, {
    creditor: '채권자',
    debtor: '채무자',
    plaintiff: '원고',
    defendant: '피고',
    respondent: '피신청인',
    petitioner: '신청인',
    other: '기타'
  });
}

function getEntityTypeLabel(value: string | null | undefined) {
  return mapLabel(value, { individual: '개인', corporation: '법인' });
}

function getOrgRoleLabel(value: string | null | undefined) {
  return mapLabel(value, {
    managing_org: '주관 조직',
    principal_client_org: '의뢰인 본사',
    collection_org: '추심 조직',
    legal_counsel_org: '법률 대리 조직',
    co_counsel_org: '공동 대리 조직',
    partner_org: '협업 조직'
  });
}

function getAccessScopeLabel(value: string | null | undefined) {
  return mapLabel(value, {
    full: '전체',
    collection_only: '추심만',
    legal_only: '법률만',
    billing_only: '정산만',
    read_only: '읽기 전용'
  });
}

function getBillingScopeLabel(value: string | null | undefined) {
  return mapLabel(value, {
    none: '없음',
    direct_client_billing: '의뢰인 직접 청구',
    upstream_settlement: '상위 조직 정산',
    internal_settlement_only: '내부 정산만'
  });
}

function getAgreementTypeLabel(value: string | null | undefined) {
  return mapLabel(value, {
    retainer: '착수금',
    flat_fee: '정액',
    success_fee: '성공보수',
    expense_reimbursement: '실비정산',
    installment_plan: '분납',
    internal_settlement: '내부정산'
  });
}

function getPaymentMethodLabel(value: string | null | undefined) {
  return mapLabel(value, {
    bank_transfer: '계좌이체',
    card: '카드',
    cash: '현금',
    offset: '상계',
    other: '기타'
  });
}

function getPaymentStatusLabel(value: string | null | undefined) {
  return mapLabel(value, { pending: '대기', confirmed: '확정', reversed: '취소' });
}

function getActivityKindLabel(value: string | null | undefined) {
  return mapLabel(value, {
    call: '전화',
    letter: '문자/내용증명',
    visit: '방문',
    negotiation: '협상',
    payment: '입금',
    asset_check: '재산조회',
    legal_action: '법적조치',
    other: '기타'
  });
}

export default async function CaseDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ caseId: string }>;
  searchParams?: Promise<{ tab?: string; clientInvite?: string }>;
}) {
  const { caseId } = await params;
  const { tab = 'overview', clientInvite } = searchParams ? await searchParams : { tab: 'overview', clientInvite: undefined };
  const currentTab: TabKey = (tab === 'collection' ? 'collection' : (tabs.includes(tab as any) ? (tab as TabKey) : 'overview'));
  const auth = await requireAuthenticatedUser();
  const caseBase = await getCaseBaseDetail(caseId);

  if (!caseBase) notFound();

  const showCollectionModule = Boolean(caseBase.module_flags?.collection || caseBase.case_type === 'debt_collection');
  const collectionFocused = showCollectionModule || caseBase.case_type === 'debt_collection';
  const caseSections = await getCaseDetailSections(caseId, currentTab, collectionFocused);
  const caseDetail = { ...caseBase, ...caseSections };

  const membership = findMembership(auth, caseDetail.organization_id);
  const canManage = Boolean(membership);
  const canAssign = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'case_assign'));
  const canReview = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'document_approve'));
  const canBillingIssue = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'billing_manage'));
  const canPaymentConfirm = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'billing_payment_confirm'));
  const canCollection = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'collection_view'));
  const canManageStage = Boolean(membership && hasPermission(auth, caseDetail.organization_id, 'case_stage_manage'));
  const stageStale = isCaseStageStale(caseDetail.updated_at, 7);
  const recoveredAmount = caseDetail.recoveryActivities.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const paymentAmount = caseDetail.payments.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const pendingSettlementAmount = caseDetail.orgSettlements
    .filter((item: any) => !['paid', 'void'].includes(item.status))
    .reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0);
  const activeAgreement = caseDetail.feeAgreements.find((item: any) => item.is_active) ?? caseDetail.feeAgreements[0] ?? null;
  const legalRequests = caseDetail.requests.filter((item: any) => ['document_request', 'signature_request', 'schedule_request'].includes(item.request_kind));
  const caseHubRegistration = (await getCaseHubRegistrations(caseDetail.organization_id, [caseId]))[caseId] ?? {
    firstHubId: null,
    sharedHubId: null
  };
  const isClientLinked = (caseDetail.clients?.length ?? 0) > 0;
  const isHubLinked = Boolean(caseHubRegistration.sharedHubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{caseDetail.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
            <span>{caseDetail.reference_no ?? '-'}</span>
            <span>{getCaseTypeLabel(caseDetail.case_type)}</span>
            <span>{getCaseStatusLabel(caseDetail.case_status)}</span>
            <span>{getCaseStageLabel(caseDetail.stage_key)}</span>
            <span>{formatDate(caseDetail.opened_on)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/clients"
            className={`inline-flex h-12 items-center rounded-2xl border px-5 text-base font-semibold transition ${
              isClientLinked
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isClientLinked ? '의뢰인 연동' : '의뢰인 미연동'}
          </Link>
          {isHubLinked ? (
            <Link
              href={`/inbox/${caseHubRegistration.sharedHubId}?caseId=${caseId}`}
              className="inline-flex h-12 items-center rounded-2xl border border-sky-200 bg-sky-50 px-5 text-base font-semibold text-sky-800 transition hover:bg-sky-100"
            >
              허브 연동
            </Link>
          ) : isClientLinked && caseHubRegistration.firstHubId ? (
            <CaseDetailHubConnectButton
              hubId={caseHubRegistration.firstHubId}
              organizationId={caseDetail.organization_id}
              caseId={caseId}
              returnPath={`/cases/${caseId}`}
            />
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-12 cursor-not-allowed items-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-base font-semibold text-slate-500"
            >
              허브 미연동
            </button>
          )}
          <Badge tone="blue">{getCaseStatusLabel(caseDetail.case_status)}</Badge>
          <Badge tone="slate">{getCaseStageLabel(caseDetail.stage_key)}</Badge>
          {stageStale ? <Badge tone="amber">단계 7일 이상 미갱신</Badge> : null}
        </div>
      </div>

      {canManageStage ? (
        <Card>
          <CardHeader><CardTitle>사건 단계 관리</CardTitle></CardHeader>
          <CardContent>
            <ClientActionForm
              action={updateCaseStageAction}
              successTitle="사건 단계가 저장되었습니다."
              successMessage="변경된 단계가 타임라인에 기록됩니다."
              errorTitle="단계 저장에 실패했습니다."
              errorCause="권한이 없거나 사건 단계 저장에 실패했습니다."
              errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
              className="grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end"
            >
              <input type="hidden" name="caseId" value={caseId} />
              <input type="hidden" name="organizationId" value={caseDetail.organization_id} />
              <label className="grid gap-1 text-sm text-slate-600">
                현재 단계
                <select name="stageKey" defaultValue={caseDetail.stage_key ?? 'intake'} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800">
                  {CASE_STAGE_OPTIONS.map((stage) => (
                    <option key={stage.key} value={stage.key}>{stage.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                단계 메모
                <input
                  name="stageNote"
                  maxLength={300}
                  placeholder="예: 의뢰인 답변 수신 후 재검토로 전환"
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-800"
                />
              </label>
              <SubmitButton pendingLabel="저장 중...">단계 저장</SubmitButton>
            </ClientActionForm>
          </CardContent>
        </Card>
      ) : null}

      {clientInvite ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-semibold">✅ 초대 링크가 생성되었습니다</p>
          <p className="mt-1 text-xs text-emerald-700">아래 링크를 복사해서 의뢰인에게 전달하세요. 이 화면을 벗어나면 다시 확인할 수 없습니다.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3">
            <code className="flex-1 select-all font-mono text-sm text-slate-900">{`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${clientInvite}`}</code>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabLink caseId={caseId} tab="overview" current={currentTab}>{getTabLabel('overview', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="communication" current={currentTab}>{getTabLabel('communication', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="documents" current={currentTab}>{getTabLabel('documents', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="schedule" current={currentTab}>{getTabLabel('schedule', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="participants" current={currentTab}>{getTabLabel('participants', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="billing" current={currentTab}>{getTabLabel('billing', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="timeline" current={currentTab}>{getTabLabel('timeline', collectionFocused)}</TabLink>
        <TabLink caseId={caseId} tab="cover" current={currentTab}>{getTabLabel('cover', collectionFocused)}</TabLink>
        {showCollectionModule ? <TabLink caseId={caseId} tab="collection" current={currentTab}>{getTabLabel('collection', collectionFocused)}</TabLink> : null}
        {(caseDetail.case_type === 'insolvency' || caseDetail.module_flags?.insolvency) ? (
          <>
            <Link
              href={`${ROUTES.CASES}/${caseId}/bankruptcy` as Route}
              className="rounded-full px-4 py-2 text-sm font-medium bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              🏛 도산 모듈
            </Link>
            {caseDetail.insolvency_subtype === 'individual_rehabilitation' && (
              <Link
                href={`${ROUTES.CASES}/${caseId}/rehabilitation` as Route}
                className="rounded-full px-4 py-2 text-sm font-medium bg-white text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50"
              >
                📋 개인회생 자동작성
              </Link>
            )}
          </>
        ) : null}
      </div>

      {currentTab === 'overview' ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader><CardTitle className="text-center text-base font-semibold text-slate-600">{collectionFocused ? '청구 소가' : '소가'}</CardTitle></CardHeader><CardContent><p className="text-center text-2xl font-semibold text-slate-900">{formatCurrency(caseDetail.principal_amount)}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-center text-base font-semibold text-slate-600">{collectionFocused ? '누적 회수금' : '사건번호'}</CardTitle></CardHeader><CardContent><p className="text-center text-sm text-slate-700">{collectionFocused ? formatCurrency(recoveredAmount) : (caseDetail.case_number ?? '-')}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-center text-base font-semibold text-slate-600">{collectionFocused ? '현재 약정' : '법원'}</CardTitle></CardHeader><CardContent><p className="text-center text-sm text-slate-700">{collectionFocused ? (activeAgreement ? `${activeAgreement.title} · ${activeAgreement.rate != null ? `${activeAgreement.rate}%` : formatCurrency(activeAgreement.fixed_amount)}` : '등록된 약정 없음') : (caseDetail.court_name ?? '-')}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-center text-base font-semibold text-slate-600">{collectionFocused ? '다음 일정/조치' : '다음 일정'}</CardTitle></CardHeader><CardContent><p className="text-center text-sm text-slate-700">{caseDetail.schedules[0] ? `${caseDetail.schedules[0].title} · ${formatDateTime(caseDetail.schedules[0].scheduled_start)}` : '-'}</p></CardContent></Card>
            <Card className="md:col-span-2 xl:col-span-4"><CardHeader><CardTitle>사건 요약</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-slate-700">{caseDetail.summary ?? '요약 없음'}</p></CardContent></Card>
          </section>
          <CaseDocumentChecklist caseType={caseDetail.case_type} caseTitle={caseDetail.title} />
        </>
      ) : null}

      {currentTab === 'participants' ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>개인 관련자</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {caseDetail.clients.length ? caseDetail.clients.map((client: any) => (
                <div key={client.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{client.client_name}</p>
                    <Badge tone={client.is_portal_enabled ? 'green' : 'slate'}>{client.is_portal_enabled ? '포털 활성' : '연락처만 등록'}</Badge>
                  </div>
                  <p className="mt-1 text-slate-500">{client.client_email_snapshot ?? '-'}</p>
                  <p className="text-slate-500">{client.relation_label ?? '-'}</p>
                </div>
              )) : <p className="text-sm text-slate-500">연결된 의뢰인이 없습니다.</p>}
              {caseDetail.parties.length ? caseDetail.parties.map((party: any) => (
                <div key={party.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{party.display_name}</p>
                    <Badge tone={party.is_primary ? 'blue' : 'slate'}>{getPartyRoleLabel(party.party_role)}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-slate-500">
                    <p>구분: {getEntityTypeLabel(party.entity_type)}</p>
                    <p>연락처: {party.phone ?? '-'}</p>
                    <p>이메일: {party.email ?? '-'}</p>
                    <p>주소: {party.address_summary ?? '-'}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">등록된 당사자가 없습니다.</p>}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>참여 조직</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {caseDetail.caseOrganizations.length ? caseDetail.caseOrganizations.map((org: any) => (
                  <div key={org.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{org.organization?.name ?? '-'}</p>
                      <Badge tone={org.is_lead ? 'blue' : 'slate'}>{getOrgRoleLabel(org.role)}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-500">
                      <p>접근 범위: {getAccessScopeLabel(org.access_scope)}</p>
                      <p>정산 범위: {getBillingScopeLabel(org.billing_scope)}</p>
                      <p>소통 범위: {getVisibilityLabel(org.communication_scope)}</p>
                      <p>메모: {org.agreement_summary ?? '-'}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-slate-500">참여 조직이 없습니다.</p>}
              </CardContent>
            </Card>
            {canManage ? (
              <>
                <Card><CardHeader><CardTitle>당사자 등록</CardTitle></CardHeader><CardContent><PartyCreateForm caseId={caseId} /></CardContent></Card>
                <Card><CardHeader><CardTitle>의뢰인 연결</CardTitle></CardHeader><CardContent className="space-y-4"><ClientLinkForm caseId={caseId} />{isWorkspaceAdmin(membership) ? <ClientInvitationForm caseId={caseId} /> : null}</CardContent></Card>
                {canAssign ? <Card><CardHeader><CardTitle>참여 조직 추가</CardTitle></CardHeader><CardContent><CaseOrganizationForm caseId={caseId} /></CardContent></Card> : null}
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {currentTab === 'communication' ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>메시지</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {caseDetail.messages.length ? caseDetail.messages.map((message: any) => (
                <div key={message.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{message.sender?.full_name ?? message.sender_role}</p>
                    <Badge tone={message.is_internal ? 'slate' : 'blue'}>{message.is_internal ? '내부 메모' : '외부 공유'}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-600">{message.body}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(message.created_at)}</p>
                </div>
              )) : <p className="text-sm text-slate-500">등록된 메시지가 없습니다.</p>}
            </CardContent>
          </Card>
          {canManage ? <Card><CardHeader><CardTitle>메시지 등록</CardTitle></CardHeader><CardContent><MessageCreateFormWithVoice caseId={caseId} allowInternal /></CardContent></Card> : null}
        </section>
      ) : null}

      {currentTab === 'documents' ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>문서</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {caseDetail.documents.length ? caseDetail.documents.map((document: any) => (
                <div key={document.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{document.title}</p>
                      <p className="text-sm text-slate-500">{getDocumentKindLabel(document.document_kind)}</p>
                    </div>
                    <Badge tone={toneForApproval(document.approval_status)}>{getApprovalStatusLabel(document.approval_status)}</Badge>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>공개범위: {getVisibilityLabel(document.client_visibility)}</p>
                    <p>작성자: {document.created_by_name ?? '-'}</p>
                    <p>요약: {document.summary ?? '-'}</p>
                    {document.reviewed_at ? <p>최종 검토: {document.reviewed_by_name ?? '-'} · {formatDateTime(document.reviewed_at)}</p> : null}
                  </div>
                  {canManage && ['draft', 'rejected', 'stale'].includes(document.approval_status) ? (
                    <ClientActionForm
                      action={requestDocumentReviewAction.bind(null, document.id)}
                      successTitle="결재 요청이 등록되었습니다."
                      successMessage="검토자에게 알림이 발송됩니다."
                      errorTitle="결재 요청에 실패했습니다."
                      errorCause="이미 검토 중인 문서이거나 권한이 없습니다."
                      errorResolution="문서 상태를 확인하고 다시 시도해 주세요."
                      className="mt-4"
                    >
                      <SubmitButton variant="secondary" pendingLabel="요청 중...">결재 요청</SubmitButton>
                    </ClientActionForm>
                  ) : null}
                </div>
              )) : <p className="text-sm text-slate-500">등록된 문서가 없습니다.</p>}
              {canReview ? (
                <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">문서 결재 처리</h3>
                  {caseDetail.documents.filter((document: any) => document.approval_status === 'pending_review').length ? (
                    caseDetail.documents.filter((document: any) => document.approval_status === 'pending_review').map((document: any) => (
                      <div key={document.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="mb-3 text-sm font-medium text-slate-900">{document.title}</p>
                        <DocumentReviewForm documentId={document.id} />
                      </div>
                    ))
                  ) : <p className="text-sm text-slate-500">결재 대기 문서가 없습니다.</p>}
                </div>
              ) : null}
            </CardContent>
          </Card>
          {canManage ? <Card><CardHeader><CardTitle>문서 등록</CardTitle></CardHeader><CardContent><DocumentCreateForm caseId={caseId} /></CardContent></Card> : null}
        </section>
      ) : null}

      {currentTab === 'schedule' ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>일정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {caseDetail.schedules.length ? caseDetail.schedules.map((schedule: any) => (
                <div key={schedule.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{schedule.title}</p>
                    <Badge tone={schedule.is_important ? 'red' : 'slate'}>{getScheduleKindLabel(schedule.schedule_kind)}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-slate-500">
                    <p>시작: {formatDateTime(schedule.scheduled_start)}</p>
                    <p>종료: {formatDateTime(schedule.scheduled_end)}</p>
                    <p>공개범위: {getVisibilityLabel(schedule.client_visibility)}</p>
                    <p>위치: {schedule.location ?? '-'}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">등록된 일정이 없습니다.</p>}
            </CardContent>
          </Card>
          {canManage ? <Card><CardHeader><CardTitle>일정 등록</CardTitle></CardHeader><CardContent><ScheduleCreateForm caseId={caseId} /></CardContent></Card> : null}
        </section>
      ) : null}

      {currentTab === 'billing' ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>{collectionFocused ? '약정 및 회수금' : '비용/정산'}</CardTitle><ExportLinks resource="billing" caseId={caseId} /></div></CardHeader>
            <CardContent className="space-y-6">
              {collectionFocused ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">현재 약정</p>
                    <p className="mt-2 font-semibold text-slate-900">{activeAgreement?.title ?? '없음'}</p>
                    <p className="mt-1 text-slate-500">{activeAgreement ? `${activeAgreement.rate != null ? `${activeAgreement.rate}%` : formatCurrency(activeAgreement.fixed_amount)} 기준` : '약정을 먼저 등록해 주세요.'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">누적 회수금</p>
                    <p className="mt-2 font-semibold text-slate-900">{formatCurrency(recoveredAmount)}</p>
                    <p className="mt-1 text-slate-500">회수 활동 기준 합계</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">입금 합계</p>
                    <p className="mt-2 font-semibold text-slate-900">{formatCurrency(paymentAmount)}</p>
                    <p className="mt-1 text-slate-500">기록된 입금 기준</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">정산 예정액</p>
                    <p className="mt-2 font-semibold text-slate-900">{formatCurrency(pendingSettlementAmount)}</p>
                    <p className="mt-1 text-slate-500">미지급/대기 상태 기준</p>
                  </div>
                </div>
              ) : null}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">{collectionFocused ? '약정 원본/등록 이력' : '약정'}</h3>
                {caseDetail.feeAgreements.length ? caseDetail.feeAgreements.map((agreement: any) => (
                  <div key={agreement.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{agreement.title}</p>
                      <Badge tone={agreement.is_active ? 'green' : 'slate'}>{getAgreementTypeLabel(agreement.agreement_type)}</Badge>
                    </div>
                    <p className="mt-2 text-slate-500">고정금액: {formatCurrency(agreement.fixed_amount)}</p>
                    <p className="text-slate-500">비율: {agreement.rate ?? '-'}%</p>
                    {collectionFocused ? <p className="text-slate-500">설명: {agreement.description ?? '등록 메모 없음'}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">등록된 약정이 없습니다.</p>}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">{collectionFocused ? '회수금/청구 항목' : '청구 항목'}</h3>
                {caseDetail.billingEntries.length ? caseDetail.billingEntries.map((entry: any) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{entry.title}</p>
                      <Badge tone="slate">{getWorkflowStatusLabel(entry.status)}</Badge>
                    </div>
                    <p className="mt-2 text-slate-500">금액: {formatCurrency(entry.amount)}</p>
                    <p className="text-slate-500">세액: {formatCurrency(entry.tax_amount)}</p>
                    <p className="text-slate-500">납기: {formatDate(entry.due_on)}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">등록된 청구 항목이 없습니다.</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">{collectionFocused ? '청구서/정산 기준 문서' : '청구서'}</h3>
                  {caseDetail.invoices.length ? caseDetail.invoices.map((invoice: any) => (
                    <div key={invoice.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{invoice.invoice_no}</p>
                      <p className="text-slate-500">{invoice.title}</p>
                      <p className="text-slate-500">{formatCurrency(invoice.total_amount)} · {getWorkflowStatusLabel(invoice.status)}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">청구서가 없습니다.</p>}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">{collectionFocused ? '입금/정산' : '입금'}</h3>
                  {caseDetail.payments.length ? caseDetail.payments.map((payment: any) => (
                    <div key={payment.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-slate-500">{getPaymentMethodLabel(payment.payment_method)} · {getPaymentStatusLabel(payment.payment_status)}</p>
                      <p className="text-slate-500">{formatDateTime(payment.received_at)}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">입금 내역이 없습니다.</p>}
                  {collectionFocused ? (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-semibold text-slate-900">내부 정산 대기</h4>
                      {caseDetail.orgSettlements.length ? caseDetail.orgSettlements.map((settlement: any) => (
                        <div key={settlement.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                          <p className="font-medium text-slate-900">{settlement.title}</p>
                          <p className="text-slate-500">{formatCurrency(settlement.amount)} · {getWorkflowStatusLabel(settlement.status)}</p>
                          <p className="text-slate-500">기한: {formatDate(settlement.due_on)}</p>
                        </div>
                      )) : <p className="text-sm text-slate-500">정산 대기 내역이 없습니다.</p>}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          {canManage ? (
            <div className="space-y-6">
              {canBillingIssue ? <Card><CardHeader><CardTitle>{collectionFocused ? '약정 원본 등록 / 운영 수치 반영' : '약정 등록'}</CardTitle></CardHeader><CardContent className="space-y-3">{collectionFocused ? <p className="text-sm leading-6 text-slate-500">이미 체결된 약정도 수치만 옮겨 적어 바로 운영에 반영할 수 있도록 두었습니다. 현재는 가장 최근 활성 약정을 운영 기준값으로 사용합니다.</p> : null}<FeeAgreementForm caseId={caseId} /></CardContent></Card> : null}
              {canBillingIssue ? <Card><CardHeader><CardTitle>{collectionFocused ? '회수금/청구 항목 등록' : '청구 항목 등록'}</CardTitle></CardHeader><CardContent><BillingEntryForm caseId={caseId} /></CardContent></Card> : null}
              {canPaymentConfirm ? <Card><CardHeader><CardTitle>입금 기록</CardTitle></CardHeader><CardContent><PaymentRecordForm caseId={caseId} /></CardContent></Card> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {currentTab === 'timeline' ? (
        <section className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>진행이력</CardTitle>
                {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {caseDetail.documents.slice(0, 5).map((document: any) => (
                <div key={`doc-${document.id}`} className="rounded-xl border border-slate-200 p-4">문서 · {document.title} · {formatDateTime(document.updated_at)}</div>
              ))}
              {caseDetail.requests.slice(0, 5).map((request: any) => (
                <div key={`req-${request.id}`} className="rounded-xl border border-slate-200 p-4">요청 · {request.title} · {formatDateTime(request.created_at)}</div>
              ))}
              {caseDetail.messages.slice(0, 5).map((message: any) => (
                <div key={`msg-${message.id}`} className="rounded-xl border border-slate-200 p-4">메시지 · {message.sender?.full_name ?? message.sender_role} · {formatDateTime(message.created_at)}</div>
              ))}
              {!caseDetail.documents.length && !caseDetail.requests.length && !caseDetail.messages.length ? <p className="text-sm text-slate-500">표시할 이력이 없습니다.</p> : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {currentTab === 'cover' ? (
        <section className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>소송기록 표지 정보</CardTitle>
                <Link
                  href={`${ROUTES.CASES}/${caseId}/cover` as Route}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  🖨 표지 인쇄
                </Link>
              </div>
              <p className="text-sm text-slate-500">생각날 때 채워두면 표지 출력 시 자동으로 반영됩니다.</p>
            </CardHeader>
            <CardContent>
              <CaseCoverForm
                caseId={caseId}
                organizationId={caseDetail.organization_id}
                coverFields={caseDetail}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {currentTab === 'collection' && showCollectionModule ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>추심 실행 허브</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">최근 추심 실행</p>
                  <p className="mt-2 font-semibold text-slate-900">{caseDetail.recoveryActivities[0]?.activity_kind ?? '기록 없음'}</p>
                  <p className="mt-1 text-slate-500">{caseDetail.recoveryActivities[0] ? formatDateTime(caseDetail.recoveryActivities[0].occurred_at) : '추심 실행 기록을 등록해 주세요.'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">법률/협업 요청</p>
                  <p className="mt-2 font-semibold text-slate-900">{legalRequests.length}건</p>
                  <p className="mt-1 text-slate-500">문서 요청, 서명 요청, 일정 요청 기준</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">실행 자료</p>
                  <p className="mt-2 font-semibold text-slate-900">{caseDetail.documents.length}건</p>
                  <p className="mt-1 text-slate-500">사건 문서와 전달 자료를 같은 화면에서 확인합니다.</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">최근 추심 실행 기록</h3>
              {caseDetail.recoveryActivities.length ? caseDetail.recoveryActivities.map((activity: any) => (
                <div key={activity.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{getActivityKindLabel(activity.activity_kind)}</p>
                    <Badge tone="slate">{formatDateTime(activity.occurred_at)}</Badge>
                  </div>
                  <p className="mt-2 text-slate-500">금액: {formatCurrency(activity.amount)}</p>
                  <p className="text-slate-500">결과: {activity.outcome_status ?? '-'}</p>
                  <p className="text-slate-500">비고: {activity.notes ?? '-'}</p>
                </div>
              )) : <p className="text-sm text-slate-500">등록된 회수 활동이 없습니다.</p>}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">법률/협업 요청 현황</h3>
                {caseDetail.requests.length ? caseDetail.requests.map((request: any) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{request.title}</p>
                      <Badge tone={request.status === 'completed' ? 'green' : request.status === 'open' ? 'amber' : 'slate'}>{getWorkflowStatusLabel(request.status)}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">유형: {getRequestKindLabel(request.request_kind)}</p>
                    <p className="text-slate-500">마감: {formatDateTime(request.due_at)}</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-600">{request.body}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">등록된 법률/협업 요청이 없습니다.</p>}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">실행 자료/문서</h3>
                {caseDetail.documents.length ? caseDetail.documents.slice(0, 6).map((document: any) => (
                  <div key={document.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{document.title}</p>
                      <Badge tone={toneForApproval(document.approval_status)}>{getApprovalStatusLabel(document.approval_status)}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">유형: {getDocumentKindLabel(document.document_kind)}</p>
                    <p className="text-slate-500">요약: {document.summary ?? '-'}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">사건에 연결된 실행 자료가 없습니다.</p>}
              </div>
            </CardContent>
          </Card>
          {canCollection ? (
            <div className="space-y-6">
              <Card><CardHeader><CardTitle>추심 실행 기록 등록</CardTitle></CardHeader><CardContent><RecoveryCreateForm caseId={caseId} /></CardContent></Card>
              <Card><CardHeader><CardTitle>법률/협업 요청 등록</CardTitle></CardHeader><CardContent><RequestCreateForm caseId={caseId} /></CardContent></Card>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
