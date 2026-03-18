import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { findMembership, getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCollectionsWorkspace } from '@/lib/queries/collections';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { ExportLinks } from '@/components/export-links';
import { CompensationPlanForm } from '@/components/forms/compensation-plan-form';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/permissions';

function formatDelta(value: number) {
  const rounded = Number.isFinite(value) ? value.toFixed(1) : '0.0';
  const sign = value > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

const periodOptions = [
  { key: 'day', label: '일별' },
  { key: 'week', label: '주별' },
  { key: 'month', label: '월별' },
  { key: 'quarter', label: '분기별' },
  { key: 'year', label: '연별' }
] as const;

export default async function CollectionsPage({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  const { period = 'month' } = searchParams ? await searchParams : { period: 'month' };
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  const data = await getCollectionsWorkspace(organizationId, period);
  const membership = organizationId ? findMembership(auth, organizationId) : null;
  const canManageComp = Boolean(organizationId && membership && hasPermission(auth, organizationId, 'collection_compensation_manage_plan'));
  const supabase = await createSupabaseServerClient();
  const { data: orgMembers } = organizationId
    ? await supabase.from('organization_memberships').select('id, title, profile:profiles(full_name)').eq('organization_id', organizationId).eq('status', 'active')
    : { data: [] as any[] };
  const memberOptions = (orgMembers ?? []).map((item: any) => ({ id: item.id, label: `${item.profile?.full_name ?? '직원'}${item.title ? ` · ${item.title}` : ''}` }));

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">추심 운영 공간</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">회수 흐름, 보수 현황, 성과 추이를 하나의 운영 화면으로 묶었습니다.</h1>
            <p className="mt-3 text-sm leading-7 text-slate-200/88">회수 실적과 보수 계산, 사건 흐름을 같은 문맥으로 보여 주어 운영 판단이 빠르게 이어지도록 구성했습니다.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-100/70">현재 기준</p>
            <p className="mt-2 text-3xl font-semibold text-white">{periodOptions.find((item) => item.key === period)?.label ?? '월별'}</p>
            <p className="mt-1 text-sm text-slate-200/80">집계 단위</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">추심 운영</h2>
          <p className="mt-2 text-sm text-slate-600">회수 활동, 보수 산정, 성과 흐름을 기간별로 정리합니다.</p>
        </div>
        <ExportLinks resource="collections" period={period} />
      </div>

      <div className="flex flex-wrap gap-2">
        {periodOptions.map((item) => (
          <Link
            key={item.key}
            href={`/collections?period=${item.key}`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${period === item.key ? 'bg-[linear-gradient(135deg,#0f766e,#0ea5e9)] text-white shadow-[0_10px_24px_rgba(14,165,164,0.20)]' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="vs-interactive bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">회수액</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(data.metrics.currentRecovered)}</p>
            <p className="mt-2 text-sm text-slate-500">직전 기간 대비 {formatDelta(data.metrics.recoveredDelta)}</p>
          </CardContent>
        </Card>
        <Card className="vs-interactive bg-gradient-to-br from-sky-50 to-white">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">예상 보수</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(data.metrics.currentExpected)}</p>
            <p className="mt-2 text-sm text-slate-500">직전 기간 대비 {formatDelta(data.metrics.expectedDelta)}</p>
          </CardContent>
        </Card>
        <Card className="vs-interactive bg-gradient-to-br from-amber-50 to-white">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">확정 보수</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(data.metrics.currentConfirmed)}</p>
            <p className="mt-2 text-sm text-slate-500">직전 기간 대비 {formatDelta(data.metrics.confirmedDelta)}</p>
          </CardContent>
        </Card>
        <Card className="vs-interactive bg-gradient-to-br from-slate-50 to-white">
          <CardHeader><CardTitle className="text-sm font-medium text-slate-500">추심 사건 수</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{data.collectionCases.length}</p>
            <p className="mt-2 text-sm text-slate-500">현재 조직 기준 활성 추심 사건</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="vs-interactive vs-mesh-card">
          <CardHeader><CardTitle>추심 사건</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.collectionCases.length ? data.collectionCases.map((item: any) => (
              <Link key={item.id} href={`/cases/${item.id}?tab=collection`} className="vs-interactive block rounded-xl border border-slate-200 bg-white/85 p-4 transition hover:border-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <Badge tone="amber">{item.stage_key ?? '-'}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.reference_no ?? '-'} · {formatCurrency(item.principal_amount)}</p>
              </Link>
            )) : <p className="text-sm text-slate-500">추심 사건이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>최근 회수 활동</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.activities.length ? data.activities.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.cases?.title ?? '-'}</p>
                  <Badge tone="slate">{item.activity_kind}</Badge>
                </div>
                <p className="mt-1 text-slate-500">{item.outcome_status ?? '-'} · {formatCurrency(item.amount)}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.occurred_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 회수 활동이 없습니다.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="vs-interactive">
          <CardHeader><CardTitle>보수/정산 현황판</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.compensationEntries.length ? data.compensationEntries.map((item: any) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{item.collection_compensation_plan_versions?.collection_compensation_plans?.title ?? '보수 규칙'}</p>
                  <Badge tone="blue">{item.status}</Badge>
                </div>
                <p className="mt-2 text-slate-500">산정 기준 금액: {formatCurrency(item.calculated_from_amount)}</p>
                <p className="text-slate-500">산정 보수: {formatCurrency(item.calculated_amount)}</p>
                <p className="text-slate-500">기간: {formatDate(item.period_start)} ~ {formatDate(item.period_end)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">아직 확정된 보수/정산 항목이 없습니다.</p>}
          </CardContent>
        </Card>

        <Card className="vs-interactive">
          <CardHeader><CardTitle>기간별 성과 추이</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.trend.length ? data.trend.map((row: any) => (
              <div key={row.label} className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{formatDate(row.label)}</p>
                  <Badge tone="slate">{periodOptions.find((item) => item.key === period)?.label ?? '월별'}</Badge>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3 text-slate-500">
                  <p>회수액: {formatCurrency(row.recoveredAmount)}</p>
                  <p>예상 보수: {formatCurrency(row.expectedCompensationAmount)}</p>
                  <p>확정 보수: {formatCurrency(row.confirmedCompensationAmount)}</p>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 성과 데이터가 없습니다.</p>}
          </CardContent>
        </Card>
      </section>

      {canManageComp ? (
        <Card>
          <CardHeader><CardTitle>추심 보수 규칙 등록</CardTitle></CardHeader>
          <CardContent>
            <CompensationPlanForm
              cases={data.collectionCases.map((item: any) => ({ id: item.id, title: item.title }))}
              membershipOptions={memberOptions}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
