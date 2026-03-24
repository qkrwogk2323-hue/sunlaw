import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
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

export default async function OrganizationsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const keyword = `${resolved?.q ?? ''}`.trim().toLowerCase();
  const [organizations, memberships, collaboration] = await Promise.all([
    listAccessibleOrganizations(),
    listOrganizationMemberships(),
    getCollaborationOverview(currentOrganizationId)
  ]);

  const filteredOrganizations = keyword
    ? organizations.filter((org: any) =>
        `${org.name ?? ''} ${org.slug ?? ''} ${org.business_number ?? ''}`.toLowerCase().includes(keyword)
      )
    : organizations;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 찾기</h1>
          <p className="mt-2 text-sm text-slate-600">협업할 상대 조직을 찾고, 제안 현황과 승인된 업무 허브까지 한 번에 관리합니다.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          조직을 찾았다면 제안을 보내고, 승인되면 열린 업무 허브로 바로 넘어가 실제 협업을 시작합니다.
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">1단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">상대 조직 찾기</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">조직명, 사업자번호, 슬러그로 찾고 상세 화면에서 제안 대상을 확인합니다.</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">2단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">협업 제안/승인</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">승인 대기와 내가 보낸 제안을 나눠 보고, 누가 무엇을 기다리는지 상태로 판단합니다.</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">3단계</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">열린 허브로 이동</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">승인된 협업은 열린 업무 허브에서 바로 이어집니다. 허브에서 사건과 일정, 메시지를 처리합니다.</p>
          </CardContent>
        </Card>
      </section>

      <UnifiedListSearch action="/organizations" placeholder="조직명, 사업자번호, 슬러그 검색..." ariaLabel="조직 검색" defaultValue={keyword} />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>협업 가능한 조직 {filteredOrganizations.length !== organizations.length ? <span className="text-sm font-normal text-slate-500">({filteredOrganizations.length}/{organizations.length})</span> : null}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredOrganizations.length ? (
              filteredOrganizations.map((organization: any) => {
                const role = memberships.find((membership: any) => membership.organization_id === organization.id)?.role ?? 'accessible';
                const isCurrentOrganization = organization.id === currentOrganizationId;
                return (
                  <Link key={organization.id} href={`/organizations/${organization.id}` as Route} className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-400 hover:bg-slate-50/70">
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
              <CardTitle>승인 대기 협업 제안</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {collaboration.inboundRequests.length ? (
                collaboration.inboundRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{request.sourceOrganization?.name ?? '상대 조직'} · {request.title}</p>
                      <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                    </div>
                    {request.proposalNote ? <p className="mt-2 text-sm text-slate-600 line-clamp-3">{request.proposalNote}</p> : null}
                    <p className="mt-2 text-xs text-slate-400">{new Date(request.createdAt).toLocaleString('ko-KR')}</p>
                    {request.sourceOrganizationId ? (
                      <Link href={`/organizations/${request.sourceOrganizationId}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-3 h-8 rounded-lg px-3 text-xs' })}>
                        상세 확인
                      </Link>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">현재 승인 대기 협업 제안이 없습니다.</p>
              )}
            </CardContent>
          </Card>

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
