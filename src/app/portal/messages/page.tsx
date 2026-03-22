import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPortalActionQueue } from '@/lib/queries/portal';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PortalMessagesPage() {
  const queue = await getPortalActionQueue();
  const requestItems = queue.filter((item: any) => item.kind === 'request');

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">소통 메뉴</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">사건 소통 · 요청 확인</h1>
        <p className="text-sm leading-7 text-slate-600">답변이 필요하거나 확인해야 하는 요청을 한곳에서 봅니다.</p>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <CardTitle>요청 및 답변 대기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requestItems.length ? requestItems.map((item: any) => (
            <Link key={item.id} href={`/portal/cases/${item.caseId}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.caseTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'waiting_client' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status === 'waiting_client' ? '답변 필요' : '확인 필요'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">기한: {item.dueAt ? formatDateTime(item.dueAt) : '미정'}</p>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
              <MessageSquareText className="mx-auto mb-3 size-5 text-slate-400" />
              현재 확인할 요청이나 답변 대기 항목이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
