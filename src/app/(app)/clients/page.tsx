import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { ClientsActionPanels } from '@/components/clients-action-panels';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { listCases } from '@/lib/queries/cases';
import { listClientRosterSummary } from '@/lib/queries/clients';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { LogButton } from '@/components/ui/log-button';

function linkStatusTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === '연결 완료') return 'green';
  if (status === '연결 해제 대기') return 'amber';
  if (status === '연결 검토 중') return 'red';
  if (status === '연결 해제') return 'slate';
  return 'slate';
}

function statusTone(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('대기') || value.includes('발송')) return 'amber' as const;
  if (value.includes('미연결') || value.includes('미발송') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string; issuedClientLoginId?: string; issuedOrgName?: string; q?: string; clientInviteBatch?: string; clientInviteFailed?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManage = Boolean(
    organizationId
    && membership
    && isManagementRole(membership.role)
    && hasPermission(auth, organizationId, 'user_manage')
  );

  const [roster, cases, resolvedSearchParams, cookieStore] = await Promise.all([
    listClientRosterSummary(organizationId),
    canManage && organizationId ? listCases(organizationId) : Promise.resolve([]),
    searchParams ? searchParams : Promise.resolve(undefined),
    cookies()
  ]);
  const inviteToken = resolvedSearchParams?.invite;
  const queryFilter = `${resolvedSearchParams?.q ?? ''}`.trim().toLowerCase();
  const issuedClientLoginId = resolvedSearchParams?.issuedClientLoginId;
  const issuedClientTempPassword = cookieStore.get('_vs_issued_pw')?.value ?? null;
  const clientInviteSummaryRaw = cookieStore.get('_vs_client_invite_summary')?.value ?? null;
  const issuedOrgName = resolvedSearchParams?.issuedOrgName ?? (organizationId ? (auth.memberships.find((membership) => membership.organization_id === organizationId)?.organization?.name ?? '현재 조직') : '현재 조직');
  const clientInviteSummary = (() => {
    if (!clientInviteSummaryRaw) return null;
    try {
      return JSON.parse(decodeURIComponent(clientInviteSummaryRaw)) as {
        caseId: string;
        caseTitle: string;
        created: Array<{ name: string; email: string; relationLabel: string | null; caseClientId: string; url: string }>;
        failed: Array<{ name: string; email: string; reason: string }>;
      };
    } catch {
      return null;
    }
  })();
  const filteredRoster = roster.filter((item: any) => {
    if (!queryFilter) return true;
    const haystack = `${item.name ?? ''} ${item.email ?? ''} ${item.contactPhone ?? ''} ${item.addressSummary ?? ''}`.toLowerCase();
    return haystack.includes(queryFilter);
  });

  function renderRosterCard(item: any) {
    const details = [
      item.residentNumberMasked ? `주민번호 ${item.residentNumberMasked}` : null,
      item.contactPhone ? `연락처 ${item.contactPhone}` : null,
      item.addressSummary ? item.addressSummary : null,
    ].filter(Boolean).join(' · ');
    return (
      <div key={item.id} className="relative rounded-xl border border-slate-200 bg-white p-3.5 hover:border-sky-300 transition-colors">
        <Link
          href={`/clients/${item.clientKey ?? item.id}` as Route}
          className="absolute inset-0 rounded-xl"
          aria-label={`${item.name} 상세보기`}
        />
        {/* row 1: name + badges */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{item.name}</span>
          <Badge tone={linkStatusTone(item.caseLinkStatus)}>{item.caseLinkStatus}</Badge>
          {item.overdueCount > 0 && <Badge tone="red">미납 {item.overdueCount}건</Badge>}
          {item.caseCount > 0 && <Badge tone="blue">사건 {item.caseCount}건</Badge>}
        </div>
        {/* row 2: compact details */}
        {details ? (
          <p className="relative z-10 mt-1 truncate text-xs text-slate-500">{details}</p>
        ) : null}
        {canManage && item.source === 'invite' && item.invitationId ? (
          <div className="relative z-20 mt-2">
            <ResendInvitationForm invitationId={item.invitationId} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">의뢰인 관리</h1>
        <p className="mt-2 text-sm text-slate-600">이름보다 상태를 먼저 확인해 가입, 초대, 사건 연결을 운영합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {canManage && organizationId && (
            <LogButton
              organizationId={organizationId}
              surface="clients"
              label="의뢰인 기록"
              title="의뢰인 계정·초대 기록"
              description="의뢰인 임시계정 발급·폐기, 초대 생성 등 의뢰인 관리 이력입니다."
            />
          )}
          <Link href={'/clients/history?tab=profiles' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            의뢰인 정보 변경 기록 보기
          </Link>
          <Link href={'/clients/history?tab=requests' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            의뢰인 연결 요청 기록 보기
          </Link>
        </div>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-semibold">✅ 초대 링크가 생성되었습니다</p>
          <p className="mt-1 text-xs text-emerald-700">아래 링크를 복사해서 의뢰인에게 전달하세요. 이 화면을 벗어나면 다시 확인할 수 없습니다.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3">
            <code className="flex-1 select-all font-mono text-sm text-slate-900">{`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${inviteToken}`}</code>
          </div>
        </div>
      ) : null}

      {issuedClientLoginId && issuedClientTempPassword ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            {issuedOrgName}에서 초대했어요! 임시아이디 : <code className="font-mono">{issuedClientLoginId}</code> 비밀번호 : <code className="font-mono">{issuedClientTempPassword}</code>, 조직명 : <code className="font-mono">{issuedOrgName}</code>
          </p>
          <p className="mt-1 text-xs text-amber-700">로그인하시고 아이디와 비밀번호를 수정해주세요.</p>
        </div>
      ) : null}

      {canManage ? (
        <ClientsActionPanels
          organizationId={organizationId!}
          cases={cases.map((item: any) => ({ id: item.id, title: item.title, referenceNo: item.reference_no ?? null }))}
          roster={roster}
        />
      ) : null}

      <div className="space-y-6">
          {clientInviteSummary?.created?.length ? (
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardHeader>
                <CardTitle>최근 초대 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm md:grid-cols-4">
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-emerald-700">완료</p>
                    <p className="mt-1 font-semibold">{clientInviteSummary.created.length}건</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-emerald-700">실패</p>
                    <p className="mt-1 font-semibold">{clientInviteSummary.failed.length}건</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-emerald-700">연결 사건</p>
                    <p className="mt-1 font-semibold">{clientInviteSummary.caseTitle}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-xs text-emerald-700">바로가기</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Link href={`/cases/${clientInviteSummary.caseId}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-2 text-[11px]' })}>
                        사건
                      </Link>
                      <Link href={`/case-hubs?caseId=${clientInviteSummary.caseId}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-2 text-[11px]' })}>
                        허브
                      </Link>
                    </div>
                  </div>
                </div>
                {clientInviteSummary.failed.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="mb-2 font-semibold">실패 사유</p>
                    {clientInviteSummary.failed.map((item) => (
                      <p key={`${item.email}:${item.reason}`}>{item.name} · {item.email} · {item.reason}</p>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>의뢰인 목록</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <UnifiedListSearch
                action="/clients"
                defaultValue={queryFilter}
                placeholder="의뢰인 이름, 이메일, 연락처 검색"
                ariaLabel="의뢰인 목록 검색"
                hiddenFields={{
                  invite: inviteToken ?? '',
                  issuedClientLoginId: issuedClientLoginId ?? '',
                  issuedOrgName: issuedOrgName ?? ''
                }}
              />
              {filteredRoster.length ? (
                <CollapsibleList
                  label="의뢰인"
                  totalCount={filteredRoster.length}
                  visibleContent={filteredRoster.slice(0, 7).map(renderRosterCard)}
                  hiddenContent={filteredRoster.slice(7).map(renderRosterCard)}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">의뢰인 데이터가 없습니다.</p>
                  <p className="mt-2 text-sm text-slate-500">상단 작업 버튼에서 기본 초대, 임시 계정 발급, CSV 등록 중 필요한 방식으로 첫 의뢰인을 등록해 주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
