import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPortalActionQueue } from '@/lib/queries/portal';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PortalNotificationsPage() {
  const queue = await getPortalActionQueue();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">공통 메뉴</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">알림 확인</h1>
        <p className="text-sm leading-7 text-slate-600">요청, 청구, 참고 항목을 시간순으로 확인합니다.</p>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <CardTitle>최근 알림 흐름</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.length ? queue.map((item: any) => (
            <Link key={item.id} href={`/portal/cases/${item.caseId}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-sky-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.caseTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.kind === 'billing' ? 'bg-slate-100 text-slate-700' : item.status === 'waiting_client' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.kind === 'billing' ? '청구' : item.status === 'waiting_client' ? '답변 필요' : '확인 필요'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">기한: {item.dueAt ? formatDateTime(item.dueAt) : '미정'}</p>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
              <Bell className="mx-auto mb-3 size-5 text-slate-400" />
              현재 확인할 알림이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
