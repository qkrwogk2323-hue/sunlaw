import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentAuth: vi.fn(),
  hasActivePlatformAdminView: vi.fn(),
  getPlatformOrganizationContextId: vi.fn(() => null),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn()
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' }
      })
  }
}));

vi.mock('@/lib/auth', () => ({
  getCurrentAuth: mocks.getCurrentAuth,
  hasActivePlatformAdminView: mocks.hasActivePlatformAdminView,
  getPlatformOrganizationContextId: mocks.getPlatformOrganizationContextId
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

const authContext = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'staff@veinspiral.local'
  },
  profile: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'staff@veinspiral.local',
    full_name: '일반 직원',
    platform_role: 'standard',
    default_organization_id: '22222222-2222-4222-8222-222222222222',
    is_active: true,
    is_client_account: false,
    client_account_status: 'pending_initial_approval',
    client_account_status_changed_at: null,
    client_account_status_reason: null,
    client_last_approved_at: null
  },
  memberships: [
    {
      id: 'membership-1',
      organization_id: '22222222-2222-4222-8222-222222222222',
      role: 'org_staff',
      status: 'active',
      title: '직원',
      permissions: {
        case_edit: true
      },
      actor_category: 'staff',
      permission_template_key: 'intern_readonly',
      case_scope_policy: 'assigned_cases_only',
      organization: {
        id: '22222222-2222-4222-8222-222222222222',
        name: '테스트 조직',
        slug: 'test-org',
        kind: 'law_firm',
        enabled_modules: {}
      },
      permission_overrides: []
    }
  ]
};

describe('dashboard ai routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentAuth.mockResolvedValue(authContext);
    mocks.hasActivePlatformAdminView.mockResolvedValue(false);
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn()
    });
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn()
    });
  });

  it('rejects commit requests when the caller lacks request_create permission', async () => {
    const { POST } = await import('@/app/api/dashboard-ai/commit/route');

    const response = await POST(new Request('http://localhost/api/dashboard-ai/commit', {
      method: 'POST',
      body: JSON.stringify({
        organizationId: '22222222-2222-4222-8222-222222222222',
        caseId: 'case-1',
        content: '초안',
        title: '작업 생성',
        summary: '요약'
      }),
      headers: { 'content-type': 'application/json' }
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: '작업 요청 생성이 차단되었습니다.',
      feedback: {
        blocked: '작업 요청 생성이 차단되었습니다.'
      }
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('rejects coordination notifications to others without notification_create permission', async () => {
    const { POST } = await import('@/app/api/dashboard-ai/coordination-commit/route');

    const response = await POST(new Request('http://localhost/api/dashboard-ai/coordination-commit', {
      method: 'POST',
      body: JSON.stringify({
        organizationId: '22222222-2222-4222-8222-222222222222',
        title: '업무 전달',
        summary: '요약',
        recipientMode: 'all',
        selectedItems: [{ label: '서류 확인', detail: '상세', dueAt: null, priority: 'medium' }]
      }),
      headers: { 'content-type': 'application/json' }
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: '알림 생성이 차단되었습니다.',
      feedback: {
        blocked: '알림 생성이 차단되었습니다.'
      }
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
