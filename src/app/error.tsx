'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { fallbackUnexpectedFeedback, normalizeGuardFeedback } from '@/lib/guard-feedback';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const feedback = normalizeGuardFeedback(error, fallbackUnexpectedFeedback());

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{feedback.code} 오류</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{feedback.blocked}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          <span className="font-medium text-slate-900">원인:</span> {feedback.cause}
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          <span className="font-medium text-slate-900">해결 방법:</span> {feedback.resolution}
        </p>
        <div className="mt-6">
          <Button onClick={() => reset()}>다시 시도</Button>
        </div>
      </div>
    </main>
  );
}
