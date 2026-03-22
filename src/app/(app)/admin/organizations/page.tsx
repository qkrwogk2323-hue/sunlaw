import Link from 'next/link';
import type { Route } from 'next';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationCreateForm } from '@/components/forms/organization-create-form';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';
import { Badge } from '@/components/ui/badge';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { deactivateOrganizationAction, deleteOrganizationAction } from '@/lib/actions/settings-actions';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';

function getLifecycleTone(status: string | null | undefined) {
  if (status === 'active') return 'green';
  if (status === 'archived') return 'amber';
  return 'red';
}

function getLifecycleLabel(status: string | null | undefined) {
  if (status === 'active') return '운영 중';
  if (status === 'archived') return '비활성화';
  if (status === 'soft_deleted') return '삭제됨';
  return status ?? '-';
}

function OrganizationListItem({ organization }: { organization: any }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{organization.name}</p>
          <p className="mt-1">{organization.slug ?? '-'}</p>
        </div>
        <Badge tone={getLifecycleTone(organization.lifecycle_status)}>{getLifecycleLabel(organization.lifecycle_status)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/audit?tab=general&table=organizations&resource=${organization.id}` as Route}
          className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}
        >
          감사로그 보기
        </Link>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ClientActionForm
          action={deactivateOrganizationAction}
          successTitle="조직이 비활성화되었습니다."
          successMessage="플랫폼 운영 목록에서도 즉시 상태가 갱신됩니다."
          errorTitle="조직 비활성화에 실패했습니다."
          errorCause="확인 문구가 틀렸거나 권한이 없습니다."
          errorResolution="확인 문구 '비활성화'를 정확히 입력해 주세요."
          className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <input type="hidden" name="organizationId" value={organization.id} />
          <p className="text-xs text-slate-700">확인 문구 입력: 비활성화</p>
          <input
            name="confirmText"
            required
            aria-required="true"
            className="h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm"
            placeholder="비활성화"
          />
          <SubmitButton pendingLabel="비활성화 중..." variant="secondary">조직 비활성화</SubmitButton>
        </ClientActionForm>
        <ClientActionForm
          action={deleteOrganizationAction}
          successTitle="조직 삭제 처리가 완료되었습니다."
          successMessage="조직 상태와 기본 연결 해제가 반영됩니다."
          errorTitle="조직 삭제에 실패했습니다."
          errorCause="확인 문구가 틀렸거나 권한이 없습니다."
          errorResolution="확인 문구 '삭제'를 정확히 입력해 주세요."
          className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <input type="hidden" name="organizationId" value={organization.id} />
          <p className="text-xs text-slate-700">확인 문구 입력: 삭제</p>
          <input
            name="confirmText"
            required
            aria-required="true"
            className="h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-sm"
            placeholder="삭제"
          />
          <SubmitButton pendingLabel="삭제 처리 중..." variant="destructive">조직 삭제</SubmitButton>
        </ClientActionForm>
      </div>
    </div>
  );
}

export default async function AdminOrganizationsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const canAccess = await hasActivePlatformAdminView(auth, getPlatformOrganizationContextId(auth));
  if (!canAccess) {
    return (
      <AccessDeniedBlock
        blocked="플랫폼 관리자 전용 화면 접근이 차단되었습니다."
        cause="현재 조직 또는 현재 계정 권한으로는 조직 현황을 조회할 수 없습니다."
        resolution="플랫폼 조직 관리자 권한으로 전환하거나, 권한 승인을 요청해 주세요."
      />
    );
  }
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const queryFilter = `${resolvedSearchParams?.q ?? ''}`.trim().toLowerCase();
  const organizations = (await listAccessibleOrganizations({ includeAll: true })).filter((organization: any) => {
    if (!queryFilter) return true;
    const haystack = `${organization.name ?? ''} ${organization.slug ?? ''}`.toLowerCase();
    return haystack.includes(queryFilter);
  });

  const activeCount = organizations.filter((organization: any) => organization.lifecycle_status === 'active').length;
  const archivedCount = organizations.filter((organization: any) => organization.lifecycle_status === 'archived').length;
  const deletedCount = organizations.filter((organization: any) => organization.lifecycle_status === 'soft_deleted').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 관리 대시보드</h1>
        <p className="mt-2 text-sm text-slate-600">조직 목록을 먼저 보고 상태를 바꾸는 흐름으로 정리했습니다. 직접 조직 생성은 보조영역으로 내렸습니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>전체 조직 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <UnifiedListSearch
              action="/admin/organizations"
              defaultValue={queryFilter}
              placeholder="조직명, 슬러그 검색"
              ariaLabel="조직 목록 검색"
            />
            {organizations.length ? (
              <CollapsibleList
                label="조직"
                totalCount={organizations.length}
                visibleContent={organizations.slice(0, 7).map((organization: any) => (
                  <OrganizationListItem key={organization.id} organization={organization} />
                ))}
                hiddenContent={organizations.slice(7).map((organization: any) => (
                  <OrganizationListItem key={organization.id} organization={organization} />
                ))}
              />
            ) : <p className="text-sm text-slate-500">표시할 조직이 없습니다.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>상태 요약</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-slate-500">운영 중</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{activeCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-slate-500">비활성화</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{archivedCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-slate-500">삭제됨</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{deletedCount}</p>
              </div>
            </CardContent>
          </Card>

          <CollapsibleSettingsSection
            title="직접 조직 생성"
            description="플랫폼에서 바로 새 조직을 만들어야 할 때만 열어서 사용합니다."
          >
            <OrganizationCreateForm />
          </CollapsibleSettingsSection>
        </div>
      </div>
    </div>
  );
}
