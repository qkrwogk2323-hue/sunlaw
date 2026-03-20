import { OrganizationSignupForm } from '@/components/forms/organization-signup-form';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cancelOrganizationSignupRequestAction } from '@/lib/actions/organization-actions';
import { getCurrentAuth } from '@/lib/auth';
import { formatBusinessNumber } from '@/lib/format';
import { listMySignupRequests } from '@/lib/queries/organizations';

export const dynamic = 'force-dynamic';

const verificationLabels: Record<string, string> = {
  matched: '자동 일치',
  mismatch: '불일치 후보',
  unreadable: '자동 판독 불가',
  pending_review: '검토 대기'
};

const verificationTones: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  matched: 'green',
  mismatch: 'red',
  unreadable: 'amber',
  pending_review: 'slate'
};

const requestStatusLabels: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인 완료',
  rejected: '반려 완료',
  cancelled: '취소됨'
};

const requestStatusTones: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate'
};

function getVerificationTone(status: string | null) {
  return status ? verificationTones[status] ?? 'slate' : 'slate';
}

function getVerificationLabel(status: string | null) {
  return status ? verificationLabels[status] ?? status : '-';
}

export default async function OrganizationRequestPage({ searchParams }: { searchParams?: Promise<{ submitted?: string; updated?: string; cancelled?: string; edit?: string; error?: string }> }) {
  const auth = await getCurrentAuth();
  let requests: Array<{
    id: string;
    organization_name: string;
    organization_kind: string;
    organization_industry: string | null;
    requester_email: string | null;
    business_number: string | null;
    representative_name: string | null;
    representative_title: string | null;
    contact_phone: string | null;
    website_url: string | null;
    requested_modules: string[] | null;
    status: string;
    business_registration_verification_status: string | null;
    business_registration_verification_note: string | null;
    business_registration_document_name: string | null;
    reviewed_note: string | null;
    note: string | null;
    created_at: string;
  }> = [];
  let requestHistoryUnavailable = false;

  if (auth) {
    try {
      requests = await listMySignupRequests();
    } catch (error) {
      requestHistoryUnavailable = true;
      console.error('Failed to render organization signup request history', error);
    }
  }

  const resolved = searchParams ? await searchParams : undefined;
  const submitted = resolved?.submitted;
  const updated = resolved?.updated;
  const cancelled = resolved?.cancelled;
  const error = resolved?.error;
  const editRequestId = resolved?.edit ?? null;
  const activePendingRequest = requests.find((request) => request.status === 'pending') ?? null;
  const editingRequest = editRequestId ? requests.find((request) => request.id === editRequestId && request.status === 'pending') ?? null : null;
  const showForm = Boolean(auth && (!activePendingRequest || editingRequest));

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">조직 개설 신청</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Vein Spiral은 조직 단위로 운영됩니다. 조직 개설 신청을 제출하면 운영팀이 검토 후 승인합니다.
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            사업자등록번호와 사업자등록증은 필수입니다. 자동 대조 결과는 참고용이며, 최종 판단은 운영팀이 검토합니다.
          </p>
        </div>

        {auth ? (
          <Card>
            <CardHeader><CardTitle>{editingRequest ? '조직 개설 신청 수정' : '조직 개설 신청서'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {submitted ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">신청이 완료되었습니다! 승인을 대기해주세요.</p> : null}
              {updated ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">신청 내용이 수정되었습니다. 승인 결과를 기다려 주세요.</p> : null}
              {cancelled ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">조직 생성 신청이 취소되었습니다.</p> : null}
              {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              {activePendingRequest && !editingRequest ? (
                <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">신청 대기 상태입니다.</p>
                    <p className="text-sm leading-7 text-slate-700">현재 제출한 조직 생성 신청이 운영팀 검토를 기다리고 있습니다. 필요하면 신청 내용을 수정하거나 취소할 수 있습니다.</p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">현재 신청명</p>
                    <p className="mt-1">{activePendingRequest.organization_name}</p>
                    <p className="mt-3 text-slate-500">사업자번호: {formatBusinessNumber(activePendingRequest.business_number)}</p>
                    <p className="text-slate-500">업종 상세: {activePendingRequest.organization_industry ?? '-'}</p>
                    <p className="text-slate-500">제출 문서: {activePendingRequest.business_registration_document_name ?? '-'}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a href={`/organization-request?edit=${activePendingRequest.id}`} className={buttonStyles({ className: 'min-h-11 rounded-[1rem] px-4' })}>수정하기</a>
                    <ClientActionForm action={cancelOrganizationSignupRequestAction} successTitle="조직 신청이 취소되었습니다.">
                      <input type="hidden" name="requestId" value={activePendingRequest.id} />
                      <SubmitButton variant="secondary" pendingLabel="취소 중..." className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-[1rem] px-4' })}>취소하기</SubmitButton>
                    </ClientActionForm>
                  </div>
                </div>
              ) : null}
              {showForm ? (
                <OrganizationSignupForm
                  requestId={editingRequest?.id}
                  defaultValues={editingRequest ? {
                    name: editingRequest.organization_name,
                    kind: editingRequest.organization_kind,
                    organizationIndustry: editingRequest.organization_industry,
                    businessNumber: editingRequest.business_number,
                    representativeName: editingRequest.representative_name,
                    representativeTitle: editingRequest.representative_title,
                    email: editingRequest.requester_email,
                    phone: editingRequest.contact_phone,
                    websiteUrl: editingRequest.website_url,
                    note: editingRequest.note
                  } : undefined}
                  existingDocumentName={editingRequest?.business_registration_document_name}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>로그인이 필요합니다.</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">조직 개설 신청은 로그인 후 제출할 수 있습니다.</p>
            </CardContent>
          </Card>
        )}

        {auth ? (
          <Card>
            <CardHeader><CardTitle>나의 신청 내역</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {requestHistoryUnavailable ? <p className="text-sm text-amber-700">신청 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : null}
              {(!requestHistoryUnavailable && requests.length) ? requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{request.organization_name}</p>
                    <Badge tone={requestStatusTones[request.status] ?? 'slate'}>{requestStatusLabels[request.status] ?? request.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={getVerificationTone(request.business_registration_verification_status)}>
                      {getVerificationLabel(request.business_registration_verification_status)}
                    </Badge>
                    <Badge tone="blue">사업자번호 {formatBusinessNumber(request.business_number)}</Badge>
                  </div>
                  <p className="mt-3 text-slate-500">자동 대조 메모: {request.business_registration_verification_note ?? '-'}</p>
                  <p className="text-slate-500">업종 상세: {request.organization_industry ?? '-'}</p>
                  <p className="text-slate-500">
                    제출 문서: {request.business_registration_document_name ? (
                      <a href={`/api/organization-signup-requests/${request.id}/document`} className="font-medium text-slate-900 underline underline-offset-4">
                        {request.business_registration_document_name}
                      </a>
                    ) : '-'}
                  </p>
                  <p className="text-slate-500">메모: {request.reviewed_note ?? request.note ?? '-'}</p>
                </div>
              )) : null}
              {!requestHistoryUnavailable && !requests.length ? <p className="text-sm text-slate-500">아직 제출한 신청이 없습니다.</p> : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
