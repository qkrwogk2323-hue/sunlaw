import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { findMembership, getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { getLatestOrganizationExitRequest } from '@/lib/queries/organization-requests';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { OrganizationSettingForm } from '@/components/forms/organization-setting-form';
import { createOrganizationExitRequestAction, deactivateOrganizationAction, deleteOrganizationAction } from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge } from '@/components/ui/badge';

export default async function OrganizationSettingsPage() {
  const auth = await requireAuthenticatedUser();

  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();
  const membership = findMembership(auth, organizationId);
  if (!membership || !isWorkspaceAdmin(membership)) notFound();
  const [workspace, data, latestExitRequest] = await Promise.all([
    getOrganizationWorkspace(organizationId),
    getSettingsAdminData(organizationId),
    getLatestOrganizationExitRequest(organizationId)
  ]);
  if (!workspace) notFound();

  const orgMap = new Map(data.organizationSettings.map((row: any) => [row.key, row.value_json]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직설정</h1>
        <p className="mt-2 text-sm text-slate-600">회사소개, 회사정보, 환경설정 3개 섹션으로 운영합니다.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl bg-indigo-600 p-4 text-white">
          <p className="py-2 text-2xl font-semibold">회사소개</p>
          <p className="py-2 text-2xl font-semibold">회사정보</p>
          <p className="py-2 text-2xl font-semibold">환경설정</p>
        </div>
        <div className="space-y-3">
          <details open className="rounded-2xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-lg font-semibold text-slate-900">회사소개</summary>
            <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <p>{workspace.organization.name}의 기본 소개 및 운영 메시지 영역입니다.</p>
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-lg font-semibold text-slate-900">회사정보</summary>
            <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <p>회사명: {workspace.organization.name}</p>
              <p>조직 유형: {workspace.organization.kind ?? '-'}</p>
              <p>슬러그: {workspace.organization.slug ?? '-'}</p>
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-lg font-semibold text-slate-900">환경설정</summary>
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="grid gap-4 xl:grid-cols-2">
                {data.catalog.filter((item: any) => item.scope === 'organization' || item.scope === 'both').map((item: any) => (
                  <OrganizationSettingForm key={item.key} item={item} organizationId={organizationId} currentValue={orgMap.get(item.key)} />
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>조직 탈퇴 신청</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">조직 탈퇴는 플랫폼 관리자 승인 후 처리됩니다. 승인 전에는 상태가 유지됩니다.</p>
          {latestExitRequest ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">최근 신청 상태</span>
                <Badge tone={latestExitRequest.status === 'pending' ? 'amber' : latestExitRequest.status === 'approved' ? 'green' : latestExitRequest.status === 'rejected' ? 'red' : 'slate'}>
                  {latestExitRequest.status}
                </Badge>
              </div>
              <p className="mt-2 text-slate-600">사유: {latestExitRequest.reason ?? '-'}</p>
              {latestExitRequest.reviewed_note ? <p className="mt-1 text-slate-600">검토 메모: {latestExitRequest.reviewed_note}</p> : null}
            </div>
          ) : null}
          <form action={createOrganizationExitRequestAction} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <textarea
              name="reason"
              required
              placeholder="탈퇴 신청 사유를 입력해 주세요."
              className="min-h-24 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
            />
            <SubmitButton variant="destructive" pendingLabel="신청 중...">플랫폼 관리자 승인 요청</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>조직 비활성화 / 삭제</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <form action={deactivateOrganizationAction} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <p className="text-sm text-slate-700">조직을 비활성화하면 새 작업이 중지되고 목록에서 운영 대상에서 제외됩니다.</p>
            <label className="block text-xs font-medium text-slate-600">
              확인 문구 입력: 비활성화
              <input
                name="confirmText"
                required
                className="mt-1 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm"
                placeholder="비활성화"
              />
            </label>
            <SubmitButton pendingLabel="비활성화 중..." variant="secondary">조직 비활성화</SubmitButton>
          </form>

          <form action={deleteOrganizationAction} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <p className="text-sm text-slate-700">조직 삭제는 soft delete로 처리되며, 활성 구성원 상태와 기본 조직 연결을 해제합니다.</p>
            <label className="block text-xs font-medium text-slate-600">
              확인 문구 입력: 삭제
              <input
                name="confirmText"
                required
                className="mt-1 h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-sm"
                placeholder="삭제"
              />
            </label>
            <SubmitButton pendingLabel="삭제 처리 중..." variant="destructive">조직 삭제</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
