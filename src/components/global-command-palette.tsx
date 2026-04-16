'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Search, X } from 'lucide-react';
import { ROUTES } from '@/lib/routes/registry';

type SearchPayload = {
  cases: Array<{ id: string; title: string; stage_key: string | null }>;
  clients: Array<{ id: string; full_name: string; email: string }>;
  documents: Array<{ id: string; title: string; case_id: string }>;
};

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<SearchPayload>({ cases: [], clients: [], documents: [] });

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  useEffect(() => {
    const onOpenSearch = (event: Event) => {
      const custom = event as CustomEvent<{ query?: string }>;
      const nextQuery = `${custom.detail?.query ?? ''}`.trim();
      setOpen(true);
      setQuery(nextQuery);
    };

    window.addEventListener('open-global-search', onOpenSearch as EventListener);
    return () => window.removeEventListener('open-global-search', onOpenSearch as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults({ cases: [], clients: [], documents: [] });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setPending(true);
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(query)}&limit=6`, {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = await response.json() as SearchPayload;
        setResults(payload);
      } finally {
        setPending(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const hasResults = useMemo(
    () => Boolean(results.cases.length || results.clients.length || results.documents.length),
    [results]
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
      >
        <Search className="size-3.5" />
        검색
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px]">⌘K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-4">
      <div className="pointer-events-auto mx-auto mt-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
          <Search className="size-4 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="사건, 의뢰인, 문서를 검색하세요"
            autoFocus
            className="h-10 w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
          />
          <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-3">
          {pending ? <p className="text-sm text-slate-500">검색 중...</p> : null}
          {!pending && query.trim().length >= 2 && !hasResults ? (
            <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>
          ) : null}
          {!pending && query.trim().length < 2 ? (
            <p className="text-sm text-slate-500">두 글자 이상 입력하면 검색합니다.</p>
          ) : null}

          {results.cases.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">사건</p>
              {results.cases.map((item) => (
                <Link key={item.id} href={`${ROUTES.CASES}/${item.id}` as Route} className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" onClick={() => setOpen(false)}>
                  {item.title}
                </Link>
              ))}
            </div>
          ) : null}

          {results.clients.length ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">의뢰인</p>
              {results.clients.map((item) => (
                <Link key={item.id} href={`${ROUTES.CLIENTS}?clientId=${item.id}` as Route} className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" onClick={() => setOpen(false)}>
                  {item.full_name}
                  {item.email ? <span className="ml-2 text-xs text-slate-500">{item.email}</span> : null}
                </Link>
              ))}
            </div>
          ) : null}

          {results.documents.length ? (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">문서</p>
              {results.documents.map((item) => (
                <Link key={item.id} href={`${ROUTES.CASES}/${item.case_id}` as Route} className="block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" onClick={() => setOpen(false)}>
                  {item.title}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
