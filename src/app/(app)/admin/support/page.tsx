import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { SupportRequestForm } from '@/components/forms/support-request-form';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser, isManagementRole } from '@/lib/auth';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { listSupportRequests } from '@/lib/queries/support';
import { beginSupportSessionAction, decideSupportRequestAction } from '@/lib/actions/support-actions';
import { formatDateTime } from '@/lib/format';

export default async function SupportPage() {
  const auth = await requireAuthenticatedUser();
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);
  const isOrgManager = auth.memberships.some((membership) => isManagementRole(membership.role));

  if (!isPlatformAdmin && !isOrgManager) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        이 페이지는 플랫폼 관리자 또는 조직 오너/매니저만 접근할 수 있습니다.
      </div>
    );
  }

  const [organizations, requests] = await Promise.all([
    isPlatformAdmin ? listAccessibleOrganizations({ includeAll: true }) : Promise.resolve([]),
    listSupportRequests()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">지원 요청 관리</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 관리자가 문제를 확인해야 할 때 조직 승인 후 한시적으로 지원 접속을 진행하는 화면입니다.</p>
      </div>

      {isPlatformAdmin ? (
        <Card>
          <CardHeader><CardTitle>지원 접속 요청 생성</CardTitle></CardHeader>
          <CardContent>
            <SupportRequestForm organizations={organizations.map((organization: any) => ({ id: organization.id, name: organization.name }))} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>요청 목록</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {requests.length ? requests.map((request: any) => {
            const membership = auth.memberships.find((item) => item.organization_id === request.organization_id) ?? null;
            const canApprove = membership && isManagementRole(membership.role) && request.status === 'pending';
            const canConsume = isPlatformAdmin && request.status === 'approved';

            return (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{request.target_name_snapshot} · {request.target_email_snapshot}</p>
                    <p className="mt-1 text-sm text-slate-500">조직: {request.organization_name_snapshot}</p>
                  </div>
                  <Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : request.status === 'consumed' ? 'blue' : 'amber'}>
                    {request.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>요청자: {request.requested_by_name}</p>
                  <p>사유: {request.reason}</p>
                  <p>요청 시각: {formatDateTime(request.created_at)}</p>
                  <p>만료 시각: {formatDateTime(request.expires_at)}</p>
                  <p>승인자: {request.approved_by_name ?? '-'}</p>
                  <p>승인 메모: {request.approval_note ?? '-'}</p>
                </div>

                {canApprove ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <form action={decideSupportRequestAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <textarea name="approvalNote" placeholder="승인 메모" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <SubmitButton pendingLabel="승인 중...">승인</SubmitButton>
                    </form>
                    <form action={decideSupportRequestAction} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <textarea name="approvalNote" placeholder="반려 사유" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <SubmitButton variant="destructive" pendingLabel="반려 중...">반려</SubmitButton>
                    </form>
                  </div>
                ) : null}

                {canConsume ? (
                  <form action={beginSupportSessionAction} className="mt-4">
                    <input type="hidden" name="requestId" value={request.id} />
                    <SubmitButton pendingLabel="접속 시작 중...">지원 접속 시작</SubmitButton>
                  </form>
                ) : null}
              </div>
            );
          }) : <p className="text-sm text-slate-500">지원 요청이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
