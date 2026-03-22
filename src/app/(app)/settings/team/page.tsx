import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { decodeInvitationNote } from '@/lib/invitation-metadata';
import { actorCategoryLabel, membershipRoleLabel } from '@/lib/membership-labels';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { MembershipPermissionForm } from '@/components/forms/membership-permission-form';
import { MemberAdminSummaryForm } from '@/components/forms/member-admin-summary-form';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { StaffBulkInviteForm } from '@/components/forms/staff-bulk-invite-form';
import { StaffPreRegisterForm } from '@/components/forms/staff-pre-register-form';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { deleteMembershipAction, updateMembershipAdminSummaryAction } from '@/lib/actions/organization-actions';
import { revokeUserSessionsAction } from '@/lib/actions/auth-actions';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { cookies } from 'next/headers';

function toneByStatus(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('발송') || value.includes('대기')) return 'amber' as const;
  if (value.includes('비활성') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export default async function TeamSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string; member?: string; issuedLoginId?: string; staffInviteBatch?: string; staffInviteFailed?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();

  const workspace = await getOrganizationWorkspace(organizationId);
  if (!workspace) notFound();
  const cookieStore = await cookies();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const canManage = isWorkspaceAdmin(currentMembership) && Boolean(currentMembership?.permissions?.user_manage);
  const inviteToken = resolvedSearchParams?.invite;
  const issuedLoginId = resolvedSearchParams?.issuedLoginId;
  const staffInviteSummaryRaw = cookieStore.get('_vs_staff_invite_summary')?.value ?? null;
  const selectedMemberId = resolvedSearchParams?.member ?? null;
  const staffInviteSummary = (() => {
    if (!staffInviteSummaryRaw) return null;
    try {
      return JSON.parse(decodeURIComponent(staffInviteSummaryRaw)) as {
        created: Array<{ name: string; email: string; url: string; membershipTitle: string | null }>;
        failed: Array<{ name: string; email: string; reason: string }>;
        actorCategory: 'admin' | 'staff';
      };
    } catch {
      return null;
    }
  })();

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
        <p className="mt-2 text-sm text-slate-600">이름보다 상태를 먼저 보고 가입/초대/활성 상태를 운영합니다.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={'/admin/audit?tab=general&table=organization_memberships' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            구성원 권한 변경 기록 보기
          </Link>
          <Link href={'/admin/audit?tab=violation&table=organization_memberships' as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>
            구성원 권한 위반 기록 보기
          </Link>
        </div>
      </div>

      {currentMembership ? (
        <Card>
          <CardHeader>
            <CardTitle>내 프로필</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-medium text-slate-900">{auth.profile.full_name}</p>
                <p className="text-sm text-slate-500">{auth.profile.email}</p>
              </div>
              <Link
                href={'/settings/team/self' as Route}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                수정하기
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {inviteToken ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-semibold">✅ 초대 링크가 생성되었습니다</p>
          <p className="mt-1 text-xs text-emerald-700">아래 링크를 복사해서 의뢰인에게 전달하세요. 이 화면을 벗어나면 다시 확인할 수 없습니다.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-3">
            <code className="flex-1 select-all font-mono text-sm text-slate-900">{`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${inviteToken}`}</code>
          </div>
        </div>
      ) : null}

      {staffInviteSummary?.created?.length ? (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle>구성원 초대 완료</CardTitle>
            <div className="grid gap-2 text-sm text-emerald-900 md:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">생성 여부</p>
                <p className="mt-1 font-semibold">{staffInviteSummary.created.length}건 완료</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">연결 여부</p>
                <p className="mt-1 font-semibold">조직 초대 준비</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">발송 여부</p>
                <p className="mt-1 font-semibold">{staffInviteSummary.created.length}건 안내 준비</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
                <p className="text-xs text-emerald-700">실패 사유</p>
                <p className="mt-1 font-semibold">{staffInviteSummary.failed.length}건</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffInviteSummary.created.map((item) => (
              <div key={`${item.email}:${item.url}`} className="rounded-xl border border-emerald-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </div>
                  <Badge tone="green">{item.membershipTitle ?? (staffInviteSummary.actorCategory === 'admin' ? '조직관리자' : '조직원')}</Badge>
                </div>
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <code className="select-all text-xs text-slate-800">{item.url}</code>
                </div>
              </div>
            ))}
            {staffInviteSummary.failed.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="mb-2 font-semibold">실패 사유</p>
                {staffInviteSummary.failed.map((item) => (
                  <p key={`${item.email}:${item.reason}`}>{item.name} · {item.email} · {item.reason}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {issuedLoginId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          임시 계정 발급 완료: 아이디 <code className="font-mono">{issuedLoginId}</code>
          <p className="mt-1 text-xs text-amber-700">보안을 위해 임시 비밀번호는 화면에 표시되지 않습니다. 직원은 첫 로그인 직후 비밀번호 변경 화면으로 이동합니다.</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>구성원 목록</CardTitle>
            {canManage ? (
              <span className="inline-flex min-h-11 items-center rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800">
                목록 → 입력 → 완료
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage ? (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">표준 초대 플로우</p>
                  <p className="mt-2 text-sm text-slate-700">구성원 초대는 목록 확인 후 기본 3행 입력, 권한 설정, 완료 카드 확인 순서로 운영합니다.</p>
                </div>
                <StaffBulkInviteForm organizationId={organizationId} />
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">고급/예외 경로</p>
                  <p className="mt-1 text-sm text-slate-500">비밀번호를 직접 전달해야 하는 예외 상황에서만 임시 계정 발급을 사용합니다.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-900">직원 임시 계정 발급</p>
                  <StaffPreRegisterForm organizationId={organizationId} />
                </div>
              </div>
            </div>
          ) : null}

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
                  <p className="font-medium text-slate-900">{row.name}</p>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-500">{row.email}</p>
                  {row.invitationId ? <ResendInvitationForm invitationId={row.invitationId} compact /> : null}
                  {canManage && !row.isInviteOnly && row.raw.role !== 'org_owner' ? (
                    <a
                      href={`/settings/team?member=${row.raw.id}#member-edit-${row.raw.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      수정하기
                    </a>
                  ) : null}
                  {canManage && !row.isInviteOnly && row.raw.role !== 'org_owner' ? (
                    <>
                      <ClientActionForm
                        action={updateMembershipAdminSummaryAction}
                        successTitle={row.raw.status === 'suspended' ? '구성원을 활성화했습니다.' : '구성원을 비활성화했습니다.'}
                        successMessage={row.raw.status === 'suspended' ? '조직 접근이 복원되었습니다.' : '해당 구성원의 조직 접근이 중지됩니다.'}
                        errorTitle="상태 변경에 실패했습니다."
                        errorCause="권한이 없거나 구성원 상태 저장에 실패했습니다."
                        errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
                      >
                        <input type="hidden" name="organizationId" value={organizationId} />
                        <input type="hidden" name="membershipId" value={row.raw.id} />
                        <input type="hidden" name="actorCategory" value={row.raw.actor_category ?? 'staff'} />
                        <input type="hidden" name="title" value={row.raw.title ?? ''} />
                        <input type="hidden" name="status" value={row.raw.status === 'suspended' ? 'active' : 'suspended'} />
                        <SubmitButton variant="ghost" pendingLabel="처리 중..." className="h-8 px-3 text-xs">
                          {row.raw.status === 'suspended' ? '활성화' : '비활성화'}
                        </SubmitButton>
                      </ClientActionForm>
                      <DangerActionButton
                        action={deleteMembershipAction}
                        fields={{ organizationId, membershipId: row.raw.id }}
                        confirmTitle="구성원을 삭제할까요?"
                        confirmDescription="이 구성원의 조직 접근 권한이 즉시 해제됩니다. 진행 중인 업무 인수인계 후 삭제를 권장합니다."
                        highlightedInfo={`${row.raw.profile?.full_name ?? '-'} (${row.raw.profile?.email ?? '-'})`}
                        confirmLabel="삭제"
                        variant="danger"
                        successTitle="구성원이 삭제되었습니다."
                        successMessage="해당 구성원의 모든 접근 권한이 해제되었습니다."
                        errorTitle="구성원 삭제에 실패했습니다."
                        errorCause="구성원 상태 변경 저장에 실패했습니다."
                        errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
                        buttonVariant="ghost"
                        className="h-8 px-3 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        삭제
                      </DangerActionButton>
                      {row.raw.profile?.id ? (
                        <DangerActionButton
                          action={revokeUserSessionsAction}
                          fields={{ organizationId, targetProfileId: row.raw.profile.id }}
                          confirmTitle="세션을 강제 종료할까요?"
                          confirmDescription="해당 구성원이 현재 로그인된 모든 기기에서 즉시 로그아웃됩니다. 퇴사 처리나 계정 탈취 의심 시 사용하세요."
                          highlightedInfo={`${row.raw.profile?.full_name ?? '-'} (${row.raw.profile?.email ?? '-'})`}
                          confirmLabel="세션 강제 종료"
                          variant="warning"
                          successTitle="세션이 강제 종료되었습니다."
                          successMessage="해당 구성원의 모든 활성 세션이 무효화되었습니다."
                          errorTitle="세션 종료에 실패했습니다."
                          errorCause="Supabase Auth 연결 오류가 발생했습니다."
                          errorResolution="잠시 후 다시 시도하거나 Supabase 대시보드에서 직접 처리해 주세요."
                          buttonVariant="ghost"
                          className="h-8 px-3 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          세션 종료
                        </DangerActionButton>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              {canManage && !row.isInviteOnly && selectedMemberId === row.raw.id ? (
                <div id={`member-edit-${row.raw.id}`} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-700">
                    <p className="font-medium text-slate-900">관리자 수정 영역</p>
                    <p>대상: {row.raw.profile?.full_name ?? '-'} · {row.raw.profile?.email ?? '-'}</p>
                    <p className="mt-1 text-slate-500">현재 역할: {membershipRoleLabel(row.raw.role)} · {actorCategoryLabel(row.raw.actor_category)}</p>
                  </div>

                  {row.raw.role !== 'org_owner' ? (
                    <MemberAdminSummaryForm
                      organizationId={organizationId}
                      membershipId={row.raw.id}
                      actorCategory={row.raw.actor_category}
                      status={row.raw.status}
                      title={row.raw.title}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">조직관리자는 이 화면에서 수정할 수 없습니다.</p>
                  )}

                  <details className="rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-medium text-slate-900">고급 권한 수정(필요할 때만)</summary>
                    <div className="mt-3">
                      <MembershipPermissionForm
                        membershipId={row.raw.id}
                        organizationId={organizationId}
                        currentPermissions={row.raw.permissions}
                        actorCategory={row.raw.actor_category}
                        membershipTitle={row.raw.title}
                        roleTemplateKey={row.raw.permission_template_key}
                        caseScopePolicy={row.raw.case_scope_policy}
                        title={`${row.raw.profile?.full_name ?? '구성원'} 고급 권한`}
                      />
                    </div>
                  </details>
                </div>
              ) : null}
            </div>
          )) : <p className="text-sm text-slate-500">구성원 데이터가 없습니다.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
