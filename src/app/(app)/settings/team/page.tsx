import Link from 'next/link';
import type { Route } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle, ChevronDown, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { decodeInvitationNote } from '@/lib/invitation-metadata';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { ResendInvitationForm } from '@/components/forms/resend-invitation-form';
import { StaffBulkInviteForm } from '@/components/forms/staff-bulk-invite-form';
import { StaffPreRegisterForm } from '@/components/forms/staff-pre-register-form';
import { MembershipPermissionForm } from '@/components/forms/membership-permission-form';
import { MemberAdminSummaryForm } from '@/components/forms/member-admin-summary-form';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { deleteMembershipAction, updateMembershipAdminSummaryAction } from '@/lib/actions/organization-actions';
import { revokeUserSessionsAction } from '@/lib/actions/auth-actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function toneByStatus(value: string) {
  if (value.includes('완료') || value.includes('활성')) return 'green' as const;
  if (value.includes('발송') || value.includes('대기')) return 'amber' as const;
  if (value.includes('비활성') || value.includes('가입 전')) return 'slate' as const;
  return 'blue' as const;
}

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ invite?: string; member?: string; issuedLoginId?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();

  const workspace = await getOrganizationWorkspace(organizationId);
  if (!workspace) notFound();

  const [supabase, cookieStore] = await Promise.all([createSupabaseServerClient(), cookies()]);
  const { data: privateProfile } = await supabase
    .from('member_private_profiles')
    .select('resident_number_masked, address_line1_ciphertext')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentMembership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  const canManage = isWorkspaceAdmin(currentMembership) && Boolean(currentMembership?.permissions?.user_manage);
  const staffInviteSummaryRaw = cookieStore.get('_vs_staff_invite_summary')?.value ?? null;
  const issuedLoginId = resolvedSearchParams?.issuedLoginId ?? null;
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">구성원 관리</h1>
          <p className="mt-2 text-sm text-slate-600">구성원 현황을 먼저 확인하고, 필요할 때만 초대 안내를 펼쳐 보도록 화면을 정리했습니다.</p>
        </div>
        <Link href={'/settings/team/self' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-xl px-4' })}>
          <Settings className="size-4" /> 내 프로필 수정
        </Link>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">현재 내 상태</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-slate-900">{auth.profile.full_name}</p>
              <Badge tone="slate">직책: {currentMembership?.title ?? '미입력'}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{auth.profile.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {privateProfile?.resident_number_masked ? <Badge tone="blue">본인확인 저장됨</Badge> : <Badge tone="amber">본인확인 재확인 필요</Badge>}
            <Link
              href={'/settings/team/self' as Route}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              aria-label="내 프로필 수정하기"
            >
              <Settings className="size-4" /> 수정하기
            </Link>
          </div>
        </CardContent>
      </Card>

      <details className="group rounded-[1.75rem] border border-slate-200 bg-white shadow-sm" open={Boolean(staffInviteSummary?.created?.length)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">구성원 초대 방법</p>
            <p className="mt-1 text-sm text-slate-600">필요할 때만 펼쳐서 확인하도록 접기/펼치기 버튼으로 옮겼습니다.</p>
          </div>
          <ChevronDown className="size-5 text-slate-500 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-5 py-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
            먼저 아래 구성원 목록에서 이미 등록된 사람과 초대 대기 중인 사람을 확인해 주세요. 같은 이메일이 이미 있으면 중복 초대가 실패할 수 있습니다.
          </div>
          {canManage ? (
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <StaffBulkInviteForm organizationId={organizationId} />
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  조직을 방금 바꾼 직후라면 이전 조직 기준 초대 화면이 잠깐 남아 있을 수 있습니다. 이 경우 현재 조직이 맞는지 확인한 뒤 다시 시도해 주세요.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-900">직원 임시 계정 발급</p>
                  <StaffPreRegisterForm organizationId={organizationId} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">구성원 초대는 조직 관리자만 할 수 있습니다.</div>
          )}
        </div>
      </details>

      {staffInviteSummary?.created?.length ? (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader>
            <CardTitle>구성원 초대 결과</CardTitle>
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
                {staffInviteSummary.failed.map((item) => <p key={`${item.email}:${item.reason}`}>{item.name} · {item.email} · {item.reason}</p>)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {issuedLoginId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          임시 계정 발급 완료: 아이디 <code className="font-mono">{issuedLoginId}</code>
          <p className="mt-1 text-xs text-amber-700">비밀번호는 화면에 표시되지 않습니다. 첫 로그인 뒤 바로 비밀번호 변경과 본인 정보 입력으로 이어집니다.</p>
        </div>
      ) : null}

      <Card className="rounded-[1.75rem] border-slate-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>구성원 목록</CardTitle>
              <p className="mt-2 text-sm text-slate-600">실제 구성원과 초대 대기 상태를 함께 보여 줍니다.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="green">활성 {memberRows.filter((row) => row.activeStatus === '활성').length}</Badge>
              <Badge tone="amber">초대 대기 {inviteOnlyRows.length}</Badge>
              <Badge tone="slate">전체 {roster.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">오류가 날 수 있는 경우를 미리 안내합니다.</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  <li>조직을 바꾼 직후 이전 조직의 목록이 잠깐 남아 보이면 새로고침 후 다시 확인해 주세요.</li>
                  <li>이미 같은 이메일로 초대가 남아 있으면 새 초대가 실패할 수 있습니다.</li>
                  <li>권한이 없는 상태에서 수정·비활성화·삭제를 누르면 저장되지 않고 안내 문구가 표시됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          {roster.length ? roster.map((row: any) => (
            <div key={row.id} id={!row.isInviteOnly ? `member-edit-${row.raw.id}` : undefined} className={`rounded-2xl border p-4 ${selectedMemberId === row.raw.id ? 'border-sky-300 bg-sky-50/40' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                    <Badge tone={toneByStatus(row.signupStatus)}>{row.signupStatus}</Badge>
                    <Badge tone={toneByStatus(row.inviteStatus)}>{row.inviteStatus}</Badge>
                    <Badge tone={toneByStatus(row.activeStatus)}>{row.activeStatus}</Badge>
                    <Badge tone="blue">{row.roleLabel}</Badge>
                    <Badge tone="slate">직책: {row.title}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{row.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.invitationId ? <ResendInvitationForm invitationId={row.invitationId} compact /> : null}
                  {!row.isInviteOnly ? <Link href={`/settings/team?member=${row.raw.id}#member-edit-${row.raw.id}` as Route} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}>상세 수정</Link> : null}
                </div>
              </div>

              {canManage && !row.isInviteOnly && row.raw.role !== 'org_owner' ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <MemberAdminSummaryForm organizationId={organizationId} membershipId={row.raw.id} actorCategory={row.raw.actor_category} status={row.raw.status} title={row.raw.title} />
                    <MembershipPermissionForm membershipId={row.raw.id} organizationId={organizationId} currentPermissions={row.raw.permissions} actorCategory={row.raw.actor_category} roleTemplateKey={row.raw.permission_template_key} caseScopePolicy={row.raw.case_scope_policy} membershipTitle={row.raw.title} title={`${row.name} 권한 설정`} />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <ClientActionForm
                      action={updateMembershipAdminSummaryAction}
                      successTitle={row.raw.status === 'suspended' ? '구성원을 활성화했습니다.' : '구성원을 비활성화했습니다.'}
                      errorTitle="상태 변경에 실패했습니다."
                      errorCause="권한이 없거나 구성원 상태 저장에 실패했습니다."
                      errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
                    >
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <input type="hidden" name="membershipId" value={row.raw.id} />
                      <input type="hidden" name="actorCategory" value={row.raw.actor_category ?? 'staff'} />
                      <input type="hidden" name="title" value={row.raw.title ?? ''} />
                      <input type="hidden" name="status" value={row.raw.status === 'suspended' ? 'active' : 'suspended'} />
                      <SubmitButton variant="ghost" pendingLabel="처리 중..." className="min-h-11 w-full justify-center rounded-xl border border-slate-200">
                        {row.raw.status === 'suspended' ? '다시 활성화' : '비활성화'}
                      </SubmitButton>
                    </ClientActionForm>
                    <DangerActionButton
                      action={deleteMembershipAction}
                      fields={{ organizationId, membershipId: row.raw.id }}
                      confirmTitle="구성원을 삭제할까요?"
                      confirmDescription="조직 접근 권한이 즉시 해제됩니다. 진행 중인 업무 인수인계 후 삭제를 권장합니다."
                      highlightedInfo={`${row.raw.profile?.full_name ?? '-'} (${row.raw.profile?.email ?? '-'})`}
                      confirmLabel="삭제"
                      variant="danger"
                      successTitle="구성원이 삭제되었습니다."
                      successMessage="해당 구성원의 모든 접근 권한이 해제되었습니다."
                      errorTitle="구성원 삭제에 실패했습니다."
                      errorCause="구성원 상태 변경 저장에 실패했습니다."
                      errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
                      buttonVariant="ghost"
                      className="min-h-11 w-full justify-center rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      삭제
                    </DangerActionButton>
                    {row.raw.profile?.id ? (
                      <DangerActionButton
                        action={revokeUserSessionsAction}
                        fields={{ organizationId, targetProfileId: row.raw.profile.id }}
                        confirmTitle="세션을 강제 종료할까요?"
                        confirmDescription="현재 로그인된 모든 기기에서 즉시 로그아웃됩니다."
                        highlightedInfo={`${row.raw.profile?.full_name ?? '-'} (${row.raw.profile?.email ?? '-'})`}
                        confirmLabel="세션 종료"
                        variant="danger"
                        successTitle="세션을 종료했습니다."
                        successMessage="대상 계정이 다시 로그인해야 합니다."
                        errorTitle="세션 종료에 실패했습니다."
                        errorCause="세션 종료 요청을 처리하지 못했습니다."
                        errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
                        buttonVariant="ghost"
                        className="min-h-11 w-full justify-center rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-50"
                      >
                        모든 기기 로그아웃
                      </DangerActionButton>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">아직 표시할 구성원이 없습니다.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
