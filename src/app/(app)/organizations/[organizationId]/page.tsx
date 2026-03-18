import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { formatCurrency, formatDateTime } from '@/lib/format';

export default async function OrganizationDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ organizationId: string }>;
  searchParams?: Promise<{ invite?: string }>;
}) {
  const { organizationId } = await params;
  const query = searchParams ? await searchParams : undefined;
  const workspace = await getOrganizationWorkspace(organizationId);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{workspace.organization.name}</h1>
        <p className="mt-2 text-sm text-slate-600">슬러그: {workspace.organization.slug}</p>
      </div>

      {query?.invite ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          생성된 조직관리자 초대 링크: <code className="font-mono">/invite/{query.invite}</code>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>조직 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>사업자등록번호: {workspace.organization.business_number ?? '-'}</p>
            <p>대표자: {workspace.organization.representative_name ?? '-'}</p>
            <p>대표 이메일: {workspace.organization.email ?? '-'}</p>
            <p>대표 전화: {workspace.organization.phone ?? '-'}</p>
            <p>주소: {workspace.organization.address_line1 ?? '-'} {workspace.organization.address_line2 ?? ''}</p>
            <p>사건 수: {workspace.caseCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구성원</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">이름</th>
                  <th className="py-2">이메일</th>
                  <th className="py-2">역할</th>
                  <th className="py-2">직함</th>
                </tr>
              </thead>
              <tbody>
                {workspace.members.map((member: any) => (
                  <tr key={member.id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-3">{member.profile?.full_name ?? '-'}</td>
                    <td className="py-3">{member.profile?.email ?? '-'}</td>
                    <td className="py-3"><Badge tone="blue">{member.role}</Badge></td>
                    <td className="py-3">{member.title ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>최근 사건</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.recentCases.length ? (
            workspace.recentCases.map((caseItem: any) => (
              <div key={caseItem.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{caseItem.title}</p>
                  <Badge tone="slate">{caseItem.case_status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{caseItem.reference_no ?? '-'}</span>
                  <span>{caseItem.case_type}</span>
                  <span>{formatCurrency(caseItem.principal_amount)}</span>
                  <span>{formatDateTime(caseItem.updated_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">등록된 사건이 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
