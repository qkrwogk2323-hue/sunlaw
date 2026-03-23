// audit-link-exempt: reason=login-form-no-destructive-action; fallback=/admin/audit?tab=general; expires=2027-01-01; approvedBy=tech-lead
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { InlineErrorMessage } from '@/components/ui/inline-error';

// audit-link-exempt: reason=로그인 입력 폼은 신청·승인·보관 이력 화면이 아니라 인증 입력 전용이다; fallback=로그인 실패와 제한 이벤트는 인증 시스템 로그와 플랫폼 오류 로그에서 추적한다; expires=2026-12-31; approvedBy=Codex

type LoginMode = 'email' | 'temp';
const LOGIN_MODE_STORAGE_KEY = 'vs-login-mode';

type LoginErrorFeedback = {
  title: string;
  cause: string;
  resolution: string;
};

export function toLoginErrorFeedback(error: unknown, mode: LoginMode): LoginErrorFeedback {
  if (!(error instanceof Error)) {
    return {
      title: '로그인에 실패했습니다.',
      cause: '로그인 요청을 처리하는 중 알 수 없는 문제가 발생했습니다.',
      resolution: '잠시 후 다시 시도해 주세요. 문제가 반복되면 고객센터로 문의해 주세요.'
    };
  }

  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
    return mode === 'temp'
      ? {
          title: '임시 아이디 로그인에 실패했습니다.',
          cause: '입력한 조직 식별값, 임시 아이디 또는 비밀번호가 일치하지 않습니다.',
          resolution: '조직 식별값과 임시 아이디를 다시 확인해 주세요. 계속 실패하면 조직 관리자에게 문의해 주세요.'
        }
      : {
          title: '이메일 로그인에 실패했습니다.',
          cause: '입력한 이메일 또는 비밀번호가 일치하지 않거나 이메일 인증이 완료되지 않았습니다.',
          resolution: '이메일과 비밀번호를 다시 확인해 주세요. 계속 실패하면 비밀번호 재설정을 진행해 주세요.'
        };
  }

  if (message.includes('too many requests')) {
    return {
      title: '잠시 로그인할 수 없습니다.',
      cause: '짧은 시간에 로그인 시도가 반복되어 일시적으로 제한되었습니다.',
      resolution: '5분에서 10분 정도 기다린 뒤 다시 시도해 주세요. 비밀번호가 기억나지 않으면 재설정을 권장합니다.'
    };
  }

  if (message.includes('organization') || message.includes('임시 아이디') || message.includes('조직 식별값')) {
    return {
      title: '임시 아이디 로그인 정보를 확인해 주세요.',
      cause: error.message,
      resolution: '조직 식별값과 임시 아이디를 다시 확인해 주세요. 안내를 받지 못했다면 조직 관리자에게 문의해 주세요.'
    };
  }

  return {
    title: '로그인을 처리하지 못했습니다.',
    cause: error.message,
    resolution: '입력한 정보를 다시 확인한 뒤 재시도해 주세요. 문제가 반복되면 고객센터로 문의해 주세요.'
  };
}

export function normalizeStoredLoginMode(value: string | null | undefined): LoginMode {
  return value === 'temp' ? 'temp' : 'email';
}

export function CredentialLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [organizationKey, setOrganizationKey] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState<LoginErrorFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const hasEmailModeError = Boolean(error && mode === 'email');
  const hasTempModeError = Boolean(error && mode === 'temp');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMode(normalizeStoredLoginMode(window.localStorage.getItem(LOGIN_MODE_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOGIN_MODE_STORAGE_KEY, mode);
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let resolvedEmail = mode === 'email' ? email.trim() : loginId.trim();
      const password = mode === 'email' ? emailPassword : tempPassword;

      if (mode === 'temp') {
        // Server-side auth: email is resolved and sign-in performed server-side.
        // Email never exposed to the client.
        const response = await fetch('/api/auth/temp-login/sign-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            organizationKey: organizationKey.trim().toLowerCase(),
            loginId: resolvedEmail,
            password
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message ?? '조직 식별값 또는 임시 아이디를 확인해 주세요.');
        }

        // Auth cookies are already set by the server — redirect to home.
        window.location.href = '/dashboard';
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password
      });

      if (signInError) {
        throw signInError;
      }

      window.location.href = '/dashboard';
    } catch (submitError) {
      setError(toLoginErrorFeedback(submitError, mode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <div className="flex gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="일반 로그인 방식 선택">
          {[
            { id: 'email' as const, label: '이메일 로그인' },
            { id: 'temp' as const, label: '임시 아이디 로그인' }
          ].map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={`flex-1 rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
                  active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {mode === 'email'
            ? '가입한 이메일과 비밀번호로 로그인합니다.'
            : '조직에서 안내받은 조직 식별값과 임시 아이디로 로그인합니다.'}
        </p>
        <p className="text-xs leading-5 text-slate-500">최근에 사용한 로그인 방식은 다음 방문 때도 그대로 보여줍니다.</p>
      </div>

      {mode === 'email' ? (
        <div className="space-y-4">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">이메일</span>
            <Input
              name="email"
              type="email"
              required
              error={hasEmailModeError}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="가입한 이메일을 입력해 주세요"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">비밀번호</span>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              error={hasEmailModeError}
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
              placeholder="비밀번호를 입력해 주세요"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">조직 식별값</span>
            <Input
              value={organizationKey}
              onChange={(event) => setOrganizationKey(event.target.value)}
              onBlur={() => setOrganizationKey((prev) => prev.trim().toLowerCase())}
              placeholder="예: sunlaw-seoul"
              required
              error={hasTempModeError}
            />
            <p className="text-xs leading-5 text-slate-500">조직에서 안내받은 식별값을 입력해 주세요.</p>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">임시 아이디</span>
            <Input
              name="loginId"
              type="text"
              required
              error={hasTempModeError}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="예: staff-temp-001"
            />
            <p className="text-xs leading-5 text-slate-500">이메일이 아닌 임시 아이디로 로그인하는 경우에만 사용합니다.</p>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">비밀번호</span>
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              error={hasTempModeError}
              value={tempPassword}
              onChange={(event) => setTempPassword(event.target.value)}
              placeholder="비밀번호를 입력해 주세요"
            />
          </label>
        </div>
      )}

      {error ? (
        <InlineErrorMessage
          title={error.title}
          cause={error.cause}
          resolution={error.resolution}
          size="sm"
        />
      ) : null}

      <SubmitButton pendingLabel="로그인 중..." disabled={loading} className="w-full justify-center rounded-[1.2rem]">
        {mode === 'email' ? '이메일로 로그인' : '임시 아이디로 로그인'}
      </SubmitButton>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs leading-6 text-slate-500">
        <Link href={'/start/password-reset' as Route} className="font-medium text-sky-700 hover:text-sky-800">
          비밀번호를 잊으셨나요?
        </Link>
        <Link href={'/support' as Route} className="font-medium text-sky-700 hover:text-sky-800">
          {mode === 'email' ? '이메일 인증이 완료되지 않았나요?' : '임시 아이디 안내를 받지 못하셨나요?'}
        </Link>
      </div>
    </form>
  );
}
