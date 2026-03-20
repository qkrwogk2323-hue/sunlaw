'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { ExportLinks } from '@/components/export-links';

type ExportResource = 'calendar' | 'case-board' | 'collections' | 'reports';

function resolveResource(pathname: string): ExportResource | null {
  if (pathname.startsWith('/cases')) return 'case-board';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/collections')) return 'collections';
  if (pathname.startsWith('/reports')) return 'reports';
  return null;
}

export function FloatingExportWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resource = resolveResource(pathname);
  const period = useMemo(() => {
    if (resource !== 'collections') return undefined;
    return searchParams.get('period') ?? 'month';
  }, [resource, searchParams]);

  if (!resource) return null;

  return (
    <details className="fixed bottom-5 right-5 z-40 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_32px_rgba(15,23,42,0.16)]">
      <summary className="list-none">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800">
          <Download className="size-4" />
          다운로드
        </span>
      </summary>
      <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
        <ExportLinks resource={resource} period={period} className="gap-1.5" />
      </div>
    </details>
  );
}

