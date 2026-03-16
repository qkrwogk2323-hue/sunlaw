import { OrganizationSignupForm } from '@/components/forms/organization-signup-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentAuth } from '@/lib/auth';
import { formatBusinessNumber } from '@/lib/format';
import { listMySignupRequests } from '@/lib/queries/organizations';

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

export default async function OrganizationRequestPage({ searchParams }: { searchParams?: Promise<{ submitted?: string }> }) {
  const auth = await getCurrentAuth();
  const requests = auth ? await listMySignupRequests() : [];
  const submitted = searchParams ? (await searchParams).submitted : undefined;

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
            <CardHeader><CardTitle>조직 개설 신청서</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {submitted ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">조직 개설 신청이 접수되었습니다.</p> : null}
              <OrganizationSignupForm />
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
              {requests.length ? requests.map((request: any) => (
                <div key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{request.organization_name}</p>
                    <Badge tone={requestStatusTones[request.status] ?? 'slate'}>{requestStatusLabels[request.status] ?? request.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={verificationTones[request.business_registration_verification_status] ?? 'slate'}>
                      {verificationLabels[request.business_registration_verification_status] ?? request.business_registration_verification_status ?? '-'}
                    </Badge>
                    <Badge tone="blue">사업자번호 {formatBusinessNumber(request.business_number)}</Badge>
                  </div>
                  <p className="mt-3 text-slate-500">자동 대조 메모: {request.business_registration_verification_note ?? '-'}</p>
                  <p className="text-slate-500">
                    제출 문서: {request.business_registration_document_name ? (
                      <a href={`/api/organization-signup-requests/${request.id}/document`} className="font-medium text-slate-900 underline underline-offset-4">
                        {request.business_registration_document_name}
                      </a>
                    ) : '-'}
                  </p>
                  <p className="text-slate-500">메모: {request.reviewed_note ?? request.note ?? '-'}</p>
                </div>
              )) : <p className="text-sm text-slate-500">아직 제출한 신청이 없습니다.</p>}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
