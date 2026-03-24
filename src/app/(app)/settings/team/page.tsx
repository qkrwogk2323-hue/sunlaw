import Link from 'next/link';
import type { Route } from 'next';
import { Settings2 } from 'lucide-react';
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
import { InviteWorkbench } from '@/components/settings/invite-workbench';
import { isWorkspaceAdmin, hasPermission } from '@/lib/permissions';
import { deleteMembershipAction, updateMembershipAdminSummaryAction, revokeStaffTempCredentialAction } from '@/lib/actions/organization-actions';
import { revokeUserSessionsAction } from '@/lib/actions/auth-actions';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

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

  // 발급된 임시 계정 목록 조회 (폐기 UI용)
  const supabase = await createSupabaseServerClient();
  const { data: staffTempCreds } = await supabase
    .from('organization_staff_temp_credentials')
    .select('profile_id, login_id, created_at, must_change_password, profile:profiles(full_name, email)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const canManage = isWorkspaceAdmin(currentMembership) && hasPermission(auth, organizationId, 'user_manage');
  const inviteToken = resolvedSearchParams?.invite;
  const issuedLoginId = resolvedSearchParams?.issuedLoginId;
  // 임시 비밀번호는 URL이 아닌 1회성 httpOnly flash cookie에서 읽어 즉시 삭제한다
  const issuedTempPassword = cookieStore.get('_vs_staff_issued_pw')?.value ?? null;
  if (issuedTempPassword) cookieStore.delete('_vs_staff_issued_pw');
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
  const selectedMember = selectedMemberId
    ? roster.find((row: any) => !row.isInviteOnly && row.raw.id === selectedMemberId) ?? null
    : null;
  const staleMemberSelection = Boolean(selectedMemberId && !selectedMember);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{currentMembership?.title ?? '직책 미설정'}</span>
            <span>·</span>
            <span>{membershipRoleLabel(currentMembership?.role ?? 'member')}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <details className="relative">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Settings2 className="size-4" />
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              <Link
                href={'/settings/team/self' as Route}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                내 프로필 수정하기
              </Link>
            </div>
          </details>
          {/* BUG-AUDIT: 감사로그 직접 이동 차단 - 일반 사용자가 플랫폼 관리자 감사로그에 접근하는 버그 */}
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
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">✅ 임시 계정 발급 완료 — 아래 정보를 직원에게 즉시 전달하세요.</p>
          <div className="mt-3 grid gap-2 rounded-xl border border-green-200 bg-white px-4 py-3 font-mono text-sm">
            <div className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-semibold text-green-700">아이디</span>
              <code className="flex-1 rounded bg-green-100 px-2 py-0.5 text-green-900">{issuedLoginId}</code>
            </div>
            {issuedTempPassword ? (
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-semibold text-green-700">임시 비밀번호</span>
                <code className="flex-1 rounded bg-green-100 px-2 py-0.5 text-green-900">{issuedTempPassword}</code>
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-green-700">⚠️ 이 정보는 이 화면을 벗어나면 다시 볼 수 없습니다. 직원이 첫 로그인 후 즉시 비밀번호를 변경하도록 안내해 주세요.</p>
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
          {staleMemberSelection ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              현재 조직에서는 선택한 구성원 정보를 찾을 수 없습니다. 조직을 변경했다면 이 화면에서 다시 선택해 주세요.
            </div>
          ) : null}

          {canManage ? (
            <div className="space-y-3">
              <InviteWorkbench organizationId={organizationId} />

              {staffTempCreds && staffTempCreds.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">발급된 임시 계정 목록</p>
                  <div className="space-y-2">
                    {staffTempCreds.map((cred: any) => (
                      <div key={cred.profile_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-900">{(cred.profile as any)?.full_name ?? '이름 미입력'}</span>
                          <span className="ml-2 font-mono text-xs text-slate-600">{cred.login_id}</span>
                          <span className="ml-2 text-xs text-slate-400">{formatDateTime(cred.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {cred.must_change_password ? (
                            <Badge tone="amber">비밀번호 변경 전</Badge>
                          ) : (
                            <Badge tone="green">초기 이행 완료</Badge>
                          )}
                          <DangerActionButton
                            action={revokeStaffTempCredentialAction}
                            fields={{ profileId: cred.profile_id, organizationId }}
                            confirmTitle="임시 계정 폐기"
                            highlightedInfo={`대상: ${(cred.profile as any)?.full_name ?? cred.login_id}`}
                            confirmLabel="폐기"
                            successTitle="임시 계정이 폐기되었습니다."
                          >폐기</DangerActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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

              {canManage && !row.isInviteOnly && selectedMember?.raw.id === row.raw.id ? (
                <div id={`member-edit-${row.raw.id}`} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-700">
                    <p className="font-medium text-slate-900">구성원 수정</p>
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
