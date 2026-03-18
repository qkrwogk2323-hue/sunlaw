import Link from 'next/link';
import type { Route } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAccessibleOrganizations, listOrganizationMemberships } from '@/lib/queries/organizations';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCollaborationOverview } from '@/lib/queries/collaboration-hubs';

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

export default async function OrganizationsPage() {
  const auth = await requireAuthenticatedUser();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const [organizations, memberships, collaboration] = await Promise.all([
    listAccessibleOrganizations(),
    listOrganizationMemberships(),
    getCollaborationOverview(currentOrganizationId)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 찾기</h1>
        <p className="mt-2 text-sm text-slate-600">협업할 상대 조직을 찾고, 제안 현황과 승인된 업무 허브까지 한 번에 관리합니다.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>협업 가능한 조직</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.length ? (
              organizations.map((organization: any) => {
                const role = memberships.find((membership: any) => membership.organization_id === organization.id)?.role ?? 'accessible';
                const isCurrentOrganization = organization.id === currentOrganizationId;
                return (
                  <Link key={organization.id} href={`/organizations/${organization.id}` as Route} className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-900 hover:bg-slate-50/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{organization.name}</p>
                          {isCurrentOrganization ? <Badge tone="green">현재 조직</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{organization.business_number ?? '사업자번호 미등록'} · {organization.slug}</p>
                      </div>
                      <Badge tone="blue">{role}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">조직 소개와 최근 사건을 확인하고, 제안서 작성 또는 승인 대기 현황을 바로 볼 수 있습니다.</p>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">표시할 조직이 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>내가 보낸 제안</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {collaboration.outboundRequests.length ? (
                collaboration.outboundRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{request.targetOrganization?.name ?? '상대 조직'} · {request.title}</p>
                      <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                    </div>
                    {request.proposalNote ? <p className="mt-2 text-sm text-slate-600 line-clamp-3">{request.proposalNote}</p> : null}
                    <p className="mt-2 text-xs text-slate-400">{new Date(request.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">아직 보낸 협업 제안이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>열린 업무 허브</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {collaboration.activeHubs.length ? (
                collaboration.activeHubs.map((hub) => (
                  <Link key={hub.id} href={`/inbox/${hub.id}` as Route} className="block rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{hub.partnerOrganization?.name ?? '협업 조직'} 허브</p>
                      <Badge tone="green">활성</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{hub.lastMessageBody ?? hub.summary ?? '아직 첫 메시지가 없습니다.'}</p>
                    <p className="mt-2 text-xs text-slate-400">{hub.lastMessageCaseTitle ? `연결 사건: ${hub.lastMessageCaseTitle}` : '사건 미연결'}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">승인되어 열린 업무 허브가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
