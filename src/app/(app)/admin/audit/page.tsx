import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { listAuditChangeLog } from '@/lib/queries/audit';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

type AuditTab = 'general' | 'delete' | 'violation' | 'restore';

function parseTab(value?: string): AuditTab {
  if (value === 'delete' || value === 'violation' || value === 'restore') return value;
  return 'general';
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams?: Promise<{ table?: string; actor?: string; tab?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));

  if (!isPlatformAdmin) {
    return (
      <AccessDeniedBlock
        blocked="감사 로그 접근이 차단되었습니다."
        cause="현재 조직 또는 현재 계정 권한으로는 감사 로그를 조회할 수 없습니다."
        resolution="플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요."
      />
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const tab = parseTab(resolved?.tab);
  const table = `${resolved?.table ?? ''}`.trim() || null;
  const actor = `${resolved?.actor ?? ''}`.trim() || null;
  const logs = await listAuditChangeLog({
    limit: 150,
    tableName: table,
    actorUserId: actor,
    actionPrefix: tab === 'violation' ? 'VIOLATION' : tab === 'restore' ? 'RESTORE' : null,
    actionIn: tab === 'delete' ? ['DELETE', 'SOFT_DELETE', 'ARCHIVE'] : null
  });
  const tabs: Array<{ key: AuditTab; label: string }> = [
    { key: 'general', label: '일반 작업' },
    { key: 'delete', label: '삭제 기록' },
    { key: 'violation', label: '위반 기록' },
    { key: 'restore', label: '복구 기록' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">감사 로그</h1>
        <p className="mt-2 text-sm text-slate-600">운영 관점에서 최근 데이터 변경을 추적합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <a
                key={item.key}
                href={`/admin/audit?tab=${item.key}${table ? `&table=${encodeURIComponent(table)}` : ''}${actor ? `&actor=${encodeURIComponent(actor)}` : ''}`}
                className={buttonStyles({ variant: item.key === tab ? 'primary' : 'secondary', size: 'sm' })}
              >
                {item.label}
              </a>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/admin/audit" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value={tab} />
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>테이블명</span>
              <input
                name="table"
                defaultValue={table ?? ''}
                placeholder="예: notifications"
                className="h-10 w-52 rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span>행위자 ID</span>
              <input
                name="actor"
                defaultValue={actor ?? ''}
                placeholder="프로필 UUID"
                className="h-10 w-72 rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              적용
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{tabs.find((item) => item.key === tab)?.label ?? '최근 변경'}</CardTitle>
            <Badge tone="slate">{logs.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length ? logs.map((row: any) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{row.action}</Badge>
                <span className="text-sm font-medium text-slate-900">{row.table_name}</span>
                <span className="text-xs text-slate-500">{formatDateTime(row.logged_at)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                <span>actor {row.actor_user_id ?? '-'}</span>
                <span className="mx-1.5">·</span>
                <span>org {row.organization_id ?? '-'}</span>
                <span className="mx-1.5">·</span>
                <span>case {row.case_id ?? '-'}</span>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">조건에 맞는 로그가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
