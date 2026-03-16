import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrganizationCreateForm } from '@/components/forms/organization-create-form';
import { OrganizationSignupForm } from '@/components/forms/organization-signup-form';
import { listAccessibleOrganizations, listOrganizationMemberships } from '@/lib/queries/organizations';
import { hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';

export default async function OrganizationsPage() {
  const auth = await requireAuthenticatedUser();
  const [organizations, memberships] = await Promise.all([listAccessibleOrganizations(), listOrganizationMemberships()]);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Organizations</h1>
        <p className="mt-2 text-sm text-slate-600">접근 가능한 조직과 온보딩 상태를 확인한다.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{isPlatformAdmin ? '플랫폼 관리자 직접 조직 생성' : '조직 개설 신청'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isPlatformAdmin ? <OrganizationCreateForm /> : <OrganizationSignupForm />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>접근 가능한 조직</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.length ? (
              organizations.map((organization: any) => {
                const role = memberships.find((membership: any) => membership.organization_id === organization.id)?.role ?? 'accessible';
                return (
                  <Link key={organization.id} href={`/organizations/${organization.id}`} className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{organization.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{organization.business_number ?? '사업자번호 미등록'}</p>
                      </div>
                      <Badge tone="blue">{role}</Badge>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">접근 가능한 조직이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
