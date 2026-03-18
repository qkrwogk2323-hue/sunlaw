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
  getCurrentAuth: vi.fn(),
  hasActivePlatformAdminView: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  createInvitationToken: vi.fn(() => 'invite-token-123456'),
  hashInvitationToken: vi.fn(() => 'hashed-invite-token'),
  writeSupportSessionCookie: vi.fn(),
  clearSupportSessionCookie: vi.fn()
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
  getCurrentAuth: mocks.getCurrentAuth,
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

vi.mock('@/lib/support-cookie', () => ({
  writeSupportSessionCookie: mocks.writeSupportSessionCookie,
  clearSupportSessionCookie: mocks.clearSupportSessionCookie
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
    mocks.requireAuthenticatedUser.mockResolvedValue(authContext);
    mocks.requireOrganizationActionAccess.mockResolvedValue({
      auth: authContext,
      membership: authContext.memberships[0]
    });
    mocks.requirePlatformAdminAction.mockResolvedValue(authContext);
    mocks.getCurrentAuth.mockResolvedValue(authContext);
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

  it('rejects organization signup files whose actual signature does not match the claimed document type', async () => {
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));

    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn()
    });
    mocks.createSupabaseAdminClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({ upload, remove }))
      },
      from: vi.fn()
    });

    const formData = new FormData();
    formData.set('name', '시그니처 검증 테스트 조직');
    formData.set('kind', 'law_firm');
    formData.set('businessNumber', '220-81-62517');
    formData.set('representativeName', '');
    formData.set('representativeTitle', '');
    formData.set('email', '');
    formData.set('phone', '');
    formData.set('addressLine1', '');
    formData.set('addressLine2', '');
    formData.set('postalCode', '');
    formData.set('websiteUrl', '');
    formData.set('note', '');
    formData.set('requestedModules', 'client_portal');
    formData.set('businessRegistrationDocument', new File(['not-a-real-pdf'], 'business-license.pdf', { type: 'application/pdf' }));

    const { submitOrganizationSignupRequestAction } = await import('@/lib/actions/organization-actions');

    await expect(submitOrganizationSignupRequestAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, '/organization-request?error=%EC%8B%A4%EC%A0%9C%20%ED%8C%8C%EC%9D%BC%20%ED%98%95%EC%8B%9D%EC%9D%84%20%ED%99%95%EC%9D%B8%ED%95%A0%20%EC%88%98%20%EC%97%86%EC%8A%B5%EB%8B%88%EB%8B%A4.%20PDF%2C%20PNG%2C%20JPG%20%ED%8C%8C%EC%9D%BC%EB%A7%8C%20%EC%97%85%EB%A1%9C%EB%93%9C%ED%95%B4%20%EC%A3%BC%EC%84%B8%EC%9A%94.');
      return true;
    });

    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('updates membership permissions through the shared manager guard', async () => {
    const writeClient = createMembershipUpdateClient();
    mocks.createSupabaseServerClient.mockResolvedValue(writeClient.client);

    const formData = new FormData();
    formData.set('membershipId', '55555555-5555-4555-8555-555555555555');
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('actorCategory', 'staff');
    formData.set('roleTemplateKey', 'org_staff');
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
      permission_template_key: 'org_staff',
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

  it('does not demote an existing client account when an additional access request is approved', async () => {
    const requestStatusUpdateEq = vi.fn(async () => ({ error: null }));
    const requestStatusUpdate = vi.fn(() => ({ eq: requestStatusUpdateEq }));
    const requestLookupMaybeSingle = vi.fn(async () => ({
      data: {
        id: '88888888-8888-4888-8888-888888888888',
        requester_profile_id: 'client-profile-1',
        requester_name: '의뢰인',
        target_organization_id: '22222222-2222-4222-8222-222222222222',
        status: 'pending',
        organization: { name: '테스트 조직' }
      },
      error: null
    }));
    const requestLookupEqOrg = vi.fn(() => ({ maybeSingle: requestLookupMaybeSingle }));
    const requestLookupEqId = vi.fn(() => ({ eq: requestLookupEqOrg }));
    const requestLookupSelect = vi.fn(() => ({ eq: requestLookupEqId }));
    const profileUpdateEq = vi.fn(async () => ({ error: null }));
    const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }));
    const notificationResolveIs = vi.fn(async () => ({ error: null }));
    const notificationResolveTarget = vi.fn(() => ({ is: notificationResolveIs }));
    const notificationResolveEntity = vi.fn(() => ({ eq: notificationResolveTarget }));
    const notificationResolveOrg = vi.fn(() => ({ eq: notificationResolveEntity }));
    const notificationResolve = vi.fn(() => ({ eq: notificationResolveOrg }));
    const notificationInsert = vi.fn(async () => ({ error: null }));

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'client_access_requests') {
          return {
            select: requestLookupSelect,
            update: requestStatusUpdate
          };
        }
        if (table === 'profiles') {
          return { update: profileUpdate };
        }
        if (table === 'notifications') {
          return {
            update: notificationResolve,
            insert: notificationInsert
          };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      })
    });

    const formData = new FormData();
    formData.set('requestId', '88888888-8888-4888-8888-888888888888');
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('decision', 'approved');
    formData.set('reviewNote', '승인');

    const { reviewClientAccessRequestAction } = await import('@/lib/actions/organization-actions');

    await reviewClientAccessRequestAction(formData);

    expect(profileUpdate).not.toHaveBeenCalled();
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      action_label: '연결 상태 보기',
      action_href: '/start/pending'
    }));
  });

  it('does not activate a client profile when case attachment keeps portal access disabled', async () => {
    const requestLookupMaybeSingle = vi.fn(async () => ({
      data: {
        id: '66666666-6666-4666-8666-666666666666',
        requester_profile_id: 'client-profile-1',
        requester_name: '의뢰인',
        requester_email: 'client@example.com',
        target_organization_id: '22222222-2222-4222-8222-222222222222',
        status: 'approved'
      },
      error: null
    }));
    const requestLookupEqOrg = vi.fn(() => ({ maybeSingle: requestLookupMaybeSingle }));
    const requestLookupEqId = vi.fn(() => ({ eq: requestLookupEqOrg }));
    const requestLookupSelect = vi.fn(() => ({ eq: requestLookupEqId }));

    const caseLookupMaybeSingle = vi.fn(async () => ({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        organization_id: '22222222-2222-4222-8222-222222222222',
        title: '채권 회수 사건',
        lifecycle_status: 'active'
      },
      error: null
    }));
    const caseLookupNeq = vi.fn(() => ({ maybeSingle: caseLookupMaybeSingle }));
    const caseLookupEqOrg = vi.fn(() => ({ neq: caseLookupNeq }));
    const caseLookupEqId = vi.fn(() => ({ eq: caseLookupEqOrg }));
    const caseLookupSelect = vi.fn(() => ({ eq: caseLookupEqId }));

    const existingByProfileMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const existingByProfileEqProfile = vi.fn(() => ({ maybeSingle: existingByProfileMaybeSingle }));
    const existingByProfileEqCase = vi.fn(() => ({ eq: existingByProfileEqProfile }));

    const existingByEmailMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const existingByEmailEqEmail = vi.fn(() => ({ maybeSingle: existingByEmailMaybeSingle }));
    const existingByEmailEqCase = vi.fn(() => ({ eq: existingByEmailEqEmail }));

    const caseClientsSelect = vi.fn()
      .mockReturnValueOnce({ eq: existingByProfileEqCase })
      .mockReturnValueOnce({ eq: existingByEmailEqCase });
    const caseClientsInsert = vi.fn(async () => ({ error: null }));
    const notificationInsert = vi.fn(async () => ({ error: null }));
    const profileUpdateEq = vi.fn(async () => ({ error: null }));
    const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }));

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'client_access_requests') {
          return { select: requestLookupSelect };
        }
        if (table === 'cases') {
          return { select: caseLookupSelect };
        }
        if (table === 'case_clients') {
          return {
            select: caseClientsSelect,
            insert: caseClientsInsert
          };
        }
        if (table === 'notifications') {
          return { insert: notificationInsert };
        }
        if (table === 'profiles') {
          return { update: profileUpdate };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      })
    });

    const formData = new FormData();
    formData.set('requestId', '66666666-6666-4666-8666-666666666666');
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('caseId', '77777777-7777-4777-8777-777777777777');
    formData.set('relationLabel', '의뢰인');

    const { attachClientAccessRequestToCaseAction } = await import('@/lib/actions/organization-actions');

    await attachClientAccessRequestToCaseAction(formData);

    expect(caseClientsInsert).toHaveBeenCalledWith(expect.objectContaining({
      is_portal_enabled: false
    }));
    expect(profileUpdate).not.toHaveBeenCalled();
    expect(notificationInsert).toHaveBeenCalledWith(expect.objectContaining({
      action_label: null,
      action_href: null
    }));
  });

  it('rejects support access requests for users outside the target organization', async () => {
    const organizationSingle = vi.fn(async () => ({
      data: { id: '22222222-2222-4222-8222-222222222222', name: '테스트 조직' },
      error: null
    }));
    const organizationEq = vi.fn(() => ({ single: organizationSingle }));
    const organizationSelect = vi.fn(() => ({ eq: organizationEq }));

    const profileMaybeSingle = vi.fn(async () => ({
      data: { id: 'outside-profile', email: 'outside@example.com', full_name: '외부 사용자' },
      error: null
    }));
    const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
    const profileSelect = vi.fn(() => ({ eq: profileEq }));
    const membershipMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const membershipEqStatus = vi.fn(() => ({ maybeSingle: membershipMaybeSingle }));
    const membershipEqProfile = vi.fn(() => ({ eq: membershipEqStatus }));
    const membershipEqOrg = vi.fn(() => ({ eq: membershipEqProfile }));
    const membershipSelect = vi.fn(() => ({ eq: membershipEqOrg }));

    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'organizations') {
          return { select: organizationSelect };
        }

        throw new Error(`Unexpected server table: ${table}`);
      })
    });

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { select: profileSelect };
        }
        if (table === 'organization_memberships') {
          return { select: membershipSelect };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      })
    });

    const formData = new FormData();
    formData.set('organizationId', '22222222-2222-4222-8222-222222222222');
    formData.set('targetEmail', 'outside@example.com');
    formData.set('reason', '조직 외부 계정 여부 점검을 위한 지원 요청');
    formData.set('expiresHours', '4');

    const { createSupportRequestAction } = await import('@/lib/actions/support-actions');

    await expect(createSupportRequestAction(formData)).rejects.toThrow('지원 접속 대상은 해당 조직의 활성 구성원이어야 합니다.');
  });

  it('blocks duplicate document review requests when a document is already pending', async () => {
    const documentSingle = vi.fn(async () => ({
      data: {
        id: 'doc-1',
        case_id: 'case-1',
        organization_id: '22222222-2222-4222-8222-222222222222',
        approval_requested_by: authContext.user.id,
        title: '위임장',
        approval_status: 'pending_review',
        row_version: 3
      },
      error: null
    }));
    const documentEq = vi.fn(() => ({ single: documentSingle }));
    const documentSelect = vi.fn(() => ({ eq: documentEq }));

    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'case_documents') {
          return { select: documentSelect };
        }

        throw new Error(`Unexpected server table: ${table}`);
      })
    });

    const { requestDocumentReviewAction } = await import('@/lib/actions/case-actions');

    await expect(requestDocumentReviewAction('doc-1')).rejects.toThrow('현재 상태에서는 결재를 다시 요청할 수 없습니다.');
  });

  it('creates collection compensation plans atomically through the RPC helper', async () => {
    const casesSingle = vi.fn(async () => ({
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        organization_id: '22222222-2222-4222-8222-222222222222',
        title: '추심 사건'
      },
      error: null
    }));
    const casesEq = vi.fn(() => ({ single: casesSingle }));
    const casesSelect = vi.fn(() => ({ eq: casesEq }));
    const rpc = vi.fn(async () => ({ error: null }));

    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'cases') {
          return { select: casesSelect };
        }

        throw new Error(`Unexpected server table: ${table}`);
      }),
      rpc
    });

    const formData = new FormData();
    formData.set('caseId', '55555555-5555-4555-8555-555555555555');
    formData.set('targetKind', 'membership');
    formData.set('beneficiaryMembershipId', '66666666-6666-4666-8666-666666666666');
    formData.set('beneficiaryCaseOrganizationId', '');
    formData.set('title', '기본 보수 규칙');
    formData.set('description', '초기 초안');
    formData.set('settlementCycle', 'monthly');
    formData.set('fixedAmount', '100000');
    formData.set('baseMetric', 'recovered_amount');
    formData.set('effectiveFrom', '2026-03-16');
    formData.set('ruleJson', JSON.stringify({ share: 0.3 }));

    const { addCollectionCompensationPlanAction } = await import('@/lib/actions/collection-actions');

    await addCollectionCompensationPlanAction(formData);

    expect(rpc).toHaveBeenCalledWith('create_collection_compensation_plan_atomic', expect.objectContaining({
      p_case_id: '55555555-5555-4555-8555-555555555555',
      p_organization_id: '22222222-2222-4222-8222-222222222222',
      p_title: '기본 보수 규칙',
      p_rule_json: { share: 0.3 }
    }));
  });

  it('redirects organization signup back with an inline error when the signed-in account has no email', async () => {
    mocks.requireAuthenticatedUser.mockResolvedValueOnce({
      ...authContext,
      user: {
        ...authContext.user,
        email: undefined
      },
      profile: {
        ...authContext.profile,
        email: null
      }
    });

    const formData = new FormData();
    formData.set('name', '테스트 조직');
    formData.set('kind', 'law_firm');
    formData.set('businessNumber', '123-45-67891');
    formData.set('representativeName', '');
    formData.set('representativeTitle', '');
    formData.set('email', '');
    formData.set('phone', '');
    formData.set('addressLine1', '');
    formData.set('addressLine2', '');
    formData.set('postalCode', '');
    formData.set('websiteUrl', '');
    formData.set('note', '');
    formData.set('businessRegistrationDocument', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])], 'registration.pdf', { type: 'application/pdf' }));

    const { submitOrganizationSignupRequestAction } = await import('@/lib/actions/organization-actions');

    const expectedMessage = encodeURIComponent('로그인 계정에 이메일 정보가 없어 요청을 제출할 수 없습니다. 카카오 계정 이메일 제공에 동의한 뒤 다시 시도해 주세요.');

    await expect(submitOrganizationSignupRequestAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, `/organization-request?error=${expectedMessage}`);
      return true;
    });
  });

  it('keeps a successful organization signup submission even if notifications fail afterwards', async () => {
    const requestInsertSingle = vi.fn(async () => ({
      data: { id: 'signup-request-1' },
      error: null
    }));
    const requestInsertSelect = vi.fn(() => ({ single: requestInsertSingle }));
    const requestInsert = vi.fn(() => ({ select: requestInsertSelect }));
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const notificationInsert = vi.fn(async () => ({ error: new Error('notification failure') }));

    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'organization_signup_requests') {
          return { insert: requestInsert };
        }

        throw new Error(`Unexpected server table: ${table}`);
      }),
      rpc: vi.fn()
    });

    mocks.createSupabaseAdminClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({ upload, remove }))
      },
      from: vi.fn((table: string) => {
        if (table === 'notifications') {
          return { insert: notificationInsert };
        }
        if (table === 'profiles') {
          return { select: vi.fn() };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      })
    });

    const formData = new FormData();
    formData.set('name', '알림 실패 테스트 조직');
    formData.set('kind', 'law_firm');
    formData.set('businessNumber', '220-81-62517');
    formData.set('representativeName', '대표자');
    formData.set('representativeTitle', '대표');
    formData.set('email', 'org@example.com');
    formData.set('phone', '01012345678');
    formData.set('addressLine1', '서울시');
    formData.set('addressLine2', '101호');
    formData.set('postalCode', '01234');
    formData.set('websiteUrl', 'https://example.com');
    formData.set('note', '테스트');
    formData.set('requestedModules', 'client_portal');
    formData.set('businessRegistrationDocument', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x32, 0x33])], 'registration.pdf', { type: 'application/pdf' }));

    const { submitOrganizationSignupRequestAction } = await import('@/lib/actions/organization-actions');

    await expect(submitOrganizationSignupRequestAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, '/organization-request?submitted=1');
      return true;
    });

    expect(upload).toHaveBeenCalled();
    expect(requestInsert).toHaveBeenCalled();
    expect(notificationInsert).toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('treats an already-approved organization signup as idempotent instead of creating another organization', async () => {
    const requestMaybeSingle = vi.fn(async () => ({
      data: {
        id: 'request-1',
        requester_profile_id: 'requester-1',
        status: 'approved',
        approved_organization_id: 'existing-org-1'
      },
      error: null
    }));
    const requestEq = vi.fn(() => ({ maybeSingle: requestMaybeSingle }));
    const requestSelect = vi.fn(() => ({ eq: requestEq }));
    const organizationInsert = vi.fn(async () => ({ data: null, error: null }));

    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'organization_signup_requests') {
          return { select: requestSelect };
        }
        if (table === 'organizations') {
          return { insert: organizationInsert };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      })
    });

    const formData = new FormData();
    formData.set('requestId', 'request-1');
    formData.set('decision', 'approved');
    formData.set('reviewNote', '재시도');

    const { reviewOrganizationSignupRequestAction } = await import('@/lib/actions/organization-actions');

    await expect(reviewOrganizationSignupRequestAction(formData)).rejects.toSatisfy((error: unknown) => {
      expectRedirectError(error, '/organizations/existing-org-1');
      return true;
    });

    expect(organizationInsert).not.toHaveBeenCalled();
  });
});
