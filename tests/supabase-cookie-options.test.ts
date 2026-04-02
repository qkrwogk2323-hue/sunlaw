import { describe, expect, it, vi } from 'vitest';

describe('getSupabaseCookieOptions', () => {
  it('treats localhost hosts with ports as non-secure local cookies', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.veinspiral.com');

    const { getSupabaseCookieOptions } = await import('@/lib/supabase/cookie-options');

    expect(getSupabaseCookieOptions('localhost:3000', null).secure).toBe(false);
    expect(getSupabaseCookieOptions('127.0.0.1:3000', null).secure).toBe(false);
  });

  it('keeps production hosts secure', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.veinspiral.com');

    const { getSupabaseCookieOptions } = await import('@/lib/supabase/cookie-options');

    expect(getSupabaseCookieOptions('www.veinspiral.com', 'https:').secure).toBe(true);
  });
});
