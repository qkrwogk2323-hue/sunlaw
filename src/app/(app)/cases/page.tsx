import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaseCreateForm } from '@/components/forms/case-create-form';
import { getActiveViewMode, getEffectiveOrganizationId, hasActivePlatformScenarioView, requireAuthenticatedUser } from '@/lib/auth';
import { listCases } from '@/lib/queries/cases';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ExportLinks } from '@/components/export-links';
import { isPlatformScenarioMode } from '@/lib/platform-scenarios';
import { getPlatformScenarioCases } from '@/lib/platform-scenario-workspace';
import { CASE_STAGE_OPTIONS, getCaseStageLabel, isCaseStageStale } from '@/lib/case-stage';

export default async function CasesPage({
  searchParams
}: {
  searchParams?: Promise<{ stage?: string; stale?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const activeViewMode = await getActiveViewMode();
  const scenarioMode = isPlatformScenarioMode(activeViewMode) && await hasActivePlatformScenarioView(auth, activeViewMode) ? activeViewMode : null;
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const stageFilter = `${resolved?.stage ?? 'all'}`;
  const staleFilter = `${resolved?.stale ?? 'all'}`;
  const sourceCases = scenarioMode ? getPlatformScenarioCases(scenarioMode) : await listCases(currentOrganizationId);
  const cases = sourceCases.filter((item: any) => {
    if (stageFilter !== 'all' && `${item.stage_key ?? ''}` !== stageFilter) return false;
    if (staleFilter === 'stale' && !isCaseStageStale(item.updated_at, 7)) return false;
    if (staleFilter === 'fresh' && isCaseStageStale(item.updated_at, 7)) return false;
    return true;
  });
  const organizations = auth.memberships.map((membership) => ({
    id: membership.organization_id,
    name: membership.organization?.name ?? membership.organization_id
  }));

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">사건 운영 보드</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">사건 흐름과 최근 움직임을 한 화면에서 관리합니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">권한이 허용한 사건만 보여주되, 사건 생성부터 최근 변경 확인까지 같은 리듬으로 이어지도록 구성했습니다.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-100/70">현재 사건 수</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cases.length}</p>
            <p className="mt-1 text-sm text-slate-200/80">지금 확인 가능한 사건</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">사건 운영</h2>
          <p className="mt-2 text-sm text-slate-600">접근 권한이 허용한 사건만 노출되며, 최근 변경 흐름을 바로 확인할 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!scenarioMode ? <ExportLinks resource="case-board" /> : null}
          <form method="get" action="/cases" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
            <select name="stage" defaultValue={stageFilter} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체 단계</option>
              {CASE_STAGE_OPTIONS.map((stage) => (
                <option key={stage.key} value={stage.key}>{stage.label}</option>
              ))}
            </select>
            <select name="stale" defaultValue={staleFilter} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800">
              <option value="all">전체 상태</option>
              <option value="stale">7일 이상 미갱신</option>
              <option value="fresh">최근 갱신</option>
            </select>
            <button type="submit" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">적용</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {scenarioMode ? (
          <Card className="vs-mesh-card">
            <CardHeader>
              <CardTitle>가상 사건 구성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>법률/추심/기타 조직 특성에 맞춰 최근 한 달 동안 실제로 운영된 것처럼 사건 흐름을 구성했습니다.</p>
              <p>각 사건에는 의뢰인 1명 이상이 연결되어 있고, 문서, 요청, 일정, 비용, 긴 업무소통 기록이 함께 연결됩니다.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="vs-mesh-card">
            <CardHeader>
              <CardTitle>새 사건 열기</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseCreateForm organizations={organizations} defaultOrganizationId={currentOrganizationId} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>최근 사건 흐름</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.length ? (
              cases.map((item: any) => (
                <Link key={item.id} href={`/cases/${item.id}`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.reference_no ?? '-'} · {item.case_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={isCaseStageStale(item.updated_at, 7) ? 'amber' : 'slate'}>
                        {isCaseStageStale(item.updated_at, 7) ? '단계 갱신 필요' : '단계 최신'}
                      </Badge>
                      <Badge tone="blue">{getCaseStageLabel(item.stage_key)}</Badge>
                      <Badge tone="slate">{item.case_status}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{item.court_name ?? '법원 미지정'}</span>
                    <span>{item.case_number ?? '사건번호 미등록'}</span>
                    <span>{formatCurrency(item.principal_amount)}</span>
                    <span>{formatDateTime(item.updated_at)}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                    사건 열기 <ArrowRight className="size-4" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
                <BriefcaseBusiness className="mx-auto size-8 text-slate-400" />
                <p className="mt-3 text-sm text-slate-500">아직 표시할 사건이 없습니다. 새 사건을 열어 업무 흐름을 시작하세요.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
