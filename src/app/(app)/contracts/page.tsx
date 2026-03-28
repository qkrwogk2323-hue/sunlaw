import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractUpdatePanel } from '@/components/forms/contract-update-panel';
import { ServiceDocsToggle } from '@/components/contracts/service-docs-toggle';
import {
  PLATFORM_CONTRACT_SUMMARY,
  PLATFORM_CONTRACT_VERSION,
  PLATFORM_PRIVACY_CONSENT_LABEL,
  PLATFORM_PRIVACY_POLICY_VERSION,
  PLATFORM_TERMS_VERSION
} from '@/lib/legal-documents';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { getBillingCaseOptions, getContractWorkspace } from '@/lib/queries/billing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ContractsPage({
  searchParams
}: {
  searchParams?: Promise<{ caseId?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const supabase = await createSupabaseServerClient();
  const resolved = searchParams ? await searchParams : undefined;
  const caseId = `${resolved?.caseId ?? ''}`.trim() || null;
  const allAgreements = await getContractWorkspace(organizationId);
  const agreements = caseId ? allAgreements.filter((item: any) => item.case_id === caseId) : allAgreements;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const privacyConsentRecordedAt = typeof metadata.privacy_consent_recorded_at === 'string' ? metadata.privacy_consent_recorded_at : null;
  const privacyConsentVersion = typeof metadata.privacy_consent_version === 'string' ? metadata.privacy_consent_version : PLATFORM_PRIVACY_POLICY_VERSION;
  const serviceConsentVersion = typeof metadata.service_consent_version === 'string' ? metadata.service_consent_version : PLATFORM_TERMS_VERSION;
  const agreementCaseIds = [...new Set(agreements.map((item: any) => item.case_id).filter(Boolean))];
  const [caseOptions, { data: contractDocumentRows }, { data: organizationRow }] = await Promise.all([
    getBillingCaseOptions(organizationId),
    agreementCaseIds.length
      ? supabase
          .from('case_documents')
          .select('id, case_id, title, created_at, client_visibility, summary')
          .in('case_id', agreementCaseIds)
          .eq('document_kind', 'contract')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('organizations')
      .select('name, representative_name, address_line1, address_line2, business_number')
      .eq('id', organizationId)
      .maybeSingle()
  ]);

  const contractDocumentMap = new Map<string, any>();
  const contractDocumentIdMap = new Map<string, any>();
  for (const item of contractDocumentRows ?? []) {
    contractDocumentIdMap.set(item.id, item);
    if (!contractDocumentMap.has(item.case_id)) {
      contractDocumentMap.set(item.case_id, item);
    }
  }

  const organizationProfile = {
    name: organizationRow?.name ?? '현재 조직',
    representativeName: organizationRow?.representative_name ?? '',
    address: [organizationRow?.address_line1, organizationRow?.address_line2].filter(Boolean).join(' ').trim(),
    registrationNumber: organizationRow?.business_number ?? ''
  };

  const contractExecutionItems = agreements.filter((item: any) => {
    const terms = item.terms_json ?? {};
    return Boolean(terms.sent_to_client || terms.signature_request);
  });

  function agreementLabel(type: string) {
    switch (type) {
      case 'flat_fee':
        return '정액 보수';
      case 'success_fee':
        return '성공보수';
      case 'expense_reimbursement':
        return '실비 정산';
      case 'installment_plan':
        return '분납 약정';
      case 'internal_settlement':
        return '내부 정산';
      default:
        return '착수금';
    }
  }

  function signatureMethodLabel(method?: string | null) {
    switch (method) {
      case 'electronic_signature':
        return '전자서명';
      case 'kakao_confirmation':
        return '카카오 확인';
      case 'signed_document_upload':
        return '서명본 업로드';
      default:
        return '플랫폼 확인 체크';
    }
  }

  function signatureStatusLabel(status?: string | null) {
    if (status === 'completed') return '동의 완료';
    return '응답 대기';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">계약 관리</h1>
          <p className="mt-2 text-sm text-slate-600">
            사건별 비용 약정, 적용 기간, 청구 대상을 한 곳에서 확인합니다. 허브와 사건 화면에서 연결된 계약은 이 페이지에서 다시 검토할 수 있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
          </div>
        </div>
        <ServiceDocsToggle
          privacyConsentRecordedAtLabel={privacyConsentRecordedAt ? `최근 동의 기록 ${formatDate(privacyConsentRecordedAt)}` : '아직 기록된 동의 이력이 없습니다.'}
          privacyLabel={PLATFORM_PRIVACY_CONSENT_LABEL}
          privacyVersion={privacyConsentVersion}
          termsVersion={serviceConsentVersion}
          contractVersion={PLATFORM_CONTRACT_VERSION}
          contractSummary={PLATFORM_CONTRACT_SUMMARY}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/billing" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          비용 관리 보기
        </Link>
        <Link href="/notifications" className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          관련 알림 보기
        </Link>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>계약 목록</CardTitle>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                {agreements.length}건
              </div>
            </div>
            {caseId ? <Badge tone="blue">선택 사건만 표시</Badge> : <Badge tone="slate">전체 사건</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agreements.length ? agreements.map((agreement: any) => (
            <div key={agreement.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
              {(() => {
                const terms = agreement.terms_json ?? {};
                const linkedDocument = (terms.contract_document_id && contractDocumentIdMap.get(terms.contract_document_id)) || contractDocumentMap.get(agreement.case_id);
                return (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{agreement.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <p>{agreement.fixed_amount != null ? `고정금액 ${formatCurrency(agreement.fixed_amount)}` : '고정금액 없음'}</p>
                    <p>{agreement.rate != null ? `비율 ${agreement.rate}%` : '비율 미지정'}</p>
                    <p>적용 {formatDate(agreement.effective_from)} ~ {formatDate(agreement.effective_to)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <div className="flex items-center gap-2">
                    <Badge tone={agreement.is_active ? 'green' : 'slate'}>{agreement.is_active ? '활성' : '비활성'}</Badge>
                    <Badge tone="blue">{agreementLabel(agreement.agreement_type)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/cases/${agreement.case_id}?tab=billing`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
                      사건 비용 탭
                    </Link>
                    {linkedDocument ? (
                      <Link
                        href={`/api/documents/${linkedDocument.id}/download` as Route}
                        className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                      >
                        계약서 다운받기
                      </Link>
                    ) : null}
                    <Link
                      href={`/api/contracts/${agreement.id}/receipt` as Route}
                      className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                    >
                      체결 기록 다운받기
                    </Link>
                  </div>
                </div>
              </div>
                );
              })()}
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              표시할 계약이 없습니다. 사건 화면의 비용 탭에서 비용 약정을 먼저 등록해 주세요.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="vs-mesh-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>계약 체결 현황</CardTitle>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                {contractExecutionItems.length}건
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {contractExecutionItems.length ? contractExecutionItems.map((agreement: any) => {
            const terms = agreement.terms_json ?? {};
            const contractDocument = (terms.contract_document_id && contractDocumentIdMap.get(terms.contract_document_id)) || contractDocumentMap.get(agreement.case_id);
            return (
              <div key={`${agreement.id}:execution`} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{agreement.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{agreement.cases?.title ?? '사건'} · {agreement.targetLabel}</p>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>계약서 · {terms.contract_document_title ?? contractDocument?.title ?? '등록된 계약서'}</p>
                      <p>공유 상태 · {terms.sent_to_client ? '의뢰인 공유' : '내부 보관'}</p>
                      <p>동의 방법 · {signatureMethodLabel(terms.signature_method)}</p>
                      <p>서명 요청 · {terms.signature_request ? '보냄' : '없음'}</p>
                      {terms.signature_request ? <p>현재 상태 · {signatureStatusLabel(terms.signature_status)}</p> : null}
                      {terms.signature_completed_at ? <p>동의 시각 · {formatDateTime(terms.signature_completed_at)}</p> : null}
                      {Array.isArray(terms.signature_logs) && terms.signature_logs.length ? <p>동의 기록 · {terms.signature_logs.length}회</p> : null}
                      {terms.billing_intent ? <p>금액 분류 · {terms.billing_intent === 'receivable' ? '받아야 할 금액' : terms.billing_intent === 'received' ? '이미 받은 금액' : terms.billing_intent === 'installment_pending' ? '비용입금 미확인 분납계약' : '별도 분류 없음'}</p> : null}
                      {terms.sender_snapshot?.organization_name ? <p>갑 · {terms.sender_snapshot.organization_name}</p> : null}
                      {terms.sender_snapshot?.representative_name ? <p>대표자 · {terms.sender_snapshot.representative_name}</p> : null}
                      {terms.sender_snapshot?.registration_number ? <p>등록번호 · {terms.sender_snapshot.registration_number}</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {contractDocument ? (
                      <Link
                        href={`/api/documents/${contractDocument.id}/download` as Route}
                        className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                      >
                        계약서 다운받기
                      </Link>
                    ) : null}
                    <Link
                      href={`/api/contracts/${agreement.id}/receipt` as Route}
                      className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                    >
                      체결 기록 다운받기
                    </Link>
                    <Link href={`/portal/cases/${agreement.case_id}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
                      의뢰인 화면 보기
                    </Link>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              아직 의뢰인에게 공유되었거나 서명 요청이 걸린 계약이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <CollapsibleSettingsSection
        title="계약서 업데이트하기"
        description="새 계약서를 올리고 AI 스캔으로 내용을 채운 뒤 계약 목록과 계약 체결 현황에 함께 등록합니다."
      >
        <ContractUpdatePanel cases={caseOptions} organizationProfile={organizationProfile} />
      </CollapsibleSettingsSection>
    </div>
  );
}
