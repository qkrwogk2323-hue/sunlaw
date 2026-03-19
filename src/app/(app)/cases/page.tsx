import Link from 'next/link';
import { BriefcaseBusiness } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaseCreateForm } from '@/components/forms/case-create-form';
import { forceDeleteCaseAction, moveCaseToDeletedAction } from '@/lib/actions/case-actions';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCaseClientLinkedMap, listCases, purgeDeletedCasesPastRetention } from '@/lib/queries/cases';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getCaseStageLabel, isCaseStageStale } from '@/lib/case-stage';
import { getCaseHubRegistrations } from '@/lib/queries/collaboration-hubs';

type BucketKey = 'active' | 'completed' | 'deleted';

const BUCKET_META: Record<BucketKey, { label: string; helper: string }> = {
  active: {
    label: '진행중 사건',
    helper: '현재 진행중인 사건목록입니다.'
  },
  completed: {
    label: '완료된 사건',
    helper: '완료된 사건목록입니다.'
  },
  deleted: {
    label: '삭제함',
    helper: '삭제예정함입니다. 30일 이후 자동삭제되며 강제삭제도 가능합니다.'
  }
};

function getCaseStatusLabel(status?: string | null) {
  const normalized = `${status ?? ''}`.toLowerCase();
  if (normalized === 'active' || normalized === 'intake' || normalized === 'in_progress') return '진행중';
  if (normalized === 'closed' || normalized === 'completed' || normalized === 'done') return '완료';
  if (normalized === 'archived') return '삭제 대기';
  return status || '상태 미설정';
}

function parseBucket(input?: string): BucketKey {
  if (input === 'completed') return 'completed';
  if (input === 'deleted') return 'deleted';
  return 'active';
}

export default async function CasesPage({
  searchParams
}: {
  searchParams?: Promise<{ bucket?: string; q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const bucket = parseBucket(resolved?.bucket);
  const queryFilter = `${resolved?.q ?? ''}`.trim().toLowerCase();

  await purgeDeletedCasesPastRetention(currentOrganizationId, 30);

  const [activeCases, completedCases, deletedCases] = await Promise.all([
    listCases(currentOrganizationId, { bucket: 'active' }),
    listCases(currentOrganizationId, { bucket: 'completed' }),
    listCases(currentOrganizationId, { bucket: 'deleted' })
  ]);

  const selectedCases = bucket === 'active' ? activeCases : bucket === 'completed' ? completedCases : deletedCases;
  const filteredCases = selectedCases.filter((item: any) => {
    if (!queryFilter) return true;
    const haystack = `${item.title ?? ''} ${item.reference_no ?? ''} ${item.case_number ?? ''}`.toLowerCase();
    return haystack.includes(queryFilter);
  });

  const allCaseIds = [...activeCases, ...completedCases, ...deletedCases].map((item: any) => item.id);
  const [hubRegistrations, caseClientLinkedMap] = await Promise.all([
    getCaseHubRegistrations(currentOrganizationId, allCaseIds),
    getCaseClientLinkedMap(allCaseIds)
  ]);

  const organizations = auth.memberships.map((membership) => ({
    id: membership.organization_id,
    name: membership.organization?.name ?? membership.organization_id
  }));

  return (
    <div className="space-y-6">
      <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
        <div className="grid gap-3 md:grid-cols-3">
          {(['active', 'completed', 'deleted'] as BucketKey[]).map((key) => {
            const count = key === 'active' ? activeCases.length : key === 'completed' ? completedCases.length : deletedCases.length;
            const isActive = key === bucket;
            return (
              <Link
                key={key}
                href={`/cases?bucket=${key}`}
                className={`rounded-2xl border p-4 text-center backdrop-blur-sm transition ${
                  isActive
                    ? 'border-sky-100/70 bg-white/18'
                    : 'border-white/10 bg-white/8 hover:border-sky-100/40'
                }`}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-sky-100/75">{BUCKET_META[key].label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{count}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <details id="case-create" className="group rounded-xl border border-slate-200 bg-white px-2 py-2">
          <summary className="list-none">
            <span className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-800 group-open:bg-sky-100">
              사건 등록하기
            </span>
          </summary>
          <div className="mt-3">
            <Card className="vs-mesh-card">
              <CardContent className="pt-5">
                <CaseCreateForm organizations={organizations} defaultOrganizationId={currentOrganizationId} />
              </CardContent>
            </Card>
          </div>
        </details>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form method="get" action="/cases" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
            <input type="hidden" name="bucket" value={bucket} />
            <input
              name="q"
              defaultValue={queryFilter}
              placeholder="사건명/참조번호/사건번호 검색"
              className="h-9 min-w-[14rem] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
            />
            <button type="submit" className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              검색
            </button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>사건목록</span>
            <span className="text-sm font-normal text-slate-500">{BUCKET_META[bucket].helper}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredCases.length ? (
            filteredCases.map((item: any) => (
              <div key={item.id} className="vs-interactive rounded-xl border border-slate-200 bg-white/85 p-3 transition hover:border-slate-900">
                <Link href={`/cases/${item.id}`} className="block">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.reference_no ?? '-'} · {item.case_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={caseClientLinkedMap[item.id] ? 'blue' : 'slate'}>
                        {caseClientLinkedMap[item.id] ? '의뢰인 연동' : '의뢰인 미연동'}
                      </Badge>
                      <Badge tone="slate">
                        {hubRegistrations[item.id]?.sharedHubId ? '허브 연결' : '허브 미연결'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={isCaseStageStale(item.updated_at, 7) ? 'amber' : 'slate'}>
                      {isCaseStageStale(item.updated_at, 7) ? '단계 갱신 필요' : '단계 최신'}
                    </Badge>
                    <Badge tone="blue">{getCaseStageLabel(item.stage_key)}</Badge>
                    <Badge tone="slate">{getCaseStatusLabel(item.case_status)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{item.court_name ?? '법원 미지정'}</span>
                    <span>{item.case_number ?? '사건번호 미등록'}</span>
                    <span>{formatCurrency(item.principal_amount)}</span>
                    <span>{formatDateTime(item.updated_at)}</span>
                  </div>
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {bucket !== 'deleted' ? (
                    <form action={moveCaseToDeletedAction}>
                      <input type="hidden" name="caseId" value={item.id} />
                      <input type="hidden" name="organizationId" value={item.organization_id} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        삭제함 이동
                      </button>
                    </form>
                  ) : null}
                  {bucket === 'deleted' ? (
                    <form action={forceDeleteCaseAction}>
                      <input type="hidden" name="caseId" value={item.id} />
                      <input type="hidden" name="organizationId" value={item.organization_id} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                      >
                        강제삭제
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
              <BriefcaseBusiness className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">표시할 사건이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
