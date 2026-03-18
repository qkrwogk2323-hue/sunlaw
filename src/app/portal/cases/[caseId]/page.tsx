import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentAuth } from '@/lib/auth';
import { getCaseStageLabel } from '@/lib/case-stage';
import { getPortalCaseDetail } from '@/lib/queries/portal';
import { formatCurrency, formatDateTime } from '@/lib/format';

export default async function PortalCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect('/login');
  const { caseId } = await params;
  const detail = await getPortalCaseDetail(caseId);
  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{detail.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{detail.reference_no ?? '-'} · {detail.case_status} · {getCaseStageLabel(detail.stage_key)}</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>공유 문서</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.documents.length ? detail.documents.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.document_kind} · {item.approval_status}</p>
              </div>
            )) : <p className="text-sm text-slate-500">공유된 문서가 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>일정</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.schedules.length ? detail.schedules.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone="blue">{item.schedule_kind}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{formatDateTime(item.scheduled_start)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">공유 일정이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>커뮤니케이션</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.messages.length ? detail.messages.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{item.sender?.full_name ?? item.sender_role}</p>
                <p className="mt-2 text-sm text-slate-600">{item.body}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">메시지가 없습니다.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>청구/입금</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.billingEntries.length ? detail.billingEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone={item.status === 'paid' ? 'green' : item.status === 'issued' ? 'amber' : 'slate'}>{item.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.entry_kind} · {formatCurrency(item.amount)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 청구가 없습니다.</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
