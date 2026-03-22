import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { SupportRequestForm } from '@/components/forms/support-request-form';
import { updatePlatformSupportTicketAction } from '@/lib/actions/support-actions';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser, isManagementRole } from '@/lib/auth';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { listPlatformSupportTickets, listSupportRequests } from '@/lib/queries/support';
import { beginSupportSessionAction, decideSupportRequestAction } from '@/lib/actions/support-actions';
import { formatDateTime } from '@/lib/format';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';

export default async function SupportPage() {
  const auth = await requireAuthenticatedUser();
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);
  const isOrgManager = auth.memberships.some((membership) => isManagementRole(membership.role));

  if (!isPlatformAdmin && !isOrgManager) {
    return (
      <AccessDeniedBlock
        blocked="지원 요청 관리 접근이 차단되었습니다."
        cause="현재 계정은 플랫폼 관리자 또는 조직 관리자 권한이 아닙니다."
        resolution="플랫폼 조직 관리자 권한으로 전환하거나, 조직 오너/매니저 권한 승인을 요청해 주세요."
      />
    );
  }

  const [organizations, requests, tickets] = await Promise.all([
    isPlatformAdmin ? listAccessibleOrganizations({ includeAll: true }) : Promise.resolve([]),
    listSupportRequests(),
    isPlatformAdmin ? listPlatformSupportTickets() : Promise.resolve([])
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">지원 요청 관리</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 관리자가 문제를 확인해야 할 때 조직 승인 후 한시적으로 지원 접속을 진행하는 화면입니다.</p>
      </div>

      {isPlatformAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>고객센터 접수함</CardTitle>
            <p className="text-sm text-slate-600">사용자조직과 의뢰인이 플랫폼 운영팀에 보낸 문의, 요청, 의견, 오류 신고를 이 화면에서 처리합니다.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tickets.length ? tickets.map((ticket: any) => (
              <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{ticket.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{ticket.requester_name_snapshot} · {ticket.requester_email_snapshot} · {ticket.organization_name_snapshot ?? '개인 문의'}</p>
                  </div>
                  <Badge tone={ticket.status === 'received' ? 'amber' : ticket.status === 'in_review' ? 'blue' : ticket.status === 'answered' ? 'green' : 'slate'}>
                    {ticket.status === 'received' ? '접수됨' : ticket.status === 'in_review' ? '검토 중' : ticket.status === 'answered' ? '답변 완료' : '종료'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{ticket.body}</p>
                <p className="mt-3 text-xs text-slate-400">접수 {formatDateTime(ticket.created_at)}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { status: 'in_review', label: '검토 중으로 변경' },
                    { status: 'answered', label: '답변 완료로 변경' },
                    { status: 'closed', label: '종료로 변경' }
                  ].map((option) => (
                    <ClientActionForm
                      key={option.status}
                      action={updatePlatformSupportTicketAction}
                      successTitle="고객센터 상태가 갱신되었습니다."
                      errorTitle="고객센터 상태 변경에 실패했습니다."
                      errorCause="처리 대상 문의를 찾지 못했거나 상태 저장에 실패했습니다."
                      errorResolution="목록을 새로고침한 뒤 다시 시도해 주세요."
                      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <input type="hidden" name="status" value={option.status} />
                      <textarea name="handledNote" placeholder="운영팀 메모 또는 답변" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <SubmitButton pendingLabel="저장 중...">{option.label}</SubmitButton>
                    </ClientActionForm>
                  ))}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">접수된 고객센터 문의가 없습니다.</p>}
          </CardContent>
        </Card>
      ) : null}

      {isPlatformAdmin ? (
        <CollapsibleSettingsSection
          title="지원 접속 요청 생성"
          description="플랫폼이 조직 화면에 한시적으로 들어가야 할 때만 열어서 요청을 만듭니다."
        >
            <SupportRequestForm organizations={organizations.map((organization: any) => ({ id: organization.id, name: organization.name }))} />
        </CollapsibleSettingsSection>
      ) : null}

      <Card>
        <CardHeader><CardTitle>지원 접속 요청 목록</CardTitle></CardHeader>
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
                    <ClientActionForm
                      action={decideSupportRequestAction}
                      successTitle="지원 요청이 승인되었습니다."
                      successMessage="플랫폼 관리자가 지원 접속을 진행할 수 있습니다."
                      errorTitle="승인 처리에 실패했습니다."
                      errorCause="이미 처리된 요청이거나 승인 상태 저장에 실패했습니다."
                      errorResolution="요청 상태를 새로고침하고 다시 시도해 주세요."
                      className="space-y-3 rounded-xl border border-slate-200 p-4"
                    >
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <textarea name="approvalNote" placeholder="승인 메모" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <SubmitButton pendingLabel="승인 중...">승인</SubmitButton>
                    </ClientActionForm>
                    <ClientActionForm
                      action={decideSupportRequestAction}
                      successTitle="지원 요청이 반려되었습니다."
                      errorTitle="반려 처리에 실패했습니다."
                      errorCause="이미 처리된 요청이거나 반려 상태 저장에 실패했습니다."
                      errorResolution="요청 상태를 새로고침하고 다시 시도해 주세요."
                      className="space-y-3 rounded-xl border border-slate-200 p-4"
                    >
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <textarea name="approvalNote" placeholder="반려 사유" className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      <SubmitButton variant="destructive" pendingLabel="반려 중...">반려</SubmitButton>
                    </ClientActionForm>
                  </div>
                ) : null}

                {canConsume ? (
                  <div className="mt-4">
                    <DangerActionButton
                      action={beginSupportSessionAction}
                      fields={{ requestId: request.id }}
                      confirmTitle="지원 접속을 시작할까요?"
                      confirmDescription={`'${request.target_name_snapshot}' 사용자 계정에 한시적으로 접속합니다. 모든 지원 접속은 감사 로그에 기록됩니다.`}
                      highlightedInfo={`${request.target_name_snapshot} · ${request.target_email_snapshot}`}
                      confirmLabel="지원 접속 시작"
                      variant="warning"
                      successTitle="지원 접속이 시작되었습니다."
                      successMessage="대시보드에서 지원 접속 상태가 표시됩니다."
                      errorTitle="지원 접속 시작에 실패했습니다."
                      errorCause="요청이 만료되었거나 이미 사용된 요청입니다."
                      errorResolution="요청 만료 시각을 확인하고, 필요하면 새 요청을 생성해 주세요."
                      buttonVariant="primary"
                    >
                      지원 접속 시작
                    </DangerActionButton>
                  </div>
                ) : null}
              </div>
            );
          }) : <p className="text-sm text-slate-500">지원 요청이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
