import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { findMembership, getEffectiveOrganizationId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { isWorkspaceAdmin } from '@/lib/permissions';
import { getOrganizationWorkspace } from '@/lib/queries/organizations';
import { getLatestOrganizationExitRequest } from '@/lib/queries/organization-requests';
import { getSettingsAdminData } from '@/lib/queries/settings-admin';
import { OrganizationSettingForm } from '@/components/forms/organization-setting-form';
import {
  createOrganizationExitRequestAction,
  deactivateOrganizationAction,
  deleteOrganizationAction,
  updateOrganizationIntroAction,
  updateOrganizationProfileAction
} from '@/lib/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge } from '@/components/ui/badge';

const kindLabel: Record<string, string> = {
  platform_management: '플랫폼 관리조직',
  law_firm: '법률사무소/로펌',
  collection_company: '추심조직',
  mixed_practice: '복합업무조직',
  corporate_legal_team: '기업 법무팀',
  other: '기타'
};

export default async function OrganizationSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ section?: string }>;
}) {
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
  const isPlatformAdmin = await hasActivePlatformAdminView(auth);
  const isPlatformRootOrganization = workspace.organization?.is_platform_root === true || workspace.organization?.slug === 'vein-bn-1';
  const resolved = searchParams ? await searchParams : undefined;
  const section = `${resolved?.section ?? 'intro'}`.trim();
  const activeSection = section === 'info' || section === 'env' ? section : 'intro';
  const introText = `${orgMap.get('organization_intro')?.text ?? ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직설정</h1>
        <p className="mt-2 text-sm text-slate-600">회사소개, 회사정보, 환경설정을 클릭하면 각각 바로 수정할 수 있습니다.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
          <Link href="/settings/organization?section=intro" className={`block rounded-xl border px-3 py-2 text-xl font-semibold ${activeSection === 'intro' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100'}`}>
            회사소개
          </Link>
          <Link href="/settings/organization?section=info" className={`block rounded-xl border px-3 py-2 text-xl font-semibold ${activeSection === 'info' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100'}`}>
            회사정보
          </Link>
          <Link href="/settings/organization?section=env" className={`block rounded-xl border px-3 py-2 text-xl font-semibold ${activeSection === 'env' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100'}`}>
            환경설정
          </Link>
        </div>
        <div className="space-y-3">
          {activeSection === 'intro' ? (
            <Card>
              <CardHeader><CardTitle>회사소개 수정</CardTitle></CardHeader>
              <CardContent>
                <form action={updateOrganizationIntroAction} className="space-y-3">
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <textarea
                    name="intro"
                    defaultValue={introText}
                    placeholder="회사소개/운영 소개 문구를 입력해 주세요."
                    className="min-h-40 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <SubmitButton pendingLabel="저장 중...">회사소개 저장</SubmitButton>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === 'info' ? (
            <Card>
              <CardHeader><CardTitle>회사정보 수정</CardTitle></CardHeader>
              <CardContent>
                <form action={updateOrganizationProfileAction} className="grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <label className="text-sm text-slate-600">회사명
                    <input name="name" defaultValue={workspace.organization.name ?? ''} required className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label className="text-sm text-slate-600">조직유형
                    {isPlatformAdmin ? (
                      <select name="kind" defaultValue={workspace.organization.kind ?? 'law_firm'} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                        <option value="law_firm">{kindLabel.law_firm}</option>
                        <option value="collection_company">{kindLabel.collection_company}</option>
                        <option value="mixed_practice">{kindLabel.mixed_practice}</option>
                        <option value="corporate_legal_team">{kindLabel.corporate_legal_team}</option>
                        <option value="other">{kindLabel.other}</option>
                      </select>
                    ) : (
                      <>
                        <input type="hidden" name="kind" value={workspace.organization.kind ?? 'law_firm'} />
                        <div className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center">
                          {isPlatformRootOrganization ? kindLabel.platform_management : (kindLabel[workspace.organization.kind] ?? workspace.organization.kind ?? '-')}
                        </div>
                      </>
                    )}
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="isDirectoryPublic"
                      defaultChecked={workspace.organization.is_directory_public !== false}
                      className="size-4"
                    />
                    협업 조직 목록에 노출
                  </label>
                  <label className="text-sm text-slate-600">대표자명
                    <input name="representativeName" defaultValue={workspace.organization.representative_name ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label className="text-sm text-slate-600">대표자 직책
                    <input name="representativeTitle" defaultValue={workspace.organization.representative_title ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label className="text-sm text-slate-600">연락처
                    <input name="phone" defaultValue={workspace.organization.phone ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label className="text-sm text-slate-600">이메일
                    <input name="email" type="email" defaultValue={workspace.organization.email ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label className="text-sm text-slate-600 md:col-span-2">웹사이트
                    <input name="websiteUrl" defaultValue={workspace.organization.website_url ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>조직 식별값: {workspace.organization.slug ?? '-'}</span>
                    <span>현재 유형: {isPlatformRootOrganization ? kindLabel.platform_management : (kindLabel[workspace.organization.kind] ?? workspace.organization.kind ?? '-')}</span>
                  </div>
                  <div className="md:col-span-2">
                    <SubmitButton pendingLabel="저장 중...">회사정보 저장</SubmitButton>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === 'env' ? (
            <Card>
              <CardHeader><CardTitle>환경설정</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-700">권한 설정은 구성원 관리 화면에서 수정합니다.</span>
                  <Link href="/settings/team" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
                    구성원/권한 설정 이동
                  </Link>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {data.catalog.filter((item: any) => item.scope === 'organization' || item.scope === 'both').map((item: any) => (
                    <OrganizationSettingForm key={item.key} item={item} organizationId={organizationId} currentValue={orgMap.get(item.key)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
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
            <p className="text-sm text-slate-700">조직 삭제는 안전 삭제로 처리되며, 활성 구성원 상태와 기본 조직 연결을 해제합니다.</p>
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
