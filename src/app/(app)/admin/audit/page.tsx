import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { formatDateTime } from '@/lib/format';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { listAuditChangeLog } from '@/lib/queries/audit';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

type AuditTab = 'general' | 'delete' | 'violation' | 'restore';

const TAB_META: Record<AuditTab, { label: string; description: string }> = {
  general: {
    label: '일반 작업',
    description: '생성, 수정, 확인처럼 일상 운영에서 발생한 기본 변경 기록입니다.'
  },
  delete: {
    label: '삭제 기록',
    description: '삭제함 이동, 보관, 실제 삭제처럼 원복이 중요할 수 있는 기록입니다.'
  },
  violation: {
    label: '위반 기록',
    description: '권한 위반, 정책 위반, 차단된 시도처럼 즉시 확인해야 하는 기록입니다.'
  },
  restore: {
    label: '복구 기록',
    description: '삭제함 복구, 보관 해제처럼 되돌린 이력을 모아 봅니다.'
  }
};

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
  const tabs = (Object.entries(TAB_META) as Array<[AuditTab, (typeof TAB_META)[AuditTab]]>).map(([key, meta]) => ({
    key,
    ...meta
  }));

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
          <p className="text-sm text-slate-500">{TAB_META[tab].description}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedListSearch
            action="/admin/audit"
            placeholder="감사 로그 검색어는 선택 입력입니다."
            defaultValue=""
            ariaLabel="감사 로그 필터"
            submitLabel="적용"
            hiddenFields={{ tab }}
          >
            <label htmlFor="audit-table" className="flex flex-col gap-1 text-sm text-slate-600">
              <span>테이블명</span>
              <input
                id="audit-table"
                name="table"
                defaultValue={table ?? ''}
                placeholder="예: notifications"
                className="h-10 w-52 rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
            <label htmlFor="audit-actor" className="flex flex-col gap-1 text-sm text-slate-600">
              <span>행위자 ID</span>
              <input
                id="audit-actor"
                name="actor"
                defaultValue={actor ?? ''}
                placeholder="프로필 UUID"
                className="h-10 w-72 rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
              />
            </label>
          </UnifiedListSearch>
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
