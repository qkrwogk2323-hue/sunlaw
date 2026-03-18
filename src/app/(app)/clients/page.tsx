import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientDirectInviteForm } from '@/components/forms/client-direct-invite-form';
import { ClientPreRegisterForm } from '@/components/forms/client-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { findMembership, getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { listCases } from '@/lib/queries/cases';
import { listClientRosterSummary } from '@/lib/queries/clients';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';

function statusTone(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('대기') || value.includes('발송')) return 'amber' as const;
  if (value.includes('미연결') || value.includes('미발송') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export default async function ClientsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const isScenarioMode = Boolean(scenarioMode);
  const organizationId = getEffectiveOrganizationId(auth);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManage = Boolean(
    !isScenarioMode
    && organizationId
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

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>의뢰인 초대</CardTitle></CardHeader>
            <CardContent>
              {cases.length ? <ClientDirectInviteForm organizationId={organizationId!} cases={cases} /> : <p className="text-sm text-slate-500">사건이 있어야 직접 초대를 보낼 수 있습니다.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>의뢰인 선등록</CardTitle></CardHeader>
            <CardContent>
              <ClientPreRegisterForm organizationId={organizationId!} cases={cases} />
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
          {roster.length ? roster.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={item.caseId ? `/cases/${item.caseId}` : '/clients'} className="font-medium text-slate-900 underline-offset-4 hover:underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{item.email ?? '-'}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.caseTitle ?? '미연결 사건'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(item.signupStatus)}>{item.signupStatus}</Badge>
                  <Badge tone={statusTone(item.inviteStatus)}>{item.inviteStatus}</Badge>
                  <Badge tone={statusTone(item.caseLinkStatus)}>{item.caseLinkStatus}</Badge>
                  <Badge tone="blue">{item.nextAction}</Badge>
                </div>
              </div>
              {canManage && item.source === 'invite' && item.invitationId ? (
                <div className="mt-3">
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
