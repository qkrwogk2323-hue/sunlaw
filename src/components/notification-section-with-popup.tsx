'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { NotificationQueueItem } from '@/lib/queries/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ColorKey = 'rose' | 'blue' | 'violet' | 'slate';
type ToneKey = 'red' | 'blue' | 'green' | 'slate';

const PREVIEW_LIMIT = 5;

const colorStyles = {
  rose: {
    card: 'border-rose-200 bg-[linear-gradient(180deg,#fff5f5,#fff1f2)]',
    header: 'border-rose-100',
    title: 'text-rose-800',
    empty: 'border-rose-200 bg-rose-50',
    popup: 'border-rose-200 bg-white',
    popupHeader: 'bg-rose-50 border-rose-100',
    popupTitle: 'text-rose-800',
    scrollArea: 'border-rose-100 bg-rose-50/30',
    item: 'border-rose-100 bg-white',
    more: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
  blue: {
    card: 'border-blue-200 bg-[linear-gradient(180deg,#f0f8ff,#eff6ff)]',
    header: 'border-blue-100',
    title: 'text-blue-800',
    empty: 'border-blue-200 bg-blue-50',
    popup: 'border-blue-200 bg-white',
    popupHeader: 'bg-blue-50 border-blue-100',
    popupTitle: 'text-blue-800',
    scrollArea: 'border-blue-100 bg-blue-50/30',
    item: 'border-blue-100 bg-white',
    more: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  },
  violet: {
    card: 'border-violet-200 bg-[linear-gradient(180deg,#faf5ff,#f5f3ff)]',
    header: 'border-violet-100',
    title: 'text-violet-800',
    empty: 'border-violet-200 bg-violet-50',
    popup: 'border-violet-200 bg-white',
    popupHeader: 'bg-violet-50 border-violet-100',
    popupTitle: 'text-violet-800',
    scrollArea: 'border-violet-100 bg-violet-50/30',
    item: 'border-violet-100 bg-white',
    more: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
  slate: {
    card: 'border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#f1f5f9)]',
    header: 'border-slate-100',
    title: 'text-slate-700',
    empty: 'border-slate-200 bg-slate-50',
    popup: 'border-slate-200 bg-white',
    popupHeader: 'bg-slate-50 border-slate-100',
    popupTitle: 'text-slate-700',
    scrollArea: 'border-slate-200 bg-slate-50/50',
    item: 'border-slate-200 bg-white',
    more: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  }
};

function ItemRow({ item, colorKey }: { item: NotificationQueueItem; colorKey: ColorKey }) {
  const cs = colorStyles[colorKey];
  return (
    <div className={`rounded-xl border p-3 ${cs.item}`}>
      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
      {item.organizationName && <p className="mt-0.5 text-xs text-slate-500">{item.organizationName}</p>}
      <div className="mt-2 flex items-center gap-2">
        <Link
          href={`/notifications/open/${item.notificationId}?href=${encodeURIComponent(item.destinationUrl)}&organizationId=${item.organizationId ?? ''}` as Route}
          className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
        >
          열기 →
        </Link>
      </div>
    </div>
  );
}

export function NotificationSectionWithPopup({
  title,
  tone,
  colorKey,
  items,
}: {
  title: string;
  tone: ToneKey;
  colorKey: ColorKey;
  items: NotificationQueueItem[];
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const cs = colorStyles[colorKey];
  const previewItems = items.slice(0, PREVIEW_LIMIT);

  return (
    <>
      <Card className={cs.card}>
        <CardHeader className={cs.header}>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className={cs.title}>{title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge tone={tone}>{items.length}</Badge>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  aria-label={`${title} 전체보기`}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${cs.more}`}
                >
                  전체보기
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewItems.length ? (
            <>
              {previewItems.map((item) => <ItemRow key={item.notificationId} item={item} colorKey={colorKey} />)}
              {items.length > PREVIEW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setPopupOpen(true)}
                  className={`w-full rounded-xl border px-3 py-2 text-center text-xs font-medium transition ${cs.more}`}
                >
                  {items.length - PREVIEW_LIMIT}개 더 보기
                </button>
              )}
            </>
          ) : (
            <div className={`rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500 ${cs.empty}`}>
              현재 표시할 알림이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {popupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPopupOpen(false); }}
        >
          <div className={`w-full max-w-2xl rounded-2xl border p-4 shadow-[0_24px_64px_rgba(15,23,42,0.35)] ${cs.popup}`}>
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${cs.popupHeader}`}>
              <div>
                <p className={`text-lg font-semibold ${cs.popupTitle}`}>{title}</p>
                <p className="text-xs text-slate-500">전체 {items.length}건의 알림</p>
              </div>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
            <div className={`mt-3 max-h-[26rem] space-y-2 overflow-y-auto rounded-xl border p-3 ${cs.scrollArea}`}>
              {items.length ? (
                items.map((item) => <ItemRow key={item.notificationId} item={item} colorKey={colorKey} />)
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">표시할 알림이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
