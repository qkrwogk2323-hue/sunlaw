import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { decodeInvitationNote } from '@/lib/invitation-metadata';
import { actorCategoryLabel, membershipRoleLabel } from '@/lib/membership-labels';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { MembershipPermissionForm } from '@/components/forms/membership-permission-form';
import { MemberAdminSummaryForm } from '@/components/forms/member-admin-summary-form';
import { MemberSelfProfileForm } from '@/components/forms/member-self-profile-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { StaffDirectInviteForm } from '@/components/forms/staff-direct-invite-form';
import { StaffPreRegisterForm } from '@/components/forms/staff-pre-register-form';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { PLATFORM_SCENARIO_ORGANIZATIONS, PLATFORM_SCENARIO_TEAM, isPlatformScenarioMode } from '@/lib/platform-scenarios';

function toneByStatus(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('발송') || value.includes('대기')) return 'amber' as const;
  if (value.includes('비활성') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export default async function TeamSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string; member?: string }>;
}) {
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
          <p className="mt-2 text-sm text-slate-600">{organization.name} 시나리오의 상태 중심 구성원 목록입니다.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>구성원 목록</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green">가입 완료</Badge>
                  <Badge tone="blue">활성</Badge>
                  <Badge tone="slate">초대 완료</Badge>
                </div>
                <p className="mt-3 font-medium text-slate-900">{member.name}</p>
                <p className="text-sm text-slate-500">{member.email} · {member.title}</p>
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

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const canManage = isWorkspaceAdmin(currentMembership) && Boolean(currentMembership?.permissions?.user_manage);
  const inviteToken = resolvedSearchParams?.invite;
  const selectedMemberId = resolvedSearchParams?.member ?? currentMembership?.id ?? workspace.members[0]?.id ?? null;

  const staffInvitations = workspace.invitations
    .filter((invite: any) => invite.kind === 'staff_invite')
    .map((invite: any) => ({ ...invite, ...decodeInvitationNote(invite.note) }));

  const activeMemberEmailSet = new Set(
    workspace.members
      .map((member: any) => `${member.profile?.email ?? ''}`.trim().toLowerCase())
      .filter(Boolean)
  );

  const inviteOnlyRows = staffInvitations
    .filter((invite: any) => invite.status === 'pending' && !activeMemberEmailSet.has(`${invite.email ?? ''}`.trim().toLowerCase()))
    .map((invite: any) => ({
      id: `invite:${invite.id}`,
      isInviteOnly: true,
      invitationId: invite.id,
      name: invite.invited_name ?? '이름 미입력',
      email: invite.email ?? '-',
      signupStatus: '가입 전',
      inviteStatus: '초대 발송됨',
      activeStatus: '가입 전',
      roleLabel: invite.actor_category === 'admin' ? '조직관리자' : '조직원',
      title: invite.membershipTitle ?? '미입력',
      raw: invite
    }));

  const memberRows = workspace.members.map((member: any) => {
    const email = `${member.profile?.email ?? ''}`.trim().toLowerCase();
    const latestInvite = email ? staffInvitations.find((invite: any) => `${invite.email ?? ''}`.trim().toLowerCase() === email) : null;

    return {
      id: member.id,
      isInviteOnly: false,
      invitationId: latestInvite?.id ?? null,
      name: member.profile?.full_name ?? '이름 미입력',
      email: member.profile?.email ?? '-',
      signupStatus: '가입 완료',
      inviteStatus: latestInvite?.status === 'accepted' ? '초대 수락 완료' : latestInvite?.status === 'pending' ? '초대 발송됨' : '초대 이력 없음',
      activeStatus: member.status === 'suspended' ? '비활성' : '활성',
      roleLabel: member.actor_category === 'admin' ? '조직관리자' : '조직원',
      title: member.title ?? '미입력',
      raw: member
    };
  });

  const roster = [...memberRows, ...inviteOnlyRows];
  const selectedMember: any = workspace.members.find((member: any) => member.id === selectedMemberId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
        <p className="mt-2 text-sm text-slate-600">이름보다 상태를 먼저 보고 가입/초대/활성 상태를 운영합니다.</p>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크: <code className="font-mono">/invite/{inviteToken}</code>
        </div>
      ) : null}

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>직접 초대</CardTitle></CardHeader>
            <CardContent>
              <StaffDirectInviteForm organizationId={organizationId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>선등록</CardTitle></CardHeader>
            <CardContent>
              <StaffPreRegisterForm organizationId={organizationId} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>초대 링크 재발송</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {staffInvitations.filter((invite: any) => invite.status === 'pending').slice(0, 6).map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{invite.invited_name ?? invite.email}</p>
                    <p className="text-slate-500">{invite.email ?? '-'}</p>
                  </div>
                  <ResendInvitationForm invitationId={invite.id} compact />
                </div>
              ))}
              {!staffInvitations.some((invite: any) => invite.status === 'pending') ? <p className="text-sm text-slate-500">재발송 대상이 없습니다.</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle>구성원 목록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {roster.length ? roster.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={toneByStatus(row.signupStatus)}>{row.signupStatus}</Badge>
                <Badge tone={toneByStatus(row.inviteStatus)}>{row.inviteStatus}</Badge>
                <Badge tone={toneByStatus(row.activeStatus)}>{row.activeStatus}</Badge>
                <Badge tone="blue">{row.roleLabel}</Badge>
                <Badge tone="slate">직책: {row.title}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {row.isInviteOnly ? (
                  <p className="font-medium text-slate-900">{row.name}</p>
                ) : (
                  <Link href={`/settings/team?member=${row.raw.id}`} className="font-medium text-slate-900 underline underline-offset-4">
                    {row.name}
                  </Link>
                )}
                <p className="text-sm text-slate-500">{row.email}</p>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">구성원 데이터가 없습니다.</p>}
        </CardContent>
      </Card>

      {currentMembership ? (
        <Card>
          <CardHeader><CardTitle>본인 수정 영역</CardTitle></CardHeader>
          <CardContent>
            <MemberSelfProfileForm
              organizationId={organizationId}
              fullName={auth.profile.full_name}
              phone={(auth.profile as any).phone_e164 ?? ''}
              displayTitle={currentMembership.title ?? ''}
            />
          </CardContent>
        </Card>
      ) : null}

      {canManage && selectedMember ? (
        <Card>
          <CardHeader><CardTitle>관리자 수정 영역</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">대상: {selectedMember.profile?.full_name ?? '-'}</p>
              <p className="text-slate-500">{selectedMember.profile?.email ?? '-'}</p>
              <p className="mt-1 text-slate-500">현재 역할: {membershipRoleLabel(selectedMember.role)} · {actorCategoryLabel(selectedMember.actor_category)}</p>
            </div>

            {selectedMember.role !== 'org_owner' ? (
              <MemberAdminSummaryForm
                organizationId={organizationId}
                membershipId={selectedMember.id}
                actorCategory={selectedMember.actor_category}
                status={selectedMember.status}
                title={selectedMember.title}
              />
            ) : (
              <p className="text-sm text-slate-500">조직관리자는 이 화면에서 수정할 수 없습니다.</p>
            )}

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-900">고급 권한 수정(필요할 때만)</summary>
              <div className="mt-3">
                <MembershipPermissionForm
                  membershipId={selectedMember.id}
                  organizationId={organizationId}
                  currentPermissions={selectedMember.permissions}
                  actorCategory={selectedMember.actor_category}
                  membershipTitle={selectedMember.title}
                  roleTemplateKey={selectedMember.permission_template_key}
                  caseScopePolicy={selectedMember.case_scope_policy}
                  title={`${selectedMember.profile?.full_name ?? '구성원'} 고급 권한`}
                />
              </div>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
