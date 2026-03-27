'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ROUTES } from '@/lib/routes/registry';

export function NotificationsArchiveButton({ archivedCount }: { archivedCount: number }) {
  const [open, setOpen] = useState(false);
  const archivedParams = new URLSearchParams();
  archivedParams.set('state', 'archived');
  const archivedHref = `${ROUTES.NOTIFICATIONS}?${archivedParams.toString()}` as Route;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        aria-label="보관함 열기"
      >
        📥 보관함 {archivedCount > 0 && <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] tabular-nums">{archivedCount}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">보관함</p>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-700">닫기</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">보관된 알림 {archivedCount}건</p>
            <Link
              href={archivedHref}
              className="mt-3 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              보관함 전체 보기 →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
