import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentAuth } from '@/lib/auth';
import { CASE_STAGE_OPTIONS, getCaseStageLabel } from '@/lib/case-stage';
import { getPortalActionQueue, getPortalCaseDetail } from '@/lib/queries/portal';
import { formatCurrency, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PortalCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect('/login');
  const { caseId } = await params;
  const [detail, actionQueue] = await Promise.all([getPortalCaseDetail(caseId), getPortalActionQueue()]);
  if (!detail) notFound();
  const caseActions = actionQueue.filter((item: any) => item.caseId === caseId);
  const stageIndex = CASE_STAGE_OPTIONS.findIndex((item) => item.key === detail.stage_key);

  const progressSentence = (text?: string | null) => {
    const raw = `${text ?? ''}`.trim();
    if (!raw) return '진행 내역이 업데이트되고 있습니다.';
    if (/단계 변경/.test(raw)) return raw;
    if (/검토|recheck|review/i.test(raw)) return '검토 시작';
    if (/수정|요청/i.test(raw)) return '수정 요청 전달';
    if (/답변|회신|제출/i.test(raw)) return '답변 접수';
    if (/완료|종결/i.test(raw)) return '완료';
    return raw.length > 64 ? `${raw.slice(0, 64)}...` : raw;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{detail.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{detail.reference_no ?? '-'} · {detail.case_status} · {getCaseStageLabel(detail.stage_key)}</p>
        <p className="mt-1 text-xs text-slate-500">마지막 업데이트: {formatDateTime(detail.updated_at)}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>진행 단계</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          {CASE_STAGE_OPTIONS.map((item, idx) => {
            const active = idx <= stageIndex;
            return (
              <div key={item.key} className={`rounded-lg border px-3 py-2 text-center text-xs ${active ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-400'}`}>
                {item.label}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>지금 해야 할 일</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {caseActions.length ? caseActions.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-medium text-amber-900">{item.title}</p>
              <p className="mt-1 text-xs text-amber-700">{item.kind === 'request' ? '답변/확인 필요' : '청구 확인 필요'}</p>
            </div>
          )) : <p className="text-sm text-slate-500">지금 즉시 필요한 요청은 없습니다.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>최근 진행 상황</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {detail.messages.length ? detail.messages.slice(0, 6).map((item: any) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">{progressSentence(item.body)}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">최근 진행 상황이 없습니다.</p>}
        </CardContent>
      </Card>

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
