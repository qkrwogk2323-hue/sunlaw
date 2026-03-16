import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { requirePlatformAdmin } from '@/lib/auth';
import { listOrganizationSignupRequests } from '@/lib/queries/organization-requests';
import { reviewOrganizationSignupRequestAction } from '@/lib/actions/organization-actions';
import { formatBusinessNumber, formatDateTime } from '@/lib/format';

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

const statusLabels: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인 완료',
  rejected: '반려 완료',
  cancelled: '취소됨'
};

const statusTones: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate'
};

function getReviewPriority(request: any) {
  if (request.status !== 'pending') return null;
  if (request.business_registration_verification_status === 'mismatch') return { label: '우선 확인', tone: 'red' as const };
  if (request.business_registration_verification_status === 'unreadable') return { label: '수기 확인 필요', tone: 'amber' as const };
  if (request.business_registration_verification_status === 'matched') return { label: '자동 일치', tone: 'green' as const };
  return { label: '검토 대기', tone: 'slate' as const };
}

export default async function OrganizationRequestsPage() {
  await requirePlatformAdmin();
  const requests = (await listOrganizationSignupRequests()).sort((left: any, right: any) => {
    const priority = { mismatch: 0, unreadable: 1, matched: 2, pending_review: 3 } as Record<string, number>;
    const leftPriority = priority[left.business_registration_verification_status] ?? 9;
    const rightPriority = priority[right.business_registration_verification_status] ?? 9;
    if (left.status === 'pending' && right.status !== 'pending') return -1;
    if (left.status !== 'pending' && right.status === 'pending') return 1;
    if (left.status === 'pending' && right.status === 'pending' && leftPriority !== rightPriority) return leftPriority - rightPriority;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 신청 관리</h1>
        <p className="mt-2 text-sm text-slate-600">조직 개설 신청을 검토하고 승인 또는 반려하세요.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>신청 목록</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {requests.length ? requests.map((request: any) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{request.organization_name}</p>
                  <p className="mt-1 text-sm text-slate-500">신청자: {request.requester?.full_name ?? '-'} · {request.requester_email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {getReviewPriority(request) ? <Badge tone={getReviewPriority(request)!.tone}>{getReviewPriority(request)!.label}</Badge> : null}
                  <Badge tone={statusTones[request.status] ?? 'slate'}>{statusLabels[request.status] ?? request.status}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={verificationTones[request.business_registration_verification_status] ?? 'slate'}>
                  문서 대조 {verificationLabels[request.business_registration_verification_status] ?? request.business_registration_verification_status ?? '-'}
                </Badge>
                {request.business_registration_verified_number ? <Badge tone="blue">추출 번호 {formatBusinessNumber(request.business_registration_verified_number)}</Badge> : null}
              </div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                <p>조직 유형: {request.organization_kind ?? '-'}</p>
                <p>사업자등록번호: {formatBusinessNumber(request.business_number)}</p>
                <p>대표자: {request.representative_name ?? '-'} / {request.representative_title ?? '-'}</p>
                <p>전화: {request.contact_phone ?? '-'}</p>
                <p>웹사이트: {request.website_url ?? '-'}</p>
                <p>요청 모듈: {Array.isArray(request.requested_modules) ? request.requested_modules.join(', ') || '-' : '-'}</p>
                <p>
                  제출 문서: {request.business_registration_document_name ? (
                    <a href={`/api/organization-signup-requests/${request.id}/document`} className="font-medium text-slate-900 underline underline-offset-4">
                      {request.business_registration_document_name}
                    </a>
                  ) : '-'}
                </p>
                <p>신청 시각: {formatDateTime(request.created_at)}</p>
                {request.approvedOrganization ? <p>승인 조직: {request.approvedOrganization.name}</p> : null}
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">자동 대조 메모</p>
                <p className="mt-1 leading-6">{request.business_registration_verification_note ?? '-'}</p>
                <p className="mt-3 font-medium text-slate-900">신청 메모</p>
                <p className="mt-1 leading-6">{request.note ?? '-'}</p>
              </div>
              {request.status === 'pending' ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={reviewOrganizationSignupRequestAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <textarea name="reviewNote" placeholder="승인 메모" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <SubmitButton pendingLabel="승인 중...">승인하고 조직 생성</SubmitButton>
                  </form>
                  <form action={reviewOrganizationSignupRequestAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <textarea name="reviewNote" placeholder="반려 사유" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <SubmitButton variant="destructive" pendingLabel="반려 중...">반려하기</SubmitButton>
                  </form>
                </div>
              ) : request.reviewed_note ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">검토 메모</p>
                  <p className="mt-1 leading-6">{request.reviewed_note}</p>
                </div>
              ) : null}
            </div>
          )) : <p className="text-sm text-slate-500">신청 내역이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
