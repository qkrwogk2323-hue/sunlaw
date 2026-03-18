import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationCreateForm } from '@/components/forms/organization-create-form';
import { listAccessibleOrganizations } from '@/lib/queries/organizations';
import { requirePlatformAdmin } from '@/lib/auth';

export default async function AdminOrganizationsPage() {
  await requirePlatformAdmin();
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