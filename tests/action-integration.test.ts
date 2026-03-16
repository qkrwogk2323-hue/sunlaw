import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${href}`), {
      digest: 'NEXT_REDIRECT',
      href
    });
  }),
  requireOrganizationActionAccess: vi.fn(),
  requirePlatformAdminAction: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  hasActivePlatformAdminView: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createInvitationToken: vi.fn(() => 'invite-token-123456'),
  hashInvitationToken: vi.fn(() => 'hashed-invite-token')
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect
}));

vi.mock('@/lib/auth', () => ({
  requireOrganizationActionAccess: mocks.requireOrganizationActionAccess,
  requirePlatformAdminAction: mocks.requirePlatformAdminAction,
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  hasActivePlatformAdminView: mocks.hasActivePlatformAdminView,
  isManagementRole: (role?: string | null) => role === 'org_owner' || role === 'org_manager'
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock('@/lib/invitations', () => ({
  createInvitationToken: mocks.createInvitationToken,
  hashInvitationToken: mocks.hashInvitationToken
}));

const authContext = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'manager@veinspiral.local'
  },
  profile: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'manager@veinspiral.local',
    full_name: '조직 관리자',
    platform_role: 'platform_user',
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
      id: '33333333-3333-4333-8333-333333333333',
      organization_id: '22222222-2222-4222-8222-222222222222',
      role: 'org_manager',
      status: 'active',
      title: '사무장',
      permissions: {
        case_create: true,
        case_edit: true,
        user_manage: true
      },
      actor_category: 'admin',
      permission_template_key: 'admin_general',
      case_scope_policy: 'all_org_cases',
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

function expectRedirectError(error: unknown, href: string) {
  expect(error).toMatchObject({ digest: 'NEXT_REDIRECT', href });
}

function createCaseWriteClient(caseId = '44444444-4444-4444-8444-444444444444') {
  const casesInsert = vi.fn((payload: Record<string, unknown>) => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { id: caseId, payload }, error: null }))
    }))
  }));
  const caseHandlersInsert = vi.fn(async () => ({ error: null }));
  const caseOrganizationsInsert = vi.fn(async () => ({ error: null }));

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'cases') {
          return { insert: casesInsert };
        }
        if (table === 'case_handlers') {
          return { insert: caseHandlersInsert };
        }
        if (table === 'case_organizations') {
          return { insert: caseOrganizationsInsert };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    },
    casesInsert,
    caseHandlersInsert,
    caseOrganizationsInsert,
    caseId
  };
}

function createInvitationWriteClient() {
  const invitationsInsert = vi.fn(async () => ({ error: null }));

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'invitations') {
          return { insert: invitationsInsert };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    },
    invitationsInsert
  };
}

function createMembershipUpdateClient() {
  const eqOrganizationId = vi.fn(async () => ({ error: null }));
  const eqMembershipId = vi.fn(() => ({
    eq: eqOrganizationId
  }));
  const updateMemberships = vi.fn(() => ({
    eq: eqMembershipId
  }));

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === 'organization_memberships') {
          return { update: updateMemberships };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    },
    updateMemberships,
    eqMembershipId,
    eqOrganizationId
  };
}

describe('server action integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireOrganizationActionAccess.mockResolvedValue({
      auth: authContext,
      membership: authContext.memberships[0]
    });
    mocks.requirePlatformAdminAction.mockResolvedValue(authContext);
  });

  it('creates a case through the shared organization guard', async () => {
    const writeClient = createCaseWriteClient();
    mocks.createSupabaseServerClient.mockResolvedValue(writeClient.client);

    const formData = new FormData();
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('title', '신규 채권 회수');
    formData.set('caseType', 'debt_collection');
    formData.set('principalAmount', '1500000');
    formData.set('openedOn', '2026-03-15');
    formData.set('courtName', '');
    formData.set('caseNumber', '');
    formData.set('summary', '');
    formData.set('billingPlanSummary', '');
    formData.set('billingFollowUpDueOn', '');

    const { createCaseAction } = await import('@/lib/actions/case-actions');

    await expect(createCaseAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, `/cases/${writeClient.caseId}`);
      return true;
    });

    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      permission: 'case_create',
      errorMessage: '사건 생성 권한이 없습니다.'
    });
    expect(writeClient.casesInsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: '22222222-2222-4222-8222-222222222222',
      title: '신규 채권 회수',
      case_type: 'debt_collection',
      created_by: authContext.user.id,
      updated_by: authContext.user.id
    }));
    expect(writeClient.caseHandlersInsert).toHaveBeenCalled();
    expect(writeClient.caseOrganizationsInsert).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/cases');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  it('creates a staff invitation through the shared manager guard', async () => {
    const writeClient = createInvitationWriteClient();
    mocks.createSupabaseServerClient.mockResolvedValue(writeClient.client);

    const formData = new FormData();
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('email', 'staff@veinspiral.local');
    formData.set('membershipTitle', '플랫폼 지원');
    formData.set('note', '');
    formData.set('actorCategory', 'admin');
    formData.set('roleTemplateKey', 'admin_general');
    formData.set('caseScopePolicy', 'all_org_cases');
    formData.set('expiresHours', '24');

    const { createStaffInvitationAction } = await import('@/lib/actions/organization-actions');

    await expect(createStaffInvitationAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, '/settings/team?invite=invite-token-123456');
      return true;
    });

    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      requireManager: true,
      permission: 'user_manage',
      errorMessage: '조직 관리자만 직원을 초대할 수 있습니다.'
    });
    expect(writeClient.invitationsInsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: '22222222-2222-4222-8222-222222222222',
      email: 'staff@veinspiral.local',
      requested_role: 'org_manager',
      created_by: authContext.user.id,
      token_hash: 'hashed-invite-token'
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings/team');
  });

  it('updates membership permissions through the shared manager guard', async () => {
    const writeClient = createMembershipUpdateClient();
    mocks.createSupabaseServerClient.mockResolvedValue(writeClient.client);

    const formData = new FormData();
    formData.set('membershipId', '55555555-5555-4555-8555-555555555555');
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('actorCategory', 'staff');
    formData.set('roleTemplateKey', 'office_manager');
    formData.set('caseScopePolicy', 'assigned_cases_only');
    formData.set('membershipTitle', '실무 담당');
    formData.set('case_edit', 'on');
    formData.set('user_manage', 'on');

    const { updateMembershipPermissionsAction } = await import('@/lib/actions/organization-actions');

    await updateMembershipPermissionsAction(formData);

    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      requireManager: true,
      permission: 'user_manage',
      errorMessage: '권한 설정 권한이 없습니다.'
    });
    expect(writeClient.updateMemberships).toHaveBeenCalledWith(expect.objectContaining({
      role: 'org_staff',
      title: '실무 담당',
      actor_category: 'staff',
      permission_template_key: 'office_manager',
      case_scope_policy: 'assigned_cases_only'
    }));
    expect(writeClient.eqMembershipId).toHaveBeenCalledWith('id', '55555555-5555-4555-8555-555555555555');
    expect(writeClient.eqOrganizationId).toHaveBeenCalledWith('organization_id', '22222222-2222-4222-8222-222222222222');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings/team');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/organizations/22222222-2222-4222-8222-222222222222');
  });

  it('stops client access linking before database work when the shared guard rejects', async () => {
    mocks.requireOrganizationActionAccess.mockRejectedValueOnce(new Error('의뢰인을 사건에 연결할 권한이 없습니다.'));

    const formData = new FormData();
    formData.set('requestId', '66666666-6666-4666-8666-666666666666');
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('caseId', '77777777-7777-4777-8777-777777777777');
    formData.set('relationLabel', '의뢰인');

    const { attachClientAccessRequestToCaseAction } = await import('@/lib/actions/organization-actions');

    await expect(attachClientAccessRequestToCaseAction(formData)).rejects.toThrow('의뢰인을 사건에 연결할 권한이 없습니다.');

    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      permission: 'case_edit',
      errorMessage: '의뢰인을 사건에 연결할 권한이 없습니다.'
    });
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});