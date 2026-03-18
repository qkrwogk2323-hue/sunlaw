import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAccessibleOrganizations, listOrganizationMemberships } from '@/lib/queries/organizations';
import { requireAuthenticatedUser } from '@/lib/auth';

export default async function OrganizationsPage() {
  await requireAuthenticatedUser();
  const [organizations, memberships] = await Promise.all([listAccessibleOrganizations(), listOrganizationMemberships()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직 찾기</h1>
        <p className="mt-2 text-sm text-slate-600">협업 공개 조직과 내가 속한 조직을 확인하는 화면입니다.</p>
      </div>

      <div className="grid gap-6">
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
              <p className="text-sm text-slate-500">표시할 조직이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
