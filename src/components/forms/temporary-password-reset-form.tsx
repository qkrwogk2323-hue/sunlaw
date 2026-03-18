'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { completeTemporaryCredentialPasswordResetAction } from '@/lib/actions/auth-actions';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';

export function TemporaryPasswordResetForm() {
  const router = useRouter();
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (nextPassword.length < 4) {
      setError('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: nextPassword
    });

    if (updateError) {
      setError(updateError.message || '비밀번호 변경에 실패했습니다.');
      return;
    }

    startTransition(async () => {
      try {
        await completeTemporaryCredentialPasswordResetAction();
        router.replace('/start/member-profile');
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : '후속 처리에 실패했습니다.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-slate-700">
        새 비밀번호
        <Input
          type="password"
          minLength={4}
          required
          value={nextPassword}
          onChange={(event) => setNextPassword(event.target.value)}
          placeholder="새 비밀번호 입력"
          className="mt-1"
        />
      </label>
      <label className="block text-sm text-slate-700">
        새 비밀번호 확인
        <Input
          type="password"
          minLength={4}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="새 비밀번호 확인"
          className="mt-1"
        />
      </label>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <p className="text-xs text-slate-500">보안 권고: 8자 이상, 영문/숫자/특수문자 조합을 권장합니다.</p>
      <SubmitButton pendingLabel="변경 중..." disabled={isPending} className="w-full justify-center">
        비밀번호 변경 후 계속
      </SubmitButton>
    </form>
  );
}
