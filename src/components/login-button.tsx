'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type ActionErrorCode, type ActionStage } from '@/lib/actions/run-action-by-key';
import { executeInteractionByKey } from '@/lib/interactions/execute-interaction-by-key';
import { INTERACTION_KEYS } from '@/lib/interactions/registry';

type LoginButtonProps = {
  idleLabel?: string;
  loadingLabel?: string;
  forceLoginPrompt?: boolean;
};

type LoginStatus =
  | 'idle'
  | 'requesting'
  | 'waiting_oauth'
  | 'timeout'
  | 'env_error'
  | 'oauth_error';

function statusMessage(status: LoginStatus, detail: string | null) {
  if (status === 'requesting') return '로그인 요청 중입니다...';
  if (status === 'waiting_oauth') return '인증 서버 응답을 기다리는 중입니다...';
  if (status === 'timeout') return detail ?? '인증 서버 응답 지연이 발생했습니다.';
  if (status === 'env_error') return detail ?? '환경 변수 오류로 인증 요청을 시작하지 못했습니다.';
  if (status === 'oauth_error') return detail ?? 'OAuth 시작 실패가 발생했습니다.';
  return null;
}

function classifyError(code: ActionErrorCode, message: string): LoginStatus {
  if (code === 'oauth-timeout') return 'timeout';
  const normalized = message.toLowerCase();
  if (normalized.includes('supabase') && normalized.includes('url')) return 'env_error';
  if (normalized.includes('supabase') && normalized.includes('anon')) return 'env_error';
  if (code === 'supabase-init-failed') return 'env_error';
  return 'oauth_error';
}

function handleStageLog(stage: ActionStage, payload?: Record<string, unknown>) {
  if (stage === 'supabase.client.created') {
    console.info('[login.kakao] createSupabaseBrowserClient success', payload ?? {});
    return;
  }
  if (stage === 'oauth.signin.before') {
    console.info('[login.kakao] before signInWithOAuth', payload ?? {});
    return;
  }
  if (stage === 'oauth.signin.timeout') {
    console.error('[login.kakao] timeout', payload ?? {});
    return;
  }
  if (stage === 'oauth.signin.error') {
    console.error('[login.kakao] oauth error', payload ?? {});
    return;
  }
  console.info('[login.kakao] stage', stage, payload ?? {});
}

type LoginButtonInnerProps = LoginButtonProps & {
  next?: string;
};

function LoginButtonInner({
  next,
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonInnerProps) {
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const loading = status === 'requesting' || status === 'waiting_oauth';

  const handleLogin = async () => {
    console.info('[login.kakao] click entry', { next: next ?? null, forceLoginPrompt });
    setStatus('requesting');
    setError(null);

    try {
      const executed = await executeInteractionByKey(INTERACTION_KEYS.LOGIN_KAKAO, {
        actionOptions: {
          next,
          forceLoginPrompt,
          onStage: (stage, payload) => {
            handleStageLog(stage, payload);
            if (stage === 'supabase.client.created') {
              setStatus('waiting_oauth');
            }
            if (stage === 'oauth.signin.timeout') {
              setStatus('timeout');
            }
          }
        }
      });
      const result = executed.actionResult;

      if (!result.ok) {
        const nextStatus = classifyError(result.code, result.message);
        setStatus(nextStatus);
        setError(result.message);
        console.error('[login.kakao] catch', { code: result.code, cause: result.cause });
        return;
      }

      setStatus('waiting_oauth');
      console.info('[login.kakao] oauth request started');
    } catch (caughtError) {
      setStatus('oauth_error');
      const message = caughtError instanceof Error ? caughtError.message : '카카오 로그인 연결에 실패했습니다.';
      setError(message);
      console.error('[login.kakao] catch', caughtError);
    }
  };

  const message = statusMessage(status, error);
  const isError = status === 'timeout' || status === 'env_error' || status === 'oauth_error';

  return (
    <div className="space-y-3">
      <Button type="button" size="lg" onClick={handleLogin} isLoading={loading} disabled={loading}>
        {loading ? loadingLabel : idleLabel}
      </Button>
      {message ? (
        <div
          role={isError ? 'alert' : 'status'}
          className={isError
            ? 'rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700'
            : 'rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700'}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function LoginButton(props: LoginButtonProps) {
  return <LoginButtonInner {...props} />;
}

export function LoginButtonWithNext({
  next,
  idleLabel = '카카오로 로그인',
  loadingLabel = '연결 중...',
  forceLoginPrompt = true
}: LoginButtonProps & { next?: string }) {
  return (
    <LoginButtonInner
      next={next}
      idleLabel={idleLabel}
      loadingLabel={loadingLabel}
      forceLoginPrompt={forceLoginPrompt}
    />
  );
}
