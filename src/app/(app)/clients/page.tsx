import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientStructuredInviteForm } from '@/components/forms/client-structured-invite-form';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { listCases } from '@/lib/queries/cases';
import { listClientRosterSummary } from '@/lib/queries/clients';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { bulkUploadClientsAction } from '@/lib/actions/bulk-upload-actions';

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
            <Badge tone={linkStatusTone(item.caseLinkStatus)}>{item.caseLinkStatus}</Badge>
            {item.overdueCount > 0 && (
              <Badge tone="red">미납 {item.overdueCount}건</Badge>
            )}
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
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href={'/admin/audit?tab=general&table=client_profiles' as Route} className="font-medium text-sky-700 underline underline-offset-4">
            의뢰인 정보 변경 기록 보기
          </Link>
          <Link href={'/admin/audit?tab=general&table=client_access_requests' as Route} className="font-medium text-sky-700 underline underline-offset-4">
            의뢰인 연결 요청 기록 보기
          </Link>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">문맥</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">사건 먼저</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">의뢰인 초대는 사건 문맥을 먼저 고정하고 시작합니다. 연결 없는 초대는 표준 흐름에서 허용하지 않습니다.</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">입력</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">신원과 연락처</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">이름, 연락 이메일 또는 휴대폰, 보조 연락처를 입력하고 관계를 명시합니다.</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">연결</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">상태로 확인</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">연결 완료, 해제 대기, 검토 중, 해제 상태를 배지로 확인하고 다음 조치를 판단합니다.</p>
          </CardContent>
        </Card>
        <Card className="bg-[linear-gradient(180deg,#ffffff,#f8fbff)]">
          <CardContent className="px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">완료</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">결과 카드</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">생성 여부, 사건 연결, 안내 준비, 실패 사유를 완료 카드에서 즉시 확인합니다.</p>
          </CardContent>
        </Card>
      </section>

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
            <div className="grid gap-2 text-sm text-emerald-900 md:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">생성 여부</p>
                <p className="mt-1 font-semibold">{clientInviteSummary.created.length}건 완료</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">연결 여부</p>
                <p className="mt-1 font-semibold">{clientInviteSummary.created.length}건 사건 연결</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">발송 여부</p>
                <p className="mt-1 font-semibold">{clientInviteSummary.created.length}건 안내 준비</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">실패 사유</p>
                <p className="mt-1 font-semibold">{clientInviteSummary.failed.length}건</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">연결 사건</p>
              <p className="mt-1 text-slate-600">{clientInviteSummary.caseTitle}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/cases/${clientInviteSummary.caseId}`} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-lg px-3 text-xs' })}>
                  사건으로 이동
                </Link>
                <Link href={`/case-hubs?caseId=${clientInviteSummary.caseId}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-lg px-3 text-xs' })}>
                  허브 확인
                </Link>
              </div>
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
                <p className="mb-2 font-semibold">실패 사유</p>
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
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">문맥 → 입력 → 연결 → 완료</p>
                <p className="mt-2 text-sm text-slate-700">의뢰인 초대는 사건 문맥을 먼저 고정하고, 연결 검토를 거친 뒤 완료 카드에서 결과를 확인합니다.</p>
              </div>
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
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">고급/예외 경로</p>
                <p className="mt-1 text-sm text-slate-500">비밀번호 직접 전달이 필요한 예외 상황에서만 임시 계정 직접 발급을 사용합니다.</p>
              </div>
              <Card>
                <CardHeader><CardTitle>임시 계정 직접 발급</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ClientPreRegisterForm organizationId={organizationId!} cases={cases} />
                </CardContent>
              </Card>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>CSV 일괄 등록</CardTitle>
              <p className="text-sm font-medium text-slate-900">대량 등록은 CSV 양식에 맞춰 올려 주세요.</p>
              <p className="text-sm text-slate-500">직접 입력은 최대 5건까지 권장합니다. 더 많은 의뢰인은 양식을 내려받아 그대로 작성한 뒤 한 번에 등록하세요.</p>
            </CardHeader>
            <CardContent>
              <BulkUploadPanel
                mode="clients"
                organizationId={organizationId!}
                action={bulkUploadClientsAction}
              />
            </CardContent>
          </Card>
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
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">의뢰인 데이터가 없습니다.</p>
              <p className="mt-2 text-sm text-slate-500">기본 의뢰인 초대 또는 임시 계정 직접 발급으로 첫 의뢰인을 등록한 뒤, 사건 연결 상태를 확인해 주세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
