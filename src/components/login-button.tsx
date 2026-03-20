'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

const POST_AUTH_NEXT_COOKIE = 'vs-post-auth-next';

function resolveAuthOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
        return parsed.origin;
      }
    } catch {
      // Fall back to current origin when the configured URL is malformed.
    }
  }

  // OAuth PKCE verifier is stored per-origin. In production we prefer the
  // canonical public origin to avoid www/non-www mismatches.
  return window.location.origin;
}

function resolveCookieDomain(authOrigin: string) {
  const currentHostname = window.location.hostname;
  const authHostname = new URL(authOrigin).hostname;

  if (currentHostname === authHostname) {
    return null;
  }

  const currentWithoutWww = currentHostname.replace(/^www\./, '');
  const authWithoutWww = authHostname.replace(/^www\./, '');

  if (currentWithoutWww !== authWithoutWww) {
    return null;
  }

  if (currentWithoutWww === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(currentWithoutWww)) {
    return null;
  }

  return `.${currentWithoutWww}`;
}

function writePostAuthNextCookie(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return;
  }

  const authOrigin = resolveAuthOrigin();
  const domain = resolveCookieDomain(authOrigin);
  const secure = authOrigin.startsWith('https://') ? '; secure' : '';
  const domainAttribute = domain ? `; domain=${domain}` : '';

  document.cookie = `${POST_AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax${domainAttribute}${secure}`;
}

type LoginButtonProps = {
  idleLabel?: string;
  loadingLabel?: string;
  forceLoginPrompt?: boolean;
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('카카오 인증 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function LoginButton({
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${resolveAuthOrigin()}/auth/callback`;
      const { error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo,
          ...(forceLoginPrompt
            ? {
                queryParams: {
                  prompt: 'login'
                }
              }
            : {})
        }
      }));

      if (error) {
        throw error;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '카카오 로그인 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="lg" onClick={handleLogin} isLoading={loading}>
        {loading ? loadingLabel : idleLabel}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

type LoginButtonWithNextProps = LoginButtonProps & {
  next?: string;
};

export function LoginButtonWithNext({
  next,
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonWithNextProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL('/auth/callback', resolveAuthOrigin());
      writePostAuthNextCookie(next);
      if (next) {
        redirectUrl.searchParams.set('next', next);
      }

      const { error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl.toString(),
          ...(forceLoginPrompt
            ? {
                queryParams: {
                  prompt: 'login'
                }
              }
            : {})
        }
      }));

      if (error) {
        throw error;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '카카오 로그인 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" size="lg" onClick={handleLogin} isLoading={loading}>
        {loading ? loadingLabel : idleLabel}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
