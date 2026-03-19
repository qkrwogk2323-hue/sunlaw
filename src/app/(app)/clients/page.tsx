import Link from 'next/link';
import type { Route } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { findMembership, getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { listCases } from '@/lib/queries/cases';
import { listClientRosterSummary } from '@/lib/queries/clients';

function statusTone(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('대기') || value.includes('발송')) return 'amber' as const;
  if (value.includes('미연결') || value.includes('미발송') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string; issuedClientLoginId?: string; issuedClientTempPassword?: string; issuedOrgName?: string }>;
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

  const [roster, cases, resolvedSearchParams] = await Promise.all([
    listClientRosterSummary(organizationId),
    canManage && organizationId ? listCases(organizationId) : Promise.resolve([]),
    searchParams ? searchParams : Promise.resolve(undefined)
  ]);
  const inviteToken = resolvedSearchParams?.invite;
  const issuedClientLoginId = resolvedSearchParams?.issuedClientLoginId;
  const issuedClientTempPassword = resolvedSearchParams?.issuedClientTempPassword;
  const issuedOrgName = resolvedSearchParams?.issuedOrgName ?? (organizationId ? (auth.memberships.find((membership) => membership.organization_id === organizationId)?.organization?.name ?? '현재 조직') : '현재 조직');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">의뢰인 관리</h1>
        <p className="mt-2 text-sm text-slate-600">이름보다 상태를 먼저 확인해 가입, 초대, 사건 연결을 운영합니다.</p>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크: <code className="font-mono">/invite/{inviteToken}</code>
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
        <div className="space-y-4">
          <details id="client-pre-register" className="group rounded-xl border border-slate-200 bg-white px-2 py-2">
            <summary className="list-none">
              <span className="ml-auto inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800 group-open:bg-sky-100 md:w-[22rem]">
                의뢰인 등록하기
              </span>
            </summary>
            <div className="mt-3">
              <Card className="vs-mesh-card">
                <CardHeader><CardTitle>의뢰인 선등록</CardTitle></CardHeader>
                <CardContent>
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
          {roster.length ? roster.map((item: any) => (
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
          )) : <p className="text-sm text-slate-500">의뢰인 데이터가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
