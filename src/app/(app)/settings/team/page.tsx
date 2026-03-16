import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { decodeInvitationNote } from '@/lib/invitation-metadata';
import { actorCategoryLabel, caseScopePolicyLabel, membershipRoleLabel } from '@/lib/membership-labels';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { MembershipPermissionForm } from '@/components/forms/membership-permission-form';
import { StaffInvitationCreateForm } from '@/components/forms/invitation-create-form';
import { isWorkspaceAdmin, TEMPLATE_LABELS } from '@/lib/permissions';
import { PLATFORM_SCENARIO_ORGANIZATIONS, PLATFORM_SCENARIO_TEAM, isPlatformScenarioMode } from '@/lib/platform-scenarios';

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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직관리</h1>
          <p className="mt-2 text-sm text-slate-600">{organization.name} 시나리오에 배치된 가상직원 목록입니다. 플랫폼 이해를 위한 예시 데이터이며 실제 초대/권한 변경은 동작하지 않습니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>현재 시야</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>조직명: {organization.name}</p>
            <p>시야 기준: 가상직원 선택형</p>
            <p>조직 특성: {activeViewMode === 'law_admin' ? '법률/법무조직' : activeViewMode === 'collection_admin' ? '추심조직' : '기타조직'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구성원 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{member.name} (가상직원)</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                    <p className="mt-1 text-sm text-slate-600">직책: {member.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{member.title}</Badge>
                    <Badge tone="green">가상직원</Badge>
                  </div>
                </div>
                <p className="text-sm text-slate-500">업무 흐름: {member.note}</p>
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
  const invitations = workspace.invitations.map((invite: any) => ({
    ...invite,
    ...decodeInvitationNote(invite.note)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Team & Permissions</h1>
        <p className="mt-2 text-sm text-slate-600">구조 역할은 조직 관리자·조직 상위 담당자·조직원으로 구분하고, 직책은 각 조직이 자유롭게 적어 관리합니다.</p>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 초대 링크: <code className="font-mono">/invite/{inviteToken}</code>
        </div>
      ) : null}

      {canManage ? (
        <Card>
          <CardHeader><CardTitle>직원 초대</CardTitle></CardHeader>
          <CardContent>
            <StaffInvitationCreateForm organizationId={organizationId} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>구성원 권한</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {workspace.members.map((member: any) => (
            <div key={member.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{member.profile?.full_name ?? '-'}</p>
                  <p className="text-sm text-slate-500">{member.profile?.email ?? '-'}</p>
                  <p className="mt-1 text-sm text-slate-600">직책: {member.title ?? '미입력'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={member.role === 'org_owner' ? 'amber' : member.actor_category === 'admin' ? 'blue' : 'slate'}>{membershipRoleLabel(member.role)}</Badge>
                  <Badge tone={member.actor_category === 'admin' ? 'blue' : 'slate'}>{actorCategoryLabel(member.actor_category)}</Badge>
                  <Badge tone="green">{TEMPLATE_LABELS[member.permission_template_key] ?? member.permission_template_key ?? '-'}</Badge>
                  <Badge tone="slate">{caseScopePolicyLabel(member.case_scope_policy)}</Badge>
                </div>
              </div>
              {canManage && member.role !== 'org_owner' ? (
                <MembershipPermissionForm
                  membershipId={member.id}
                  organizationId={organizationId}
                  currentPermissions={member.permissions}
                  actorCategory={member.actor_category}
                  membershipTitle={member.title}
                  roleTemplateKey={member.permission_template_key}
                  caseScopePolicy={member.case_scope_policy}
                  title={`${member.profile?.full_name ?? '구성원'} 권한`}
                />
              ) : (
                <p className="text-sm text-slate-500">오너 또는 현재 권한으로는 수정할 수 없습니다.</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>초대 내역</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {invitations.length ? invitations.map((invite: any) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{invite.invited_name || invite.email}</p>
                  <p className="text-slate-500">{invite.email}</p>
                  <p className="mt-1 text-slate-500">직책: {invite.membershipTitle ?? '미입력'}</p>
                </div>
                <Badge tone={invite.status === 'pending' ? 'amber' : invite.status === 'accepted' ? 'green' : 'slate'}>{invite.kind}</Badge>
              </div>
              <div className="mt-2 space-y-1 text-slate-500">
                <p>구조 역할: {membershipRoleLabel(invite.requested_role)}</p>
                <p>구분: {actorCategoryLabel(invite.actor_category)}</p>
                <p>템플릿: {TEMPLATE_LABELS[invite.role_template_key] ?? invite.role_template_key ?? '-'}</p>
                <p>사건 범위: {caseScopePolicyLabel(invite.case_scope_policy)}</p>
                {invite.note ? <p>메모: {invite.note}</p> : null}
                <p>힌트: {invite.token_hint ?? '-'} · 저장된 평문 링크는 노출하지 않습니다.</p>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">초대 내역이 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
