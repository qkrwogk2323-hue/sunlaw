/**
 * 보안 경계 POST 차단 단위 테스트 — 시나리오 4, 5, 10.
 *
 * 배경:
 *   docs/E2E_TEST_SEED_DESIGN.md에 12 시나리오가 정의돼 있으나 Playwright
 *   E2E(tests/e2e/security-boundary.spec.ts)에는 URL 진입 + 컨트롤 케이스만
 *   9개 구현. 서버 액션 POST를 raw HTTP로 때려서 response를 assertion 하는
 *   것은 E2E 스택에서 복잡하므로, 대신 checkCaseActionAccess 가드 자체를
 *   단위 테스트로 커버.
 *
 *   이 3건이 합쳐져야 E2E 9건 + 단위 3건 = 12 시나리오 = 설계와 일치.
 *
 * 검증 대상 (시나리오 번호는 설계 문서 기준):
 *   4. 비배정 사용자 + rehab action → { ok: false, code: 'NO_ACCESS' }
 *   5. 비배정 사용자 + bankruptcy action → { ok: false, code: 'NO_ACCESS' }
 *   10. wrong subtype (배정 사용자, 파산 사건에 rehab 액션)
 *       → { ok: false, code: 'WRONG_TYPE' }
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_A = '11111111-1111-4111-8111-aaaaaaaaaaa1';
const CASE_REHAB_ID = '22222222-2222-4222-8222-000000000001';
const CASE_BANKRUPTCY_ID = '22222222-2222-4222-8222-000000000002';
const UNASSIGNED_USER_ID = '33333333-3333-4333-8333-unassignedaaa';
const ASSIGNED_USER_ID = '33333333-3333-4333-8333-assignedaaaaa';

const mocks = vi.hoisted(() => ({
  getCurrentAuth: vi.fn(),
  findMembership: vi.fn(),
  getCaseScopeAccess: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentAuth: mocks.getCurrentAuth,
  findMembership: mocks.findMembership,
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/case-scope', () => ({
  getCaseScopeAccess: mocks.getCaseScopeAccess,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

function makeCaseFetchClient(caseRow: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: caseRow, error: null }),
        })),
      })),
    })),
  };
}

describe('보안 경계 POST 차단 — checkCaseActionAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('시나리오 4. 비배정 사용자 + rehab action → NO_ACCESS', async () => {
    mocks.getCurrentAuth.mockResolvedValue({
      user: { id: UNASSIGNED_USER_ID, email: 'unassigned@test' },
      profile: { id: UNASSIGNED_USER_ID },
      memberships: [
        {
          organization_id: ORG_A,
          role: 'staff',
          status: 'active',
          case_scope_policy: 'assigned_cases_only',
        },
      ],
    });
    mocks.findMembership.mockReturnValue({
      organization_id: ORG_A,
      role: 'staff',
      status: 'active',
    });
    // 조직 멤버십은 있지만 restricted + assigned_cases에 이 사건 없음
    mocks.getCaseScopeAccess.mockResolvedValue({
      unrestrictedOrganizationIds: [],
      restrictedOrganizationIds: [ORG_A],
      assignedCaseIds: [], // 이 사용자에게 배정된 사건 없음
    });
    mocks.createSupabaseServerClient.mockResolvedValue(
      makeCaseFetchClient({
        id: CASE_REHAB_ID,
        organization_id: ORG_A,
        case_type: 'insolvency',
        insolvency_subtype: 'individual_rehabilitation',
        lifecycle_status: 'active',
      }),
    );

    const { checkCaseActionAccess } = await import('@/lib/case-access');
    const result = await checkCaseActionAccess(CASE_REHAB_ID, {
      organizationId: ORG_A,
      insolvencySubtypePrefix: 'rehabilitation',
    });

    expect(result).toMatchObject({ ok: false, code: 'NO_ACCESS' });
    if (result.ok === false) {
      expect(result.userMessage).toContain('배정');
    }
  });

  it('시나리오 5. 비배정 사용자 + bankruptcy action → NO_ACCESS', async () => {
    mocks.getCurrentAuth.mockResolvedValue({
      user: { id: UNASSIGNED_USER_ID, email: 'unassigned@test' },
      profile: { id: UNASSIGNED_USER_ID },
      memberships: [
        {
          organization_id: ORG_A,
          role: 'staff',
          status: 'active',
          case_scope_policy: 'assigned_cases_only',
        },
      ],
    });
    mocks.findMembership.mockReturnValue({
      organization_id: ORG_A,
      role: 'staff',
      status: 'active',
    });
    mocks.getCaseScopeAccess.mockResolvedValue({
      unrestrictedOrganizationIds: [],
      restrictedOrganizationIds: [ORG_A],
      assignedCaseIds: [],
    });
    mocks.createSupabaseServerClient.mockResolvedValue(
      makeCaseFetchClient({
        id: CASE_BANKRUPTCY_ID,
        organization_id: ORG_A,
        case_type: 'insolvency',
        insolvency_subtype: 'individual_bankruptcy',
        lifecycle_status: 'active',
      }),
    );

    const { checkCaseActionAccess } = await import('@/lib/case-access');
    const result = await checkCaseActionAccess(CASE_BANKRUPTCY_ID, {
      organizationId: ORG_A,
      insolvencySubtypePrefix: 'bankruptcy',
    });

    expect(result).toMatchObject({ ok: false, code: 'NO_ACCESS' });
  });

  it('시나리오 10. wrong subtype — 파산 사건에 rehab 액션 → WRONG_TYPE', async () => {
    // 배정 사용자 (assigned) — 접근 자체는 통과하지만 subtype 불일치로 거부돼야 함
    mocks.getCurrentAuth.mockResolvedValue({
      user: { id: ASSIGNED_USER_ID, email: 'assigned@test' },
      profile: { id: ASSIGNED_USER_ID },
      memberships: [
        {
          organization_id: ORG_A,
          role: 'staff',
          status: 'active',
          case_scope_policy: 'assigned_cases_only',
        },
      ],
    });
    mocks.findMembership.mockReturnValue({
      organization_id: ORG_A,
      role: 'staff',
      status: 'active',
    });
    mocks.getCaseScopeAccess.mockResolvedValue({
      unrestrictedOrganizationIds: [],
      restrictedOrganizationIds: [ORG_A],
      assignedCaseIds: [CASE_BANKRUPTCY_ID], // 이 사건에는 배정됨
    });
    mocks.createSupabaseServerClient.mockResolvedValue(
      makeCaseFetchClient({
        id: CASE_BANKRUPTCY_ID,
        organization_id: ORG_A,
        case_type: 'insolvency',
        insolvency_subtype: 'individual_bankruptcy', // ← 파산 사건
        lifecycle_status: 'active',
      }),
    );

    const { checkCaseActionAccess } = await import('@/lib/case-access');
    // rehab 액션 prefix로 호출 → WRONG_TYPE으로 거부돼야 함
    const result = await checkCaseActionAccess(CASE_BANKRUPTCY_ID, {
      organizationId: ORG_A,
      insolvencySubtypePrefix: 'rehabilitation',
    });

    expect(result).toMatchObject({ ok: false, code: 'WRONG_TYPE' });
    if (result.ok === false) {
      expect(result.userMessage).toContain('개인회생');
    }
  });

  it('(컨트롤) 배정 사용자 + 올바른 subtype → ok:true', async () => {
    mocks.getCurrentAuth.mockResolvedValue({
      user: { id: ASSIGNED_USER_ID, email: 'assigned@test' },
      profile: { id: ASSIGNED_USER_ID },
      memberships: [
        {
          organization_id: ORG_A,
          role: 'staff',
          status: 'active',
          case_scope_policy: 'assigned_cases_only',
        },
      ],
    });
    mocks.findMembership.mockReturnValue({
      organization_id: ORG_A,
      role: 'staff',
      status: 'active',
    });
    mocks.getCaseScopeAccess.mockResolvedValue({
      unrestrictedOrganizationIds: [],
      restrictedOrganizationIds: [ORG_A],
      assignedCaseIds: [CASE_REHAB_ID],
    });
    mocks.createSupabaseServerClient.mockResolvedValue(
      makeCaseFetchClient({
        id: CASE_REHAB_ID,
        organization_id: ORG_A,
        case_type: 'insolvency',
        insolvency_subtype: 'individual_rehabilitation',
        lifecycle_status: 'active',
      }),
    );

    const { checkCaseActionAccess } = await import('@/lib/case-access');
    const result = await checkCaseActionAccess(CASE_REHAB_ID, {
      organizationId: ORG_A,
      insolvencySubtypePrefix: 'rehabilitation',
    });

    expect(result.ok).toBe(true);
  });
});
