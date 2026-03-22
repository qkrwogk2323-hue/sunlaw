'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { fallbackUnexpectedFeedback, normalizeGuardFeedback } from '@/lib/guard-feedback';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const feedback = normalizeGuardFeedback(error, fallbackUnexpectedFeedback());

  return (
    <html lang="ko">
      <body className="bg-slate-950 text-white">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-white/12 bg-white/8 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.24)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/78">{feedback.code} 오류</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{feedback.blocked}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              <span className="font-medium text-white">원인:</span> {feedback.cause}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              <span className="font-medium text-white">해결 방법:</span> {feedback.resolution}
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
