import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { resolveSupabaseCookieDomain } from '@/lib/supabase/cookie-options';
import {
  INTERACTION_ACTION_KEYS,
  getInteractionDefinition,
  type InteractionActionKey,
  type InteractionKey
} from '@/lib/interactions/registry';
import { ROUTES } from '@/lib/routes/registry';

const POST_AUTH_NEXT_COOKIE = 'vs-post-auth-next';

class OAuthTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthTimeoutError';
  }
}

export type ActionStage =
  | 'supabase.client.created'
  | 'oauth.signin.before'
  | 'oauth.signin.success'
  | 'oauth.signin.timeout'
  | 'oauth.signin.error';

export type ActionErrorCode =
  | 'supabase-init-failed'
  | 'oauth-timeout'
  | 'oauth-start-failed'
  | 'unknown';

export type RunActionResult =
  | { ok: true }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      cause?: unknown;
    };

export type RunActionOptions = {
  next?: string;
  forceLoginPrompt?: boolean;
  timeoutMs?: number;
  onStage?: (stage: ActionStage, payload?: Record<string, unknown>) => void;
};

function resolveAuthOrigin() {
  return window.location.origin;
}

function isSafeNextPath(next?: string): next is string {
  return Boolean(next && next.startsWith('/') && !next.startsWith('//'));
}

function writePostAuthNextCookie(next?: string) {
  if (!isSafeNextPath(next)) {
    return;
  }
  const nextPath = next;

  const authOrigin = resolveAuthOrigin();
  const domain = resolveSupabaseCookieDomain(window.location.hostname);
  const secure = authOrigin.startsWith('https://') ? '; secure' : '';
  const domainAttribute = domain ? `; domain=${domain}` : '';

  document.cookie = `${POST_AUTH_NEXT_COOKIE}=${encodeURIComponent(nextPath)}; path=/; max-age=600; samesite=lax${domainAttribute}${secure}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new OAuthTimeoutError('카카오 인증 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'));
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

async function runKakaoLoginAction(options: RunActionOptions = {}): Promise<RunActionResult> {
  const {
    next,
    forceLoginPrompt = true,
    timeoutMs = 12000,
    onStage
  } = options;

  let supabase: ReturnType<typeof createSupabaseBrowserClient>;
  try {
    supabase = createSupabaseBrowserClient();
    onStage?.('supabase.client.created', { hasClient: Boolean(supabase) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase 브라우저 클라이언트 생성에 실패했습니다.';
    onStage?.('oauth.signin.error', { message });
    return {
      ok: false,
      code: 'supabase-init-failed',
      message,
      cause: error
    };
  }

  try {
    const redirectUrl = new URL(ROUTES.AUTH_CALLBACK, resolveAuthOrigin());
    writePostAuthNextCookie(next);
    if (isSafeNextPath(next)) {
      redirectUrl.searchParams.set('next', next);
    }

    onStage?.('oauth.signin.before', { redirectTo: redirectUrl.toString() });
    const { error } = await withTimeout(
      supabase.auth.signInWithOAuth({
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
      }),
      timeoutMs
    );

    if (error) {
      onStage?.('oauth.signin.error', { message: error.message });
      return {
        ok: false,
        code: 'oauth-start-failed',
        message: error.message || 'OAuth 시작에 실패했습니다.',
        cause: error
      };
    }

    onStage?.('oauth.signin.success');
    return { ok: true };
  } catch (error) {
    if (error instanceof OAuthTimeoutError) {
      onStage?.('oauth.signin.timeout', { message: error.message });
      return {
        ok: false,
        code: 'oauth-timeout',
        message: error.message,
        cause: error
      };
    }

    const message = error instanceof Error ? error.message : '카카오 로그인 연결에 실패했습니다.';
    onStage?.('oauth.signin.error', { message });
    return {
      ok: false,
      code: 'unknown',
      message,
      cause: error
    };
  }
}

async function runActionByActionKey(
  actionKey: InteractionActionKey,
  options: RunActionOptions = {}
): Promise<RunActionResult> {
  if (actionKey === INTERACTION_ACTION_KEYS.AUTH_LOGIN_KAKAO) {
    return runKakaoLoginAction(options);
  }

  return {
    ok: false,
    code: 'unknown',
    message: `등록되지 않은 actionKey입니다: ${actionKey}`
  };
}

export async function runActionByKey(
  key: InteractionKey,
  options: RunActionOptions = {}
): Promise<RunActionResult> {
  const actionKey = getInteractionDefinition(key).actionKey;
  if (!actionKey) {
    return { ok: true };
  }
  return runActionByActionKey(actionKey, options);
}
