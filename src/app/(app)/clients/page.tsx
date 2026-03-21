import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientStructuredInviteForm } from '@/components/forms/client-structured-invite-form';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { listCases } from '@/lib/queries/cases';
import { listClientRosterSummary } from '@/lib/queries/clients';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';

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
    return (
      <div key={item.id} className="relative rounded-xl border border-slate-200 p-4">
        <Link
          href={`/clients/${item.clientKey ?? item.id}` as Route}
          className="absolute inset-0 rounded-xl"
          aria-label={`${item.name} 상세보기`}
        />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">{item.name}</p>
            <p className="mt-1 text-sm text-slate-600">주민번호: <span className="font-medium text-slate-900">{item.residentNumberMasked ?? '-'}</span></p>
            <p className="mt-1 text-sm text-slate-600">주소: <span className="font-medium text-slate-900">{item.addressSummary ?? '-'}</span></p>
            <p className="mt-1 text-sm text-slate-600">연락처: <span className="font-medium text-slate-900">{item.contactPhone ?? '-'}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={item.caseId ? 'blue' : 'slate'}>{item.caseId ? '사건 연결' : '사건 미연결'}</Badge>
            <Badge tone="slate">의뢰인 상세 관리</Badge>
          </div>
        </div>
        {canManage && item.source === 'invite' && item.invitationId ? (
          <div className="relative z-20 mt-3">
            <ResendInvitationForm invitationId={item.invitationId} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">의뢰인 관리</h1>
        <p className="mt-2 text-sm text-slate-600">이름보다 상태를 먼저 확인해 가입, 초대, 사건 연결을 운영합니다.</p>
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

      {clientInviteSummary?.created?.length ? (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle>의뢰인 초대 완료</CardTitle>
            <p className="text-sm text-emerald-900">
              생성 {clientInviteSummary.created.length}건 · 사건 연결 {clientInviteSummary.created.length}건 · 발송 준비 {clientInviteSummary.created.length}건 · 실패 {clientInviteSummary.failed.length}건
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">연결 사건</p>
              <p className="mt-1 text-slate-600">{clientInviteSummary.caseTitle}</p>
            </div>
            {clientInviteSummary.created.map((item) => (
              <div key={`${item.email}:${item.url}`} className="rounded-xl border border-emerald-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </div>
                  <Badge tone="blue">{item.relationLabel ?? '의뢰인'}</Badge>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <code className="select-all text-xs text-slate-800">{item.url}</code>
                </div>
              </div>
            ))}
            {clientInviteSummary.failed.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {clientInviteSummary.failed.map((item) => (
                  <p key={`${item.email}:${item.reason}`}>{item.name} · {item.email} · {item.reason}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canManage ? (
        <div className="space-y-4">
          <details id="client-pre-register" className="group rounded-xl border border-slate-200 bg-white px-2 py-2">
            <summary className="list-none">
              <span className="ml-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800 group-open:bg-sky-100 md:w-[22rem]">
                의뢰인 등록하기
              </span>
            </summary>
            <div className="mt-3">
              <Card className="vs-mesh-card">
                <CardHeader><CardTitle>기본 의뢰인 초대</CardTitle></CardHeader>
                <CardContent>
                  <ClientStructuredInviteForm
                    organizationId={organizationId!}
                    cases={cases.map((item: any) => ({ id: item.id, title: item.title, referenceNo: item.reference_no ?? null }))}
                  />
                </CardContent>
              </Card>
            </div>
          </details>
          <details className="rounded-xl border border-slate-200 bg-white px-2 py-2">
            <summary className="list-none">
              <span className="ml-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 md:w-[22rem]">
                고급/예외 경로
              </span>
            </summary>
            <div className="mt-3">
              <Card>
                <CardHeader><CardTitle>임시 계정 직접 발급</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-500">비밀번호를 직접 안내해야 하는 예외 상황에서만 사용합니다. 기본 의뢰인 초대는 위의 매직링크 플로우를 사용합니다.</p>
                  <ClientPreRegisterForm organizationId={organizationId!} cases={cases} />
                </CardContent>
              </Card>
            </div>
          </details>
          <Card>
            <CardHeader><CardTitle>초대 링크 재발송</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {roster.filter((item: any) => item.source === 'invite' && item.invitationId).slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-slate-500">{item.email ?? '-'}</p>
                  </div>
                  <ResendInvitationForm invitationId={item.invitationId} compact />
                </div>
              ))}
              {!roster.some((item: any) => item.source === 'invite' && item.invitationId) ? (
                <p className="text-sm text-slate-500">재발송 가능한 초대가 없습니다.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
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
          ) : <p className="text-sm text-slate-500">의뢰인 데이터가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
