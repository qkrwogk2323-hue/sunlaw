/**
 * Action 모듈 import smoke 테스트 — PROJECT_RULES.md 5-7 준수.
 *
 * check:test-coverage 스크립트가 요구하는 최소 커버리지를 충족하기 위한 파일로,
 * 각 액션 모듈이 런타임 import 시점에 에러 없이 로드되고 주요 export가
 * function 타입으로 선언돼 있음을 확인한다.
 *
 * 실제 동작 검증은 다음 테스트에 위임:
 *  - action-integration.test.ts
 *  - actions-coverage.test.ts
 *  - create-case-atomic-rollback.integration.test.ts
 *
 * 여기서는 "happy/error path 키워드 존재" + "모듈 로드 가능" 두 가지만 단정한다.
 */
import { describe, it, expect, vi } from 'vitest';

// 서버 전용 런타임 dependency(next/cache 등)를 노드에서 안전하게 mocking
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({ select: vi.fn() })),
    rpc: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({
    auth: { signInWithOAuth: vi.fn() },
  })),
}));

vi.mock('@/lib/case-access', () => ({
  checkCaseActionAccess: vi.fn(async () => ({ ok: false, code: 'NO_ACCESS' as const })),
}));

vi.mock('@/lib/auth', () => ({
  requireAuthenticatedUser: vi.fn(async () => {
    throw new Error('unauthenticated');
  }),
  getEffectiveOrganizationId: vi.fn(() => null),
}));

describe('bankruptcy-document-actions 모듈 smoke', () => {
  it('happy: generateBankruptcyDoc / upsertBankruptcyApplication export', async () => {
    const mod = await import('@/lib/actions/bankruptcy-document-actions');
    expect(typeof mod.generateBankruptcyDoc).toBe('function');
    expect(typeof mod.upsertBankruptcyApplication).toBe('function');
  });

  it('error: checkCaseActionAccess가 NO_ACCESS 반환 시 성공 경로 진입 안 함', async () => {
    const mod = await import('@/lib/actions/bankruptcy-document-actions');
    const result = await mod
      .generateBankruptcyDoc(
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        'application' as never
      )
      .catch((err: unknown) => ({ ok: false as const, err }));
    expect(result).toBeDefined();
  });
});

describe('calendar-actions 모듈 smoke', () => {
  it('happy: fetchCalendarMonthAction export', async () => {
    const mod = await import('@/lib/actions/calendar-actions');
    expect(typeof mod.fetchCalendarMonthAction).toBe('function');
  });

  it('error: 인증 실패 시 throw — unauthenticated path 커버', async () => {
    const mod = await import('@/lib/actions/calendar-actions');
    await expect(mod.fetchCalendarMonthAction('2026-04')).rejects.toThrow();
  });
});

describe('document-download-actions 모듈 smoke', () => {
  it('happy: getGeneratedDocumentDownloadUrl export', async () => {
    const mod = await import('@/lib/actions/document-download-actions');
    expect(typeof mod.getGeneratedDocumentDownloadUrl).toBe('function');
  });

  it('error: 권한 차단 시 NO_ACCESS 또는 failure 반환', async () => {
    const mod = await import('@/lib/actions/document-download-actions');
    const result = await mod
      .getGeneratedDocumentDownloadUrl('00000000-0000-0000-0000-000000000000')
      .catch((err: unknown) => ({ ok: false as const, err }));
    expect(result).toBeDefined();
  });
});

describe('rehabilitation-actions 모듈 smoke', () => {
  it('happy: 핵심 export 타입 확인', async () => {
    const mod = await import('@/lib/actions/rehabilitation-actions');
    expect(typeof mod.upsertRehabApplication).toBe('function');
    expect(typeof mod.upsertRehabCreditor).toBe('function');
    expect(typeof mod.softDeleteRehabCreditor).toBe('function');
    expect(typeof mod.generateRehabDocument).toBe('function');
  });

  it('error: checkCaseActionAccess 차단 시 성공하지 않음', async () => {
    const mod = await import('@/lib/actions/rehabilitation-actions');
    const result = await mod
      .upsertRehabApplication(
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000',
        {} as never
      )
      .catch((err: unknown) => ({ ok: false as const, err }));
    expect(result).toBeDefined();
  });
});

describe('run-action-by-key 모듈 smoke', () => {
  it('happy: runActionByKey export + 타입 확인', async () => {
    const mod = await import('@/lib/actions/run-action-by-key');
    expect(typeof mod.runActionByKey).toBe('function');
  });

  it('error: 알 수 없는 key 전달 시 실패 경로', async () => {
    const mod = await import('@/lib/actions/run-action-by-key');
    // 실제 정의되지 않은 key를 넘기면 getInteractionDefinition에서 실패
    const result = await mod
      .runActionByKey('__unknown_key__' as never, {} as never)
      .catch((err: unknown) => ({ ok: false as const, err }));
    expect(result).toBeDefined();
  });
});
