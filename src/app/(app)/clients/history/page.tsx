import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';
import { getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { listOrganizationClientAccessRequests } from '@/lib/queries/client-access';
import { listOrganizationTableHistory } from '@/lib/queries/menu-history';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: clients_history
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

type HistoryTab = 'profiles' | 'requests';

function parseTab(value?: string): HistoryTab {
  return value === 'requests' ? 'requests' : 'profiles';
}

function operationLabel(operation: string) {
  if (operation === 'INSERT') return '등록';
  if (operation === 'UPDATE') return '수정';
  if (operation === 'DELETE') return '삭제';
  return operation;
}

function requestStatusLabel(status?: string | null) {
  if (status === 'approved') return '승인';
  if (status === 'rejected') return '반려';
  if (status === 'pending') return '검토 중';
  return status ?? '상태 없음';
}

export default async function ClientHistoryPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);

  // audit.change_log contains raw DB diffs — restrict to org managers and above only.
  const membership = auth.memberships?.find(m => m.organization_id === organizationId);
  if (!organizationId || !isManagementRole(membership?.role)) {
    return (
      <AccessDeniedBlock
        blocked="의뢰인 기록을 열 수 없습니다."
        cause="현재 조직에서 의뢰인 관리 기록을 확인할 권한이 없습니다."
        resolution="의뢰인 관리 권한이 있는 계정으로 다시 시도해 주세요."
      />
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const tab = parseTab(resolved?.tab);
  const query = `${resolved?.q ?? ''}`.trim().toLowerCase();
  const [profileLogs, requestLogs] = await Promise.all([
    tab === 'profiles' ? listOrganizationTableHistory(organizationId, 'case_clients', 80, auth) : Promise.resolve([]),
    tab === 'requests' ? listOrganizationClientAccessRequests(organizationId) : Promise.resolve([])
  ]);
  const filteredProfileLogs = profileLogs.filter((log) => {
    if (!query) return true;
    const haystack = `${(log.new_values?.client_name as string) ?? ''} ${(log.old_values?.client_name as string) ?? ''} ${log.actor_email ?? ''} ${(log.changed_fields ?? []).join(' ')}`.toLowerCase();
    return haystack.includes(query);
  });
  const filteredRequestLogs = requestLogs.filter((request: any) => {
    if (!query) return true;
    const haystack = `${request.requester_name ?? ''} ${request.requester_email ?? ''} ${request.request_note ?? ''} ${request.review_note ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">의뢰인 기록</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={'/clients/history?tab=profiles' as Route}
            className={buttonStyles({ variant: tab === 'profiles' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
          >
            의뢰인 정보 변경
          </Link>
          <Link
            href={'/clients/history?tab=requests' as Route}
            className={buttonStyles({ variant: tab === 'requests' ? 'primary' : 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
          >
            연결 요청 기록
          </Link>
          <Link href={'/clients' as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4' })}>
            의뢰인 관리로 돌아가기
          </Link>
        </div>
      </div>

      <form action="/clients/history" className="rounded-2xl border border-slate-200 bg-white p-3">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={query}
          placeholder={tab === 'profiles' ? '의뢰인명, 작업자, 변경 항목 검색' : '요청자, 이메일, 요청 메모 검색'}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          aria-label="의뢰인 기록 검색"
        />
      </form>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{tab === 'profiles' ? '의뢰인 정보 변경 기록' : '의뢰인 연결 요청 기록'}</CardTitle>
            <Badge tone="slate">{tab === 'profiles' ? filteredProfileLogs.length : filteredRequestLogs.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tab === 'profiles' ? (
            filteredProfileLogs.length ? filteredProfileLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{(log.new_values?.client_name as string) ?? (log.old_values?.client_name as string) ?? '의뢰인'}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(log.logged_at)}</p>
                  </div>
                  <Badge tone={log.operation === 'DELETE' ? 'red' : log.operation === 'INSERT' ? 'green' : 'blue'}>
                    {operationLabel(log.operation)}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                  {(log.changed_fields ?? []).length ? (log.changed_fields ?? []).map((field) => (
                    <Badge key={`${log.id}-${field}`} tone="slate">{field}</Badge>
                  )) : <span className="text-slate-500">변경 항목 없음</span>}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  작업자 {log.actor_email ?? log.actor_user_id ?? '알 수 없음'}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                아직 확인할 의뢰인 정보 변경 기록이 없습니다.
              </div>
            )
          ) : (
            filteredRequestLogs.length ? filteredRequestLogs.map((request: any) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{request.requester_name || '요청자'}</p>
                    <p className="mt-1 text-sm text-slate-500">{request.requester_email || '이메일 없음'} · {formatDateTime(request.created_at)}</p>
                  </div>
                  <Badge tone={request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'amber'}>
                    {requestStatusLabel(request.status)}
                  </Badge>
                </div>
                {request.request_note ? (
                  <p className="mt-3 text-sm text-slate-700">{request.request_note}</p>
                ) : null}
                {request.review_note ? (
                  <p className="mt-2 text-xs text-slate-500">검토 메모 · {request.review_note}</p>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                아직 확인할 연결 요청 기록이 없습니다.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
