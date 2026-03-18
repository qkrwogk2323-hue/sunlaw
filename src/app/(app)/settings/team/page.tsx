import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffInvitationCreateForm } from '@/components/forms/invitation-create-form';
import { StaffPreRegisterForm } from '@/components/forms/staff-pre-register-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { decodeInvitationNote } from '@/lib/invitation-metadata';
import { membershipRoleLabel } from '@/lib/membership-labels';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { PLATFORM_SCENARIO_ORGANIZATIONS, PLATFORM_SCENARIO_TEAM, isPlatformScenarioMode } from '@/lib/platform-scenarios';

function statusTone(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('발송') || value.includes('대기')) return 'amber' as const;
  return 'slate' as const;
}

export default async function TeamSettingsPage({ searchParams }: { searchParams?: Promise<{ invite?: string }> }) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const isVirtualScenario = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode);

  if (isVirtualScenario) {
    const organization = PLATFORM_SCENARIO_ORGANIZATIONS[activeViewMode];
    const members = PLATFORM_SCENARIO_TEAM[activeViewMode];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
          <p className="mt-2 text-sm text-slate-600">{organization.name} 시나리오 구성원 목록입니다.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>구성원 상태</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="green">가입 완료</Badge>
                    <Badge tone="green">활성</Badge>
                    <Badge tone="blue">{member.title}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();
  const workspace = await getOrganizationWorkspace(organizationId);
  if (!workspace) notFound();

  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const canManage = isWorkspaceAdmin(currentMembership) && Boolean(currentMembership?.permissions?.user_manage);
  const inviteToken = searchParams ? (await searchParams).invite : undefined;

  const members = workspace.members.map((member: any) => ({
    id: member.id,
    name: member.profile?.full_name ?? '-',
    email: member.profile?.email ?? '-',
    role: membershipRoleLabel(member.role),
    title: member.title ?? '직책 미입력',
    activeStatus: member.status === 'active' ? '활성' : '비활성',
    signupStatus: '가입 완료',
    inviteStatus: '완료'
  }));

  const inviteRows = workspace.invitations
    .filter((invite: any) => invite.kind === 'staff_invite')
    .map((invite: any) => {
      const decoded = decodeInvitationNote(invite.note);
      return {
        id: invite.id,
        name: invite.invited_name || invite.email,
        email: invite.email,
        role: invite.requested_role === 'org_manager' ? '조직관리자' : '조직원',
        title: decoded.membershipTitle ?? '직책 미입력',
        activeStatus: '가입 전',
        signupStatus: invite.status === 'accepted' ? '가입 완료' : '가입 전',
        inviteStatus: invite.status === 'pending' ? '초대 발송됨' : invite.status === 'accepted' ? '완료' : '가입 전'
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
        <p className="mt-2 text-sm text-slate-600">권한표보다 사람 상태를 먼저 보고 운영합니다.</p>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크: <code className="font-mono">/invite/{inviteToken}</code>
        </div>
      ) : null}

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>직원 초대</CardTitle></CardHeader>
            <CardContent>
              <StaffInvitationCreateForm organizationId={organizationId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>직원 선등록</CardTitle></CardHeader>
            <CardContent>
              <StaffPreRegisterForm organizationId={organizationId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>초대 링크 재발송</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {inviteRows.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-slate-500">{item.email}</p>
                  </div>
                  <ResendInvitationForm invitationId={item.id} compact />
                </div>
              ))}
              {!inviteRows.length ? <p className="text-sm text-slate-500">재발송 가능한 초대가 없습니다.</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle>구성원 목록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...inviteRows, ...members].map((item) => (
            <div key={`${item.id}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.title}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(item.signupStatus)}>{item.signupStatus}</Badge>
                  <Badge tone={statusTone(item.inviteStatus)}>{item.inviteStatus}</Badge>
                  <Badge tone={statusTone(item.activeStatus)}>{item.activeStatus}</Badge>
                  <Badge tone="blue">{item.role}</Badge>
                </div>
              </div>
              {canManage && inviteRows.some((invite) => invite.id === item.id) ? (
                <div className="mt-3">
                  <ResendInvitationForm invitationId={item.id} />
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
