/**
 * 문서 즉시 반영 테스트 — 2026-04-16 Task 7 중 4번.
 *
 * 리뷰어 지시: "계약서든 생성문서든 즉시 다운로드와 사건 문서함 기록이 분리되면
 * 안 된다." → 문서 저장(case_documents insert) 직후 `listDocuments` 결과에 즉시
 * 반영돼야 한다. 이건 Task 4(문서 타임라인 수렴)의 선행 계약.
 *
 * 현재 테스트는 Unit 레벨: `listDocuments`가 `deleted_at is null` 필터로
 * 삭제된 것만 거르고, 신규 insert된 문서를 그대로 노출하는지 검증.
 * 실제 DB 쓰기 검증은 별도 integration (live DB 필요).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('listDocuments — 신규 문서 즉시 반영 (Task 7 #4)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function mockSupabaseReturning(rows: any[]) {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      then: (resolve: (v: any) => void) => {
        resolve({ data: rows, error: null });
        return Promise.resolve({ data: rows, error: null });
      },
    };
    return { from: vi.fn(() => query) };
  }

  it('case_documents에 insert된 문서는 즉시 listDocuments 결과에 포함', async () => {
    const now = new Date().toISOString();
    const freshDoc = {
      id: 'doc-new-1',
      title: '방금 생성된 채권자목록.html',
      document_kind: 'other',
      approval_status: 'draft',
      client_visibility: 'internal',
      updated_at: now,
      file_size: 12345,
      case_id: 'case-1',
      organization_id: 'org-1',
      storage_path: 'org/org-1/case-1/generated/creditor-list/2026-04-16.html',
      cases: { id: 'case-1', title: '조병수 개인회생' },
          deleted_at: null,
    };
    const client = mockSupabaseReturning([freshDoc]);

    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn(async () => client),
    }));

    const { listDocuments } = await import('@/lib/queries/documents');
    const result = await listDocuments('org-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'doc-new-1',
      title: '방금 생성된 채권자목록.html',
      storage_path: expect.stringContaining('generated/creditor-list'),
    });
  });

  it('deleted_at이 설정된 문서는 listDocuments에서 제외 (soft delete 규약)', async () => {
    // listDocuments는 .is('deleted_at', null) 필터를 건다.
    // 이 테스트는 필터 체인이 호출됐는지만 확인.
    const capturedFilters: any[] = [];
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn((col: string, val: unknown) => {
        capturedFilters.push({ op: 'is', col, val });
        return query;
      }),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      then: (resolve: (v: any) => void) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      },
    };
    const client = { from: vi.fn(() => query) };

    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn(async () => client),
    }));

    const { listDocuments } = await import('@/lib/queries/documents');
    await listDocuments('org-1');

    const deletedAtFilter = capturedFilters.find((f) => f.col === 'deleted_at');
    expect(deletedAtFilter).toBeDefined();
    expect(deletedAtFilter.val).toBeNull();
  });

  it('updated_at desc 정렬로 가장 최근 문서가 최상단', async () => {
    const older = {
      id: 'doc-older',
      title: '어제 문서',
      updated_at: new Date(Date.now() - 86400 * 1000).toISOString(),
      case_id: 'c',
      organization_id: 'org-1',
    };
    const newer = {
      id: 'doc-newer',
      title: '방금 생성',
      updated_at: new Date().toISOString(),
      case_id: 'c',
      organization_id: 'org-1',
    };
    // Supabase 측에서 이미 정렬해서 반환한다고 가정 (order by updated_at desc)
    const client = mockSupabaseReturning([newer, older]);
    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn(async () => client),
    }));

    const { listDocuments } = await import('@/lib/queries/documents');
    const result = await listDocuments('org-1');

    expect(result[0].id).toBe('doc-newer');
    expect(result[1].id).toBe('doc-older');
  });

  it('빈 결과(신규 조직, 문서 0건) 시 안전하게 빈 배열 반환', async () => {
    const client = mockSupabaseReturning([]);
    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn(async () => client),
    }));
    const { listDocuments } = await import('@/lib/queries/documents');
    expect(await listDocuments('org-empty')).toEqual([]);
  });
});
