import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireOrganizationActionAccess: vi.fn(),
  createSupabaseServerClient: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock('@/lib/auth', () => ({
  requireOrganizationActionAccess: mocks.requireOrganizationActionAccess
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

const authContext = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
  profile: { id: '11111111-1111-4111-8111-111111111111', full_name: '조직 관리자' }
};

describe('bulk-upload-actions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.requireOrganizationActionAccess.mockResolvedValue({ auth: authContext });
  });

  it('권한 없는 사용자는 의뢰인 일괄 등록에서 차단됨 (error path)', async () => {
    mocks.requireOrganizationActionAccess.mockRejectedValue(new Error('권한 없음'));
    const { bulkUploadClientsAction } = await import('@/lib/actions/bulk-upload-actions');

    await expect(
      bulkUploadClientsAction('22222222-2222-4222-8222-222222222222', '이름,이메일\n홍길동,test@example.com')
    ).rejects.toThrow('권한 없음');
  });

  it('의뢰인 CSV를 저장하고 AI 안내를 만든다 (happy path)', async () => {
    const caseClientsInsert = vi.fn().mockResolvedValue({ error: null });
    const casesSelect = {
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({
        data: [{ id: 'case-1', title: '베인 사건' }],
        error: null
      })
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'cases') {
          return { select: vi.fn(() => casesSelect) };
        }
        if (table === 'case_clients') {
          return { insert: caseClientsInsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      })
    };
    mocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { bulkUploadClientsAction } = await import('@/lib/actions/bulk-upload-actions');
    const result = await bulkUploadClientsAction(
      '22222222-2222-4222-8222-222222222222',
      '이름,이메일,사건제목,특이사항\n홍길동,test@example.com,베인 사건,연락 선호 시간은 오후입니다.'
    );

    expect(result).toMatchObject({ ok: true, created: 1, skipped: 0 });
    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      permission: 'user_manage',
      errorMessage: '의뢰인 일괄 등록 권한이 없습니다.'
    });
    expect(caseClientsInsert).toHaveBeenCalledTimes(1);
    expect(result.ok && result.aiSuggestions[0]?.suggestion).toContain('연락 이력 탭');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/clients');
  });

  it('권한 없는 사용자는 사건 일괄 등록에서 차단됨 (error path)', async () => {
    mocks.requireOrganizationActionAccess.mockRejectedValue(new Error('관리자만 가능'));
    const { bulkUploadCasesAction } = await import('@/lib/actions/bulk-upload-actions');

    await expect(
      bulkUploadCasesAction('22222222-2222-4222-8222-222222222222', '제목,사건유형\n신규 사건,civil')
    ).rejects.toThrow('관리자만 가능');
  });

  it('사건 CSV를 저장하고 담당자까지 연결한다 (happy path)', async () => {
    const casesInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'case-created-1' },
          error: null
        })
      }))
    }));
    const caseHandlersInsert = vi.fn().mockResolvedValue({ error: null });
    const caseClientsInsert = vi.fn().mockResolvedValue({ error: null });
    const organizationSingle = vi.fn().mockResolvedValue({
      data: { slug: 'vein' },
      error: null
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: organizationSingle
              }))
            }))
          };
        }
        if (table === 'cases') {
          return { insert: casesInsert };
        }
        if (table === 'case_handlers') {
          return { insert: caseHandlersInsert };
        }
        if (table === 'case_clients') {
          return { insert: caseClientsInsert };
        }
        throw new Error(`Unexpected table: ${table}`);
      })
    };
    mocks.createSupabaseServerClient.mockResolvedValue(supabase);

    const { bulkUploadCasesAction } = await import('@/lib/actions/bulk-upload-actions');
    const result = await bulkUploadCasesAction(
      '22222222-2222-4222-8222-222222222222',
      '제목,사건유형,의뢰인이름,의뢰인이메일\n신규 사건,insolvency,홍길동,test@example.com'
    );

    expect(result).toMatchObject({ ok: true, created: 1, skipped: 0 });
    expect(mocks.requireOrganizationActionAccess).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', {
      errorMessage: '사건 일괄 등록 권한이 없습니다.'
    });
    expect(casesInsert).toHaveBeenCalledTimes(1);
    expect(caseHandlersInsert).toHaveBeenCalledTimes(1);
    expect(caseClientsInsert).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/cases');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
  });
});
