import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollaborationRequestForm } from '@/components/forms/collaboration-request-form';
import { CollaborationRejectForm, CollaborationReviewForm } from '@/components/forms/collaboration-review-form';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getCollaborationOverview } from '@/lib/queries/collaboration-hubs';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';

function requestStatusTone(status: string) {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  return 'amber';
}

function requestStatusLabel(status: string) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려';
  if (status === 'withdrawn') return '철회';
  return '검토 대기';
}

function isManagementRole(role?: string | null) {
  return role === 'org_owner' || role === 'org_manager';
}

export default async function OrganizationDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ organizationId: string }>;
  searchParams?: Promise<{ invite?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const currentMembership = auth.memberships.find((membership) => membership.organization_id === currentOrganizationId) ?? null;
  const canManageCurrentOrganization = isManagementRole(currentMembership?.role);
  const { organizationId } = await params;
  const query = searchParams ? await searchParams : undefined;

  const [workspace, collaboration] = await Promise.all([
    getOrganizationWorkspace(organizationId),
    getCollaborationOverview(currentOrganizationId)
  ]);

  if (!workspace) {
    notFound();
  }

  const isCurrentOrganizationPage = organizationId === currentOrganizationId;
  const linkedHub = collaboration.activeHubs.find((hub) => hub.partnerOrganization?.id === organizationId) ?? null;
  const relatedOutboundRequest = collaboration.outboundRequests.find((request) => request.targetOrganizationId === organizationId) ?? null;
  const relatedInboundRequests = collaboration.inboundRequests.filter((request) => (isCurrentOrganizationPage ? true : request.sourceOrganizationId === organizationId));
  const defaultProposalTitle = `${workspace.organization.name}와 사건 협업 허브 제안`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{workspace.organization.name}</h1>
          <p className="mt-2 text-sm text-slate-600">슬러그: {workspace.organization.slug}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
          </div>
        </div>
        {linkedHub ? (
          <Link href={`/inbox/${linkedHub.id}` as Route} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
            업무 허브 열기
          </Link>
        ) : null}
      </div>

      {query?.invite ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크 토큰: <span className="font-mono">{query.invite}</span>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>조직 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>사업자등록번호: {workspace.organization.business_number ?? '-'}</p>
            <p>대표자: {workspace.organization.representative_name ?? '-'}</p>
            <p>대표 이메일: {workspace.organization.email ?? '-'}</p>
            <p>대표 전화: {workspace.organization.phone ?? '-'}</p>
            <p>주소: {workspace.organization.address_line1 ?? '-'} {workspace.organization.address_line2 ?? ''}</p>
            <p>사건 수: {workspace.caseCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isCurrentOrganizationPage ? '승인하기' : '제안하기'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCurrentOrganizationPage ? (
              relatedInboundRequests.length ? (
                relatedInboundRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{request.sourceOrganization?.name ?? '상대 조직'} · {request.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(request.createdAt)}</p>
                      </div>
                      <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                    </div>
                    {request.proposalNote ? <p className="mt-3 text-sm leading-6 text-slate-700">{request.proposalNote}</p> : null}
                    {request.status === 'pending' && currentOrganizationId && canManageCurrentOrganization ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <CollaborationReviewForm requestId={request.id} organizationId={currentOrganizationId} returnPath={`/organizations/${organizationId}`} />
                        <CollaborationRejectForm requestId={request.id} organizationId={currentOrganizationId} returnPath={`/organizations/${organizationId}`} />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">아직 들어온 협업 제안이 없습니다.</p>
              )
            ) : linkedHub ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">이미 승인된 업무 허브가 열려 있습니다.</p>
                  <Badge tone="green">활성</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{linkedHub.summary ?? '이제 허브에서 담당자 초대, 의뢰인 초대, 사건 연결, 대화를 이어갈 수 있습니다.'}</p>
                <Link href={`/inbox/${linkedHub.id}` as Route} className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                  허브로 이동
                </Link>
              </div>
            ) : relatedOutboundRequest ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">이미 보낸 제안이 있습니다.</p>
                  <Badge tone={requestStatusTone(relatedOutboundRequest.status)}>{requestStatusLabel(relatedOutboundRequest.status)}</Badge>
                </div>
                {relatedOutboundRequest.proposalNote ? <p className="mt-3 text-sm text-slate-600">{relatedOutboundRequest.proposalNote}</p> : null}
                {relatedOutboundRequest.responseNote ? <p className="mt-2 text-sm text-slate-500">응답 메모: {relatedOutboundRequest.responseNote}</p> : null}
              </div>
            ) : currentOrganizationId && canManageCurrentOrganization ? (
              <CollaborationRequestForm
                sourceOrganizationId={currentOrganizationId}
                targetOrganizationId={organizationId}
                defaultTitle={defaultProposalTitle}
                returnPath={`/organizations/${organizationId}`}
              />
            ) : (
              <p className="text-sm text-slate-500">현재 조직 관리 권한이 있어야 협업 제안을 보낼 수 있습니다.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>구성원</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">이름</th>
                  <th className="py-2">이메일</th>
                  <th className="py-2">역할</th>
                  <th className="py-2">직함</th>
                </tr>
              </thead>
              <tbody>
                {workspace.members.map((member: any) => (
                  <tr key={member.id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-3">{member.profile?.full_name ?? '-'}</td>
                    <td className="py-3">{member.profile?.email ?? '-'}</td>
                    <td className="py-3"><Badge tone="blue">{member.role}</Badge></td>
                    <td className="py-3">{member.title ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>협업 준비 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">제안서</p>
              <p className="mt-1 text-sm text-slate-600">상대 조직과 어떤 사건을 함께 운영할지, 허브에서 어떤 담당자와 의뢰인을 연결할지 미리 정리합니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">승인 후 업무 허브</p>
              <p className="mt-1 text-sm text-slate-600">승인되면 허브에서 대화, 담당자 초대, 의뢰인 초대, 사건 연결 흐름을 한곳에서 이어갑니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">사건 검색 연동</p>
              <p className="mt-1 text-sm text-slate-600">허브에서는 관련 사건을 검색해 상세 페이지로 이동하거나, 메시지에 사건을 직접 연결할 수 있습니다.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>최근 사건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.recentCases.length ? (
            workspace.recentCases.map((caseItem: any) => (
              <div key={caseItem.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{caseItem.title}</p>
                  <Badge tone="slate">{caseItem.case_status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{caseItem.reference_no ?? '-'}</span>
                  <span>{caseItem.case_type}</span>
                  <span>{formatCurrency(caseItem.principal_amount)}</span>
                  <span>{formatDateTime(caseItem.updated_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">등록된 사건이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
