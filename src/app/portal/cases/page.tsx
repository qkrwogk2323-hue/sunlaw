import Link from 'next/link';
import { ArrowRight, FolderOpen, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPortalCases } from '@/lib/queries/portal';
import { formatDateTime } from '@/lib/format';

function progressSentence(text?: string | null) {
  const raw = `${text ?? ''}`.trim();
  if (!raw) return '최근 진행 내역이 업데이트되고 있습니다.';
  if (/검토|recheck|review/i.test(raw)) return '검토가 진행 중입니다.';
  if (/수정|요청/i.test(raw)) return '수정 요청이 전달되었습니다.';
  if (/답변|회신|제출/i.test(raw)) return '의뢰인 회신이 접수되어 처리 중입니다.';
  if (/완료|종결/i.test(raw)) return '핵심 처리 단계가 완료되었습니다.';
  return raw.length > 58 ? `${raw.slice(0, 58)}...` : raw;
}

export const dynamic = 'force-dynamic';

export default async function PortalCasesPage() {
  const cases = await getPortalCases();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">사건 메뉴</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">내 사건</h1>
        <p className="text-sm leading-7 text-slate-600">현재 연결된 사건과 다음 확인 포인트를 사건별로 확인합니다.</p>
      </div>

      <Card className="vs-mesh-card">
        <CardHeader>
          <CardTitle>연결된 사건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cases.length ? cases.map((item: any) => (
            <Link key={item.id} href={`/portal/cases/${item.case_id}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-sky-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.cases?.title ?? item.client_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.cases?.reference_no ?? '-'} · {item.cases?.case_status ?? '-'}</p>
                </div>
                <div className="inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                  자세히 보기
                  <ArrowRight className="size-4" />
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600">
                <p>현재 단계: <span className="font-medium text-slate-900">{item.stageLabel}</span></p>
                <p>다음 단계: <span className="font-medium text-slate-900">{item.nextStageLabel}</span></p>
                <p>다음 행동: <span className="font-medium text-slate-900">{item.nextAction}</span></p>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <UserCheck className="size-3.5" />
                <span>{item.managerName} · {item.managerRole}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">최근 진행: {progressSentence(item.lastProgressText)}</p>
              <p className="mt-1 text-xs text-slate-400">마지막 업데이트: {formatDateTime(item.cases?.updated_at)}</p>
            </Link>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
              <FolderOpen className="mx-auto mb-3 size-5 text-slate-400" />
              현재 연결된 사건이 없습니다. 담당자에게 포털 연결 여부를 문의해 주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
