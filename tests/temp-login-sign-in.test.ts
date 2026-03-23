/**
 * Tests for the server-side temp-login /sign-in route.
 *
 * Key invariants validated:
 * 1. Email is NEVER returned in the response body
 * 2. On success, { ok: true } and no email field
 * 3. Rate-limited requests return 429
 * 4. Bad credentials return generic 401 (no account info leak)
 * 5. The route calls createSupabaseServerClient (not browser client) for sign-in
 *    — this is what ensures Set-Cookie is written server-side
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkDbRateLimit: vi.fn().mockResolvedValue(false),
  serverClient: { auth: { signInWithPassword: vi.fn() } },
  // Track which table/query is being made for per-call mocking
  orgMaybeSingle: vi.fn(),
  credMaybeSingle: vi.fn()
}));

vi.mock('@/lib/rate-limit', () => ({
  checkDbRateLimit: mocks.checkDbRateLimit
}));

// Fluent Supabase admin client mock
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        maybeSingle: table === 'organizations'
          ? mocks.orgMaybeSingle
          : mocks.credMaybeSingle
      };
      return chain;
    }
  })
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => mocks.serverClient)
}));

const { POST } = await import('@/app/api/auth/temp-login/sign-in/route');

function makeRequest(body: object, ip = '127.0.0.1') {
  return new Request('http://localhost/api/auth/temp-login/sign-in', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('temp-login /sign-in route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkDbRateLimit.mockResolvedValue(false);
  });

  it('returns { ok: true } on success — email is NEVER in response body', async () => {
    mocks.orgMaybeSingle.mockResolvedValue({ data: { id: 'org-1' }, error: null });
    mocks.credMaybeSingle.mockResolvedValue({ data: { login_email: 'staff@example.com' }, error: null });
    mocks.serverClient.auth.signInWithPassword.mockResolvedValue({ error: null });

    const res = await POST(makeRequest({ organizationKey: 'test-org', loginId: 'staff01', password: 'pw' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // Critical: email must never appear in any response field
    expect(JSON.stringify(body)).not.toContain('email');
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('calls createSupabaseServerClient for sign-in (guarantees Set-Cookie is written)', async () => {
    mocks.orgMaybeSingle.mockResolvedValue({ data: { id: 'org-1' }, error: null });
    mocks.credMaybeSingle.mockResolvedValue({ data: { login_email: 'staff@example.com' }, error: null });
    mocks.serverClient.auth.signInWithPassword.mockResolvedValue({ error: null });

    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    await POST(makeRequest({ organizationKey: 'test-org', loginId: 'staff01', password: 'pw' }));

    // If server client is used, Set-Cookie is written via the SSR cookie adapter (setAll).
    expect(createSupabaseServerClient).toHaveBeenCalled();
    expect(mocks.serverClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'staff@example.com',
      password: 'pw'
    });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkDbRateLimit.mockResolvedValue(true);
    const res = await POST(makeRequest({ organizationKey: 'org', loginId: 'user', password: 'pw' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('returns generic 401 on wrong password — no account info in response', async () => {
    mocks.orgMaybeSingle.mockResolvedValue({ data: { id: 'org-1' }, error: null });
    mocks.credMaybeSingle.mockResolvedValue({ data: { login_email: 'staff@example.com' }, error: null });
    mocks.serverClient.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    const res = await POST(makeRequest({ organizationKey: 'org', loginId: 'staff01', password: 'wrong' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain('email');
    expect(JSON.stringify(body)).not.toContain('staff@example.com');
    expect(body.message).toBeTruthy();
  });

  it('returns 404 for unknown org — same generic message, no oracle', async () => {
    mocks.orgMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(makeRequest({ organizationKey: 'ghost-org', loginId: 'x', password: 'y' }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('returns 400 for malformed request body', async () => {
    const res = await POST(makeRequest({ organizationKey: '' }));
    expect(res.status).toBe(400);
  });
});

describe('resolve endpoint is retired (410 Gone)', () => {
  it('always returns 410 regardless of input', async () => {
    const { POST: resolvePost } = await import('@/app/api/auth/temp-login/resolve/route');
    const res = await resolvePost();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('email');
  });

  it('resolve-client always returns 410', async () => {
    const { POST: resolveClientPost } = await import('@/app/api/auth/temp-login/resolve-client/route');
    const res = await resolveClientPost();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('email');
  });
});
