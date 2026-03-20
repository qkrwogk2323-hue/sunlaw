import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationCreateForm } from '@/components/forms/organization-create-form';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

export default async function AdminOrganizationsPage() {
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
  const organizations = await listAccessibleOrganizations({ includeAll: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">관리자 조직 생성</h1>
        <p className="mt-2 text-sm text-slate-600">플랫폼 관리조직 전용 직접 생성 화면입니다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>플랫폼 관리자 직접 조직 생성</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationCreateForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>전체 조직 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.length ? organizations.map((organization: any) => (
              <div key={organization.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{organization.name}</p>
                <p className="mt-1">{organization.slug ?? '-'}</p>
              </div>
            )) : <p className="text-sm text-slate-500">표시할 조직이 없습니다.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
