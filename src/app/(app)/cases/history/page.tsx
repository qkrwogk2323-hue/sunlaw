import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { formatDateTime } from '@/lib/format';
import { listOrganizationCaseTitles, listOrganizationTableHistory } from '@/lib/queries/menu-history';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: cases_history
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

function operationLabel(operation: string) {
  if (operation === 'INSERT') return '등록';
  if (operation === 'UPDATE') return '수정';
  if (operation === 'DELETE') return '삭제';
  return operation;
}

export default async function CaseHistoryPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);

  if (!organizationId || !hasPermission(auth, organizationId, 'case_edit')) {
    return (
      <AccessDeniedBlock
        blocked="사건 변경 기록을 열 수 없습니다."
        cause="현재 조직에서 사건 기록을 확인할 권한이 없습니다."
        resolution="사건 수정 권한이 있는 조직 구성원으로 다시 시도해 주세요."
      />
    );
  }
  const resolved = searchParams ? await searchParams : undefined;
  const query = `${resolved?.q ?? ''}`.trim().toLowerCase();
  const logs = await listOrganizationTableHistory(organizationId, 'cases');
  const caseTitles = await listOrganizationCaseTitles(logs.map((item) => item.case_id ?? item.record_id ?? ''));
  const filteredLogs = logs.filter((log) => {
    if (!query) return true;
    const caseTitle = caseTitles.get(log.case_id ?? log.record_id ?? '') ?? '';
    const haystack = `${caseTitle} ${log.actor_email ?? ''} ${(log.changed_fields ?? []).join(' ')}`.toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">사건 변경 기록</h1>
          <p className="mt-2 text-sm text-slate-600">사건 목록에서 발생한 등록, 수정, 삭제만 따로 확인합니다.</p>
        </div>
        <Link href={'/cases' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
          사건 목록으로 돌아가기
        </Link>
      </div>

      <form action="/cases/history" className="rounded-2xl border border-slate-200 bg-white p-3">
        <input
          name="q"
          defaultValue={query}
          placeholder="사건명, 작업자, 변경 항목 검색"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          aria-label="사건 변경 기록 검색"
        />
      </form>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>최근 기록</CardTitle>
            <Badge tone="slate">{filteredLogs.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredLogs.length ? filteredLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{caseTitles.get(log.case_id ?? log.record_id ?? '') ?? '사건'}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(log.logged_at)}</p>
                </div>
                <Badge tone={log.operation === 'DELETE' ? 'red' : log.operation === 'INSERT' ? 'green' : 'blue'}>
                  {operationLabel(log.operation)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                <span>변경 항목</span>
                {(log.changed_fields ?? []).length ? (log.changed_fields ?? []).map((field) => (
                  <Badge key={`${log.id}-${field}`} tone="slate">{field}</Badge>
                )) : <span className="text-slate-500">기록 항목 없음</span>}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                작업자 {log.actor_email ?? log.actor_user_id ?? '알 수 없음'}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              아직 확인할 사건 변경 기록이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
