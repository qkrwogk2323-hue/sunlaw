/**
 * Tests for /api/auth/general-signup HTTP 계약.
 *
 * 검증 대상:
 * 1. 정상 입력 → 201 (rate_limit_buckets 통과)
 * 2. 임계치 초과 → 429 (Retry-After 헤더 포함)
 * 3. 잘못된 입력 → 400 (Zod 검증 실패)
 * 4. 관리자 client 생성 오류 → 400/500 (계정 롤백 포함)
 *
 * `checkDbRateLimit`은 모킹하여 429 경로를 결정적으로 재현한다.
 * 실제 rate_limit_buckets 테이블 동작은 별도 통합 테스트에서 확인.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDbRateLimit: vi.fn().mockResolvedValue(false),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  profilesUpsert: vi.fn(),
  privateUpsert: vi.fn(),
  encryptString: vi.fn((input: string) => `enc(${input})`),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkDbRateLimit: mocks.checkDbRateLimit,
}));

vi.mock('@/lib/pii', () => ({
  encryptString: mocks.encryptString,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        createUser: mocks.createUser,
        deleteUser: mocks.deleteUser,
      },
    },
    from: (table: string) => ({
      upsert: table === 'profiles' ? mocks.profilesUpsert : mocks.privateUpsert,
    }),
  }),
}));

const { POST } = await import('@/app/api/auth/general-signup/route');

function makeRequest(body: object, ip = '127.0.0.1') {
  return new Request('http://localhost/api/auth/general-signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  email: 'user@example.com',
  password: 'password123',
  legalName: '홍길동',
  birthDate: '900101',
  phone: '01012345678',
  privacyConsent: true,
  serviceConsent: true,
};

describe('general-signup /api/auth/general-signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkDbRateLimit.mockResolvedValue(false);
    mocks.createUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.profilesUpsert.mockResolvedValue({ error: null });
    mocks.privateUpsert.mockResolvedValue({ error: null });
  });

  it('returns 201 on valid input', async () => {
    const res = await POST(makeRequest(validPayload));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mocks.checkDbRateLimit.mockResolvedValue(true);
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('calls checkDbRateLimit with correct key, threshold, window, failClosed', async () => {
    await POST(makeRequest(validPayload, '10.0.0.1'));
    expect(mocks.checkDbRateLimit).toHaveBeenCalledWith(
      'general-signup:10.0.0.1',
      5,
      60,
      { failClosed: true }
    );
  });

  it('falls back to user-agent identity when IP is unavailable', async () => {
    const req = new Request('http://localhost/api/auth/general-signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'test-agent' },
      body: JSON.stringify(validPayload),
    });
    await POST(req);
    expect(mocks.checkDbRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('general-signup:ua:'),
      5,
      60,
      { failClosed: true }
    );
  });

  it('returns 400 when payload fails Zod validation (short password)', async () => {
    const res = await POST(makeRequest({ ...validPayload, password: '123' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when privacy consent is missing', async () => {
    const { privacyConsent: _omit, ...withoutConsent } = validPayload;
    void _omit;
    const res = await POST(makeRequest(withoutConsent));
    expect(res.status).toBe(400);
  });

  it('returns 400 when admin createUser fails', async () => {
    mocks.createUser.mockResolvedValue({ data: { user: null }, error: { message: 'already exists' } });
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('already exists');
  });

  it('rolls back auth user if profile upsert fails', async () => {
    mocks.profilesUpsert.mockResolvedValue({ error: { message: 'profile failed' } });
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(mocks.deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('rolls back auth user if private profile upsert fails', async () => {
    mocks.privateUpsert.mockResolvedValue({ error: { message: 'private failed' } });
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(500);
    expect(mocks.deleteUser).toHaveBeenCalledWith('user-1');
  });
});
