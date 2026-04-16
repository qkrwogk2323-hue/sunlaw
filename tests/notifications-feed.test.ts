/**
 * 알림 단일 feed 테스트 — 2026-04-16 Task 7 중 1번.
 *
 * 리뷰어 지시: "대시보드 · 알림센터 · nav 뱃지의 unread count는 같은 feed 기준."
 * 오늘 `countUnreadNotifications` helper를 단일 진입점으로 도입했는데, 이 helper가
 * 실제로 일관된 필터(recipient_profile_id + trashed_at is null + status='active'
 * + read_at is null)를 적용하는지 mocked Supabase로 검증.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// 테스트마다 교체 가능한 mock 핸들.
// hoisted `vi.mock`이 import보다 먼저 실행되므로, 여기서 선언한 let에 후속 할당
// 하는 방식으로 per-test 동작 주입.
const mockState: {
  auth: any;
  supabaseClient: any;
  captured: { ops: string[][] };
} = {
  auth: { user: { id: 'user-1' }, profile: { id: 'user-1' }, memberships: [{ organization_id: 'org-1' }] },
  supabaseClient: null,
  captured: { ops: [] },
};

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentAuth: vi.fn(async () => mockState.auth),
  getEffectiveOrganizationId: vi.fn(() => 'org-1'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => mockState.supabaseClient),
}));

vi.mock('@/lib/queries/portal', () => ({
  getPortalCases: vi.fn(async () => []),
}));

vi.mock('@/lib/platform-governance', () => ({
  isPlatformManagementOrganization: vi.fn(() => false),
}));

// Supabase chain mock — 체인 끝에서 { count, error } 반환.
function makeSupabaseMock(count: number) {
  const captured: { ops: string[][] } = { ops: [] };
  const makeChain = () => {
    const chain: any = {
      select: vi.fn((...args: any[]) => { captured.ops.push(['select', ...args.map(String)]); return chain; }),
      eq: vi.fn((col: string, val: unknown) => { captured.ops.push(['eq', col, String(val)]); return chain; }),
      is: vi.fn((col: string, val: unknown) => { captured.ops.push(['is', col, String(val)]); return chain; }),
      or: vi.fn((expr: string) => { captured.ops.push(['or', expr]); return chain; }),
      in: vi.fn((col: string, vals: unknown[]) => { captured.ops.push(['in', col, JSON.stringify(vals)]); return chain; }),
      then: (resolve: (v: any) => void) => {
        resolve({ count, error: null });
        return Promise.resolve({ count, error: null });
      },
    };
    return chain;
  };
  const client = { from: vi.fn(() => makeChain()) };
  return { client, captured };
}

beforeEach(() => {
  // 기본 authenticated 상태로 재설정
  mockState.auth = { user: { id: 'user-1' }, profile: { id: 'user-1' }, memberships: [{ organization_id: 'org-1' }] };
  mockState.supabaseClient = null;
  mockState.captured.ops.length = 0;
});

describe('countUnreadNotifications — 단일 feed helper', () => {
  it('인증 없으면 0 반환', async () => {
    mockState.auth = null;
    const { countUnreadNotifications } = await import('@/lib/queries/notifications');
    expect(await countUnreadNotifications()).toBe(0);
  });

  it('기본 호출 시 recipient_profile_id + trashed_at null + status active + read_at null 필터', async () => {
    const mock = makeSupabaseMock(5);
    mockState.supabaseClient = mock.client;
    const { countUnreadNotifications } = await import('@/lib/queries/notifications');
    const n = await countUnreadNotifications();
    expect(n).toBe(5);

    const opSummary = mock.captured.ops.map((o) => o.join(':'));
    expect(opSummary).toContain('eq:recipient_profile_id:user-1');
    expect(opSummary).toContain('is:trashed_at:null');
    expect(opSummary).toContain('eq:status:active');
    expect(opSummary).toContain('is:read_at:null');
  });

  it('organizationId 옵션 전달 시 organization_id 필터가 추가됨', async () => {
    const mock = makeSupabaseMock(3);
    mockState.supabaseClient = mock.client;
    const { countUnreadNotifications } = await import('@/lib/queries/notifications');
    await countUnreadNotifications({ organizationId: 'org-1' });

    const opSummary = mock.captured.ops.map((o) => o.join(':'));
    expect(opSummary).toContain('eq:organization_id:org-1');
  });

  it('includeActionRequired=true면 or 필터로 read_at OR requires_action 검사', async () => {
    const mock = makeSupabaseMock(7);
    mockState.supabaseClient = mock.client;
    const { countUnreadNotifications } = await import('@/lib/queries/notifications');
    await countUnreadNotifications({ includeActionRequired: true });

    const opSummary = mock.captured.ops.map((o) => o.join(':'));
    const orOps = opSummary.filter((o) => o.startsWith('or:'));
    expect(orOps.length).toBe(1);
    expect(orOps[0]).toContain('read_at.is.null');
    expect(orOps[0]).toContain('requires_action.eq.true');
  });

  it('dashboard unread (organizationId 지정) vs nav unread (조직 미지정)은 같은 기본 기준', async () => {
    const mock = makeSupabaseMock(10);
    mockState.supabaseClient = mock.client;
    const { countUnreadNotifications } = await import('@/lib/queries/notifications');

    await countUnreadNotifications({ organizationId: 'org-1' });
    const dashboardOps = mock.captured.ops.map((o) => o.join(':'));
    mock.captured.ops.length = 0;

    await countUnreadNotifications();
    const navOps = mock.captured.ops.map((o) => o.join(':'));

    const common = [
      'eq:recipient_profile_id:user-1',
      'is:trashed_at:null',
      'eq:status:active',
      'is:read_at:null',
    ];
    for (const c of common) {
      expect(dashboardOps).toContain(c);
      expect(navOps).toContain(c);
    }
    expect(dashboardOps).toContain('eq:organization_id:org-1');
    expect(navOps).not.toContain('eq:organization_id:org-1');
  });
});
