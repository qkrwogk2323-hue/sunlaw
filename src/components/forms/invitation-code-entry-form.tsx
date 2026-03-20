'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

function normalizeInvitationCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    const inviteIndex = segments.findIndex((segment) => segment === 'invite');

    if (inviteIndex >= 0 && segments[inviteIndex + 1]) {
      return segments[inviteIndex + 1];
    }
  } catch {
    // Treat non-URL input as a raw invitation code.
  }

  return trimmed
    .replace(/^\/?invite\//, '')
    .split(/[?#]/)[0]
    .replace(/\/+$/, '');
}

export function InvitationCodeEntryForm({
  title = '초대번호 또는 초대 링크 입력',
  description = '조직에서 받은 초대번호나 초대 링크를 붙여 넣으면 바로 연결 화면으로 이동합니다.',
  submitLabel = '초대번호 확인하기',
  placeholder = '초대번호 또는 초대 링크를 입력해 주세요'
}: {
  title?: string;
  description?: string;
  submitLabel?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();

        const token = normalizeInvitationCode(value);
        if (!token) {
          setError('초대번호 또는 초대 링크를 먼저 입력해 주세요.');
          return;
        }

        setError('');
        router.push(`/invite/${encodeURIComponent(token)}`);
      }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <KeyRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-7 text-slate-600">{description}</p>
          </div>
        </div>
        <label htmlFor="invitation-code-input" className="mt-4 block">
          <span className="sr-only">초대번호 또는 초대 링크</span>
          <input
            id="invitation-code-input"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>
      <Button type="submit" className="min-h-12 w-full justify-between rounded-[1.2rem] px-4">
        {submitLabel}
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
