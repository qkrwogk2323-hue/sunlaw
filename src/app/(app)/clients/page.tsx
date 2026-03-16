import Link from 'next/link';
import { deactivateClientPortalAccessAction } from '@/lib/actions/client-account-actions';
import { ClientAccessCaseLinkForm } from '@/components/forms/client-access-case-link-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { findMembership, getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { ClientAccessReviewForm } from '@/components/forms/client-access-review-form';
import { listClients } from '@/lib/queries/clients';
import { listOrganizationClientAccessRequests } from '@/lib/queries/client-access';
import { listCases } from '@/lib/queries/cases';
import { hasPermission } from '@/lib/permissions';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioClients } from '@/lib/platform-scenario-workspace';

function requestStatusLabel(status: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려됨';
  return '검토 대기';
}

export default async function ClientsPage() {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const isScenarioMode = Boolean(scenarioMode);
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManageRequests = Boolean(organizationId && membership && isManagementRole(membership.role) && hasPermission(auth, organizationId, 'user_manage'));
  const scenario = scenarioMode ? getPlatformScenarioClients(scenarioMode) : null;
  const [clients, accessRequests, cases] = isScenarioMode
    ? [scenario!.clients, scenario!.accessRequests, scenario!.cases]
    : await Promise.all([
        listClients(organizationId),
        organizationId && canManageRequests ? listOrganizationClientAccessRequests(organizationId) : Promise.resolve([]),
        organizationId && canManageRequests ? listCases(organizationId) : Promise.resolve([])
      ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">의뢰인 관리</h1>
        <p className="mt-2 text-sm text-slate-600">의뢰인 명부, 포털 활성화 상태, 연결 사건과 협업 요청을 함께 확인합니다.</p>
      </div>

      {canManageRequests || isScenarioMode ? (
        <Card className="vs-mesh-card">
          <CardHeader><CardTitle>협업 연결 요청</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {accessRequests.length ? accessRequests.map((request: any) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{request.requester_name}</p>
                    <p className="text-sm text-slate-500">{request.requester_email}</p>
                  </div>
                  <Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>{requestStatusLabel(request.status)}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>조직 키: {request.target_organization_key}</p>
                  <p>요청 메모: {request.request_note ?? '-'}</p>
                  {request.review_note ? <p>검토 메모: {request.review_note}</p> : null}
                </div>
                {request.status === 'pending' && !isScenarioMode ? (
                  <div className="mt-4">
                    <ClientAccessReviewForm requestId={request.id} organizationId={organizationId!} />
                  </div>
                ) : null}
                {request.status === 'approved' && !isScenarioMode ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-slate-600">승인된 의뢰인을 실제 사건에 연결하면 포털과 소통 흐름이 바로 이어집니다.</p>
                    {cases.length ? (
                      <ClientAccessCaseLinkForm requestId={request.id} organizationId={organizationId!} cases={cases} />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        먼저 사건을 만든 뒤 이 요청자를 연결할 수 있습니다.
                      </div>
                    )}
                  </div>
                ) : null}
                {isScenarioMode ? <p className="mt-4 text-sm text-slate-500">가상조직 시나리오에서는 최근 협업 요청과 처리 메모만 읽기 전용으로 표시합니다.</p> : null}
              </div>
            )) : <p className="text-sm text-slate-500">현재 들어온 협업 연결 요청이 없습니다.</p>}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>의뢰인 목록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {clients.length ? clients.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.client_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.client_email_snapshot ?? '-'} · {item.relation_label ?? '-'}</p>
                  <p className="mt-2 text-xs text-slate-400">사건: {item.cases?.title ?? '-'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.is_portal_enabled ? 'green' : 'slate'}>{item.is_portal_enabled ? '포털 활성' : '연락처만 등록'}</Badge>
                  <Link href={`/cases/${item.case_id}`} className="text-sm font-medium text-sky-700 underline underline-offset-4">사건 보기</Link>
                </div>
              </div>

              {item.is_portal_enabled ? (
                <form action={deactivateClientPortalAccessAction} className="mt-4">
                  <input type="hidden" name="caseClientId" value={item.id} />
                  <button type="submit" className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100">
                    연결 해제하고 재대기 전환
                  </button>
                </form>
              ) : null}
            </div>
          )) : <p className="text-sm text-slate-500">등록된 의뢰인이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
