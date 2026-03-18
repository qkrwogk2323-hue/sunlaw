import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import { hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { listAuditChangeLog } from '@/lib/queries/audit';

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams?: Promise<{ table?: string; actor?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const isPlatformAdmin = await hasActivePlatformAdminView(auth);

  if (!isPlatformAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        플랫폼 조직 운영 권한이 있어야 감사 로그를 볼 수 있습니다.
      </div>
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const table = `${resolved?.table ?? ''}`.trim() || null;
  const actor = `${resolved?.actor ?? ''}`.trim() || null;
  const logs = await listAuditChangeLog({ limit: 150, tableName: table, actorUserId: actor });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">감사 로그</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 조직 운영 관점에서 최근 데이터 변경을 추적합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/admin/audit" className="flex flex-wrap items-end gap-3">
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
            <CardTitle>최근 변경</CardTitle>
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
