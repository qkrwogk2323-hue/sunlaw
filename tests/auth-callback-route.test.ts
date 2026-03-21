import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn()
}));

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL | string) => {
      const location = typeof url === 'string' ? url : url.toString();
      const headers = new Headers({ location });

      return {
        status: 307,
        headers,
        cookies: {
          set: (name: string, value: string, options?: Record<string, unknown>) => {
            const parts = [`${name}=${value}`];
            if (options?.path) parts.push(`Path=${String(options.path)}`);
            if (options && 'maxAge' in options) parts.push(`Max-Age=${String(options.maxAge)}`);
            if (options?.sameSite) parts.push(`SameSite=${String(options.sameSite)}`);
            headers.append('set-cookie', parts.join('; '));
          }
        }
      };
    }
  }
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));

function createRequest(url: string, cookieValue?: string) {
  return {
    url,
    nextUrl: new URL(url),
    cookies: {
      get: (name: string) => {
        if (name !== 'vs-post-auth-next' || !cookieValue) {
          return undefined;
        }

        return { value: cookieValue };
      }
    }
  } as any;
}

describe('auth callback route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn(async () => ({ error: null }))
      }
    });
  });

  it('redirects to the explicit next query when present', async () => {
    const { GET } = await import('@/app/auth/callback/route');

    const response = await GET(createRequest('http://localhost/auth/callback?next=/start/signup?flow=client'));

    expect(response.headers.get('location')).toBe('http://localhost/start/signup?flow=client');
  });

  it('falls back to the saved next cookie when the query is missing', async () => {
    const { GET } = await import('@/app/auth/callback/route');

    const response = await GET(createRequest('http://localhost/auth/callback?code=oauth-code', '/start/signup'));

    expect(response.headers.get('location')).toBe('http://localhost/start/signup');
    expect(response.headers.get('set-cookie')).toContain('vs-post-auth-next=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('ignores unsafe next values and falls back to dashboard', async () => {
    const { GET } = await import('@/app/auth/callback/route');

    const response = await GET(createRequest('http://localhost/auth/callback?next=https://evil.example'));

    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('redirects to login with error when Supabase client initialization fails', async () => {
    mocks.createSupabaseServerClient.mockRejectedValueOnce(new Error('Supabase public environment variables are missing.'));

    const { GET } = await import('@/app/auth/callback/route');

    const response = await GET(createRequest('http://localhost/auth/callback?code=invalid-code'));

    expect(response.headers.get('location')).toMatch(/\/login\?error=/);
  });
});