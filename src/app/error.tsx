'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">예외가 발생했습니다.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">일시적인 문제가 발생했습니다. 다시 시도해 주세요. 문제가 반복되면 관리자에게 문의해 주세요.</p>
        <div className="mt-6">
          <Button onClick={() => reset()}>다시 시도</Button>
        </div>
      </div>
    </main>
  );
}
