import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { formatDateTime } from '@/lib/format';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { listAuditChangeLog } from '@/lib/queries/audit';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

type AuditTab = 'general' | 'delete' | 'violation' | 'restore';

const TAB_META: Record<AuditTab, { label: string; description: string; details: string[] }> = {
  general: {
    label: '일반 작업',
    description: '생성, 수정, 상태 변경처럼 일상 운영에서 발생한 기본 변경 기록입니다.',
    details: [
      '조직이나 사건, 의뢰인, 설정값을 새로 만들거나 수정한 기록이 보입니다.',
      '구독 상태 변경, 기능 설정 변경, 조직 상태 조정처럼 운영자가 반영한 변경이 포함됩니다.',
      '누가 어느 조직에서 어떤 대상을 바꿨는지, 시각과 함께 추적할 때 사용합니다.'
    ]
  },
  delete: {
    label: '삭제 기록',
    description: '삭제함 이동, 보관, 실제 삭제처럼 원복이 중요할 수 있는 기록입니다.',
    details: [
      '알림 보관함 이동, 삭제함 이동, 실제 삭제 처리 같은 기록이 나옵니다.',
      '나중에 복구가 필요한지 판단해야 하는 항목을 먼저 모아 볼 때 사용합니다.',
      '중요 자료가 언제 어떤 이유로 사라졌는지 역추적할 때 확인합니다.'
    ]
  },
  violation: {
    label: '위반 기록',
    description: '권한 위반, 정책 위반, 차단된 시도처럼 즉시 확인해야 하는 기록입니다.',
    details: [
      '권한 밖 접근 시도, 차단된 요청, 정책에 걸려 수행되지 않은 작업이 보입니다.',
      '실수인지, 오남용인지, 룰 누락인지 분리해서 봐야 하는 기록입니다.',
      '보안 사고나 권한 설계 버그 후보를 찾을 때 가장 먼저 확인하는 탭입니다.'
    ]
  },
  restore: {
    label: '복구 기록',
    description: '삭제함 복구, 보관 해제처럼 되돌린 이력을 모아 봅니다.',
    details: [
      '보관 해제, 삭제 복구, 상태 되돌리기처럼 이전 상태를 복원한 기록이 나옵니다.',
      '누가 어떤 항목을 되살렸는지, 복구 판단이 적절했는지 검토할 때 사용합니다.',
      '삭제 기록과 함께 보면 삭제 후 복구까지의 전체 흐름을 확인할 수 있습니다.'
    ]
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
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{TAB_META[tab].description}</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{TAB_META[tab].label} 버튼을 누르면 아래 기록이 보입니다.</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {TAB_META[tab].details.map((detail) => (
                  <li key={detail}>- {detail}</li>
                ))}
              </ul>
            </div>
          </div>
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
