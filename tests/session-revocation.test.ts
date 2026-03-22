import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${href}`), {
      digest: 'NEXT_REDIRECT',
      href
    });
  }),
  requireOrganizationUserManagementAccess: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn()
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth', () => ({
  requireOrganizationUserManagementAccess: mocks.requireOrganizationUserManagementAccess,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser
}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

const ADMIN_USER_ID = 'admin-user-id-111';
const TARGET_USER_ID = 'target-user-id-222';
const ORG_ID = 'org-id-abc';

const adminAuthContext = {
  user: { id: ADMIN_USER_ID, email: 'admin@example.com' },
  profile: { id: ADMIN_USER_ID, role: 'org_manager' },
  memberships: [{ organization_id: ORG_ID, role: 'org_manager', status: 'active' }]
};

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe('revokeUserSessionsAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOrganizationUserManagementAccess.mockResolvedValue({ auth: adminAuthContext });
  });

  it('정상 케이스 — 타겟 유저 세션 무효화 성공', async () => {
    const adminSignOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { signOut: adminSignOut } }
    });

    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID, targetProfileId: TARGET_USER_ID });

    await revokeUserSessionsAction(fd);

    // Supabase admin signOut 호출 검증
    expect(adminSignOut).toHaveBeenCalledWith(TARGET_USER_ID, 'global');
    // revalidatePath 호출 검증
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings/team');
  });

  it('자신의 세션을 무효화하려 하면 에러', async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { signOut: vi.fn() } }
    });

    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID, targetProfileId: ADMIN_USER_ID }); // 자기 자신

    await expect(revokeUserSessionsAction(fd)).rejects.toThrow(
      '자신의 세션은 이 기능으로 무효화할 수 없습니다'
    );
  });

  it('organizationId 누락 시 에러', async () => {
    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ targetProfileId: TARGET_USER_ID }); // organizationId 없음

    await expect(revokeUserSessionsAction(fd)).rejects.toThrow('필수 파라미터가 누락되었습니다');
  });

  it('targetProfileId 누락 시 에러', async () => {
    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID }); // targetProfileId 없음

    await expect(revokeUserSessionsAction(fd)).rejects.toThrow('필수 파라미터가 누락되었습니다');
  });

  it('권한 없는 사용자는 requireOrganizationUserManagementAccess에서 차단', async () => {
    mocks.requireOrganizationUserManagementAccess.mockRejectedValue(
      new Error('구성원 세션 무효화는 관리자만 할 수 있습니다.')
    );

    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID, targetProfileId: TARGET_USER_ID });

    await expect(revokeUserSessionsAction(fd)).rejects.toThrow('관리자만 할 수 있습니다');
  });

  it('Supabase Admin API 오류 시 에러 메시지 포함', async () => {
    const adminSignOut = vi.fn().mockResolvedValue({
      error: { message: 'User not found' }
    });
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { signOut: adminSignOut } }
    });

    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID, targetProfileId: TARGET_USER_ID });

    await expect(revokeUserSessionsAction(fd)).rejects.toThrow('세션 무효화에 실패했습니다');
  });

  it('성공 시 Supabase signOut은 global scope으로 호출', async () => {
    const adminSignOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({
      auth: { admin: { signOut: adminSignOut } }
    });

    const { revokeUserSessionsAction } = await import('@/lib/actions/auth-actions');
    const fd = makeFormData({ organizationId: ORG_ID, targetProfileId: TARGET_USER_ID });

    await revokeUserSessionsAction(fd);

    // 반드시 'global' scope — 모든 기기 세션 만료
    const [calledId, calledScope] = adminSignOut.mock.calls[0];
    expect(calledId).toBe(TARGET_USER_ID);
    expect(calledScope).toBe('global');
  });
});
