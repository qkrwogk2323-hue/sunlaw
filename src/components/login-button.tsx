'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import {
  resolveCanonicalAuthOrigin,
  resolveSupabaseCookieDomain
} from '@/lib/supabase/cookie-options';

const POST_AUTH_NEXT_COOKIE = 'vs-post-auth-next';

function resolveAuthOrigin() {
  const currentOrigin = window.location.origin;

  const canonicalOrigin = resolveCanonicalAuthOrigin();
  if (!canonicalOrigin) {
    return currentOrigin;
  }

  const currentHost = window.location.hostname.replace(/^www\./, '');
  const canonicalHost = new URL(canonicalOrigin).hostname.replace(/^www\./, '');

  // Keep PKCE flow on the same origin that started login to avoid missing code verifier/state.
  if (currentHost === canonicalHost) {
    return currentOrigin;
  }

  return canonicalOrigin;
}

function writePostAuthNextCookie(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return;
  }

  const authOrigin = resolveAuthOrigin();
  const domain = resolveSupabaseCookieDomain(window.location.hostname);
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
