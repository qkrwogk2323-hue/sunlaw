import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPortalBillingQueue } from '@/lib/queries/portal';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PortalBillingPage() {
  const billingItems = await getPortalBillingQueue();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">비용 메뉴</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">청구 · 납부 확인</h1>
        <p className="text-sm leading-7 text-slate-600">지금 확인해야 할 청구와 납부 관련 항목을 사건별로 확인합니다.</p>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <CardTitle>확인할 청구 항목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {billingItems.length ? billingItems.map((item: any) => (
            <Link key={item.id} href={`/portal/cases/${item.caseId}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-sky-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.caseTitle}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.title}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {item.status === 'partial' ? '부분 납부' : '확인 필요'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">납부 기한: {item.dueAt ? formatDateTime(item.dueAt) : '미정'}</p>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
              <Receipt className="mx-auto mb-3 size-5 text-slate-400" />
              현재 확인할 청구 항목이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
