import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationCreateForm } from '@/components/forms/organization-create-form';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 관리 대시보드</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 조직 운영자는 목록을 먼저 확인하고, 필요한 경우에만 직접 조직을 생성합니다.</p>
      </div>

      <div className="grid gap-6">
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
                  <div key={organization.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{organization.name}</p>
                    <p className="mt-1">{organization.slug ?? '-'}</p>
                  </div>
                ))}
                hiddenContent={organizations.slice(7).map((organization: any) => (
                  <div key={organization.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">{organization.name}</p>
                    <p className="mt-1">{organization.slug ?? '-'}</p>
                  </div>
                ))}
              />
            ) : <p className="text-sm text-slate-500">표시할 조직이 없습니다.</p>}
          </CardContent>
        </Card>

        <details className="group rounded-2xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900">
            직접 조직 생성 열기
          </summary>
          <div className="border-t border-slate-200 p-5">
            <OrganizationCreateForm />
          </div>
        </details>
      </div>
    </div>
  );
}
