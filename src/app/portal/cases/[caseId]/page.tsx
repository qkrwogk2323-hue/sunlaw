import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCurrentAuth } from '@/lib/auth';
import { CASE_STAGE_OPTIONS, getCaseStageLabel } from '@/lib/case-stage';
import { getPortalActionQueue, getPortalCaseDetail } from '@/lib/queries/portal';
import { formatCurrency, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const INSOLVENCY_SUBTYPE_LABEL: Record<string, string> = {
  individual_rehabilitation: '개인회생',
  individual_bankruptcy: '개인파산',
  corporate_rehabilitation: '법인회생',
  corporate_bankruptcy: '법인파산'
};

const REPAYMENT_STATUS_LABEL: Record<string, string> = {
  draft: '초안 작성 중',
  confirmed: '검토 확정',
  filed: '법원 제출 완료',
  approved: '인가 완료',
  rejected: '보정 또는 재검토 필요',
  cancelled: '취소'
};

const CLAIM_CLASS_LABEL: Record<string, string> = {
  secured: '별제권',
  priority: '우선변제',
  general: '일반'
};

export default async function PortalCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const auth = await getCurrentAuth();
  if (!auth) redirect('/login');
  const { caseId } = await params;
  const [detail, actionQueue] = await Promise.all([getPortalCaseDetail(caseId), getPortalActionQueue()]);
  if (!detail) notFound();
  const caseActions = actionQueue.filter((item: any) => item.caseId === caseId);
  const stageIndex = CASE_STAGE_OPTIONS.findIndex((item) => item.key === detail.stage_key);
  const insolvencyCreditors = detail.insolvency?.creditors ?? [];
  const latestPlan = detail.insolvency?.latestPlan ?? null;
  const correctionNotice = detail.insolvency?.latestCorrectionNotice ?? null;
  const totalInsolvencyClaim = insolvencyCreditors.reduce((sum: number, item: any) => sum + (item.total_claim_amount ?? 0), 0);

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

      {detail.insolvency ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>채권자 목록 공유</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-medium text-slate-900">
                  {detail.insolvency.subtype ? INSOLVENCY_SUBTYPE_LABEL[detail.insolvency.subtype] ?? detail.insolvency.subtype : '도산 사건'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  총 {insolvencyCreditors.length}건 · 총 채권액 {formatCurrency(totalInsolvencyClaim)}
                </p>
              </div>
              {insolvencyCreditors.length ? insolvencyCreditors.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">{item.creditor_name}</p>
                    <Badge tone={item.is_confirmed ? 'green' : 'amber'}>
                      {item.is_confirmed ? '확정' : '확인중'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {CLAIM_CLASS_LABEL[item.claim_class] ?? item.claim_class} · {formatCurrency(item.total_claim_amount ?? 0)}
                  </p>
                </div>
              )) : <p className="text-sm text-slate-500">현재 공유된 채권자 목록이 없습니다.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>변제계획안 현재 상황</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestPlan ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">변제계획안 v{latestPlan.version_number}</p>
                      <Badge tone="blue">{REPAYMENT_STATUS_LABEL[latestPlan.status] ?? latestPlan.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      변제기간 {latestPlan.repayment_months}개월
                      {latestPlan.plan_start_date ? ` · 시작 ${latestPlan.plan_start_date}` : ''}
                      {latestPlan.plan_end_date ? ` · 종료 ${latestPlan.plan_end_date}` : ''}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">일반채권 변제율</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {latestPlan.general_repayment_rate_pct != null ? `${Number(latestPlan.general_repayment_rate_pct).toFixed(2)}%` : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">총 변제 예정액</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {latestPlan.total_repayment_amount != null ? formatCurrency(latestPlan.total_repayment_amount) : '-'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">현재 사건에 연결된 최신 변제계획안 기준으로 공유됩니다.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">아직 공유할 변제계획안이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>보정도우미 공유</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {correctionNotice ? (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                      <span>송달받은 문서일: {correctionNotice.servedAt ?? '-'}</span>
                      <span>보정기한: {correctionNotice.correctionDeadline ?? '-'}</span>
                    </div>
                    {correctionNotice.courtRequestSummary ? (
                      <p className="mt-2 text-sm text-slate-800">법원 요청 의미: {correctionNotice.courtRequestSummary}</p>
                    ) : null}
                  </div>
                  {correctionNotice.requestedDocuments?.length ? (
                    correctionNotice.requestedDocuments.map((item: any, index: number) => (
                      <div key={`${item.title}-${index}`} className="rounded-xl border border-slate-200 p-4">
                        <p className="font-medium text-slate-900">{index + 1}. {item.title}</p>
                        {item.purpose ? <p className="mt-1 text-sm text-slate-600">왜 필요한지: {item.purpose}</p> : null}
                        <p className="mt-1 text-xs text-slate-500">
                          준비 주체: {item.responsibility === 'client_visit' ? '의뢰인 직접 발급/방문' : item.responsibility === 'office_prepare' ? '사무소 확인' : '의뢰인 준비'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">현재 공유된 보정 요청 서류가 없습니다.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">아직 공유할 보정권고/보정명령 요약이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

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
