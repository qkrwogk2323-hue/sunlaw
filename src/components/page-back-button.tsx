'use client';

import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';

function normalizePath(pathname: string) {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function PageBackButton({
  fallbackHref,
  topLevelRoutes
}: {
  fallbackHref: Route;
  topLevelRoutes: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = normalizePath(pathname);

  if (topLevelRoutes.includes(normalizedPath)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/88 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white"
    >
      <ArrowLeft className="size-4" />
      이전으로
    </button>
  );
}