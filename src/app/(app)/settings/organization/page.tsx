import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { findMembership, getEffectiveOrganizationId, getPlatformOrganizationContextId, hasActivePlatformAdminView, requireAuthenticatedUser } from '@/lib/auth';
import { isPlatformManagementOrganization } from '@/lib/platform-governance';
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
import { ClientActionForm } from '@/components/ui/client-action-form';
import { AccessDeniedBlock } from '@/components/ui/access-denied-block';

const kindLabel: Record<string, string> = {
  platform_management: '플랫폼 관리조직',
  law_firm: '법률사무소/로펌',
  collection_company: '신용정보회사',
  mixed_practice: '복합업무조직',
  corporate_legal_team: '기업 법무팀',
  other: '기타'
};

function organizationExitStatusLabel(status: string) {
  if (status === 'pending') return '검토 대기';
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려됨';
  return status;
}

export default async function OrganizationSettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ section?: string }>;
}) {
  const auth = await requireAuthenticatedUser();

  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) {
    return (
      <AccessDeniedBlock
        blocked="조직 설정 화면 접근이 차단되었습니다."
        cause="현재 요청에는 유효한 조직 컨텍스트가 포함되지 않았습니다."
        resolution="조직을 선택한 뒤 다시 시도해 주세요."
      />
    );
  }
  const membership = findMembership(auth, organizationId);
  if (!membership || !isWorkspaceAdmin(membership)) {
    return (
      <AccessDeniedBlock
        blocked="조직 설정 수정이 차단되었습니다."
        cause="현재 조직에서 관리자 권한(오너/매니저)이 확인되지 않았습니다."
        resolution="조직 관리자 권한으로 전환하거나 권한 승인을 요청해 주세요."
      />
    );
  }
  const [workspace, data, latestExitRequest] = await Promise.all([
    getOrganizationWorkspace(organizationId),
    getSettingsAdminData(organizationId),
    getLatestOrganizationExitRequest(organizationId)
  ]);
  if (!workspace) {
    return (
      <AccessDeniedBlock
        blocked="조직 정보를 불러오지 못해 설정 화면이 차단되었습니다."
        cause="요청한 조직 데이터가 없거나 비활성 상태입니다."
        resolution="조직 상태를 확인하고, 문제가 지속되면 관리자에게 문의해 주세요."
      />
    );
  }

  const orgMap = new Map(data.organizationSettings.map((row: any) => [row.key, row.value_json]));
  const platformContextId = getPlatformOrganizationContextId(auth);
  const isPlatformAdmin = await hasActivePlatformAdminView(auth, platformContextId);
  const isPlatformManagementOrganizationView = isPlatformManagementOrganization(workspace.organization);
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
                <ClientActionForm
                  action={updateOrganizationIntroAction}
                  successTitle="회사소개가 저장되었습니다."
                  errorTitle="회사소개 저장에 실패했습니다."
                  errorCause="입력값 검증 또는 서버 오류"
                  errorResolution="내용을 다시 확인하고 저장해 주세요."
                  className="space-y-3"
                >
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <div className="space-y-1">
                    <label htmlFor="organization-intro" className="text-sm font-medium text-slate-700">
                      회사소개
                    </label>
                    <textarea
                      id="organization-intro"
                      name="intro"
                      defaultValue={introText}
                      placeholder="회사소개/운영 소개 문구를 입력해 주세요."
                      className="min-h-40 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <SubmitButton pendingLabel="저장 중...">회사소개 저장</SubmitButton>
                </ClientActionForm>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === 'info' ? (
            <Card>
              <CardHeader><CardTitle>회사정보 수정</CardTitle></CardHeader>
              <CardContent>
                <ClientActionForm
                  action={updateOrganizationProfileAction}
                  successTitle="회사정보가 저장되었습니다."
                  errorTitle="회사정보 저장에 실패했습니다."
                  errorCause="필수 항목 누락 또는 서버 오류"
                  errorResolution="입력값을 확인하고 다시 저장해 주세요."
                  className="grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <label htmlFor="organization-name" className="text-sm text-slate-600">회사명
                    <input id="organization-name" name="name" defaultValue={workspace.organization.name ?? ''} required aria-required="true" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label htmlFor="organization-kind" className="text-sm text-slate-600">조직유형
                    {isPlatformAdmin && !isPlatformManagementOrganizationView ? (
                      <select id="organization-kind" name="kind" defaultValue={workspace.organization.kind ?? 'law_firm'} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                        <option value="law_firm">{kindLabel.law_firm}</option>
                        <option value="collection_company">{kindLabel.collection_company}</option>
                        <option value="mixed_practice">{kindLabel.mixed_practice}</option>
                        <option value="corporate_legal_team">{kindLabel.corporate_legal_team}</option>
                        <option value="other">{kindLabel.other}</option>
                      </select>
                    ) : (
                      <>
                        <input type="hidden" name="kind" value={isPlatformManagementOrganizationView ? 'platform_management' : (workspace.organization.kind ?? 'law_firm')} />
                        <div className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 flex items-center">
                          {isPlatformManagementOrganizationView ? kindLabel.platform_management : (kindLabel[workspace.organization.kind] ?? workspace.organization.kind ?? '-')}
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
                  <label htmlFor="organization-representative-name" className="text-sm text-slate-600">대표자명
                    <input id="organization-representative-name" name="representativeName" defaultValue={workspace.organization.representative_name ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label htmlFor="organization-representative-title" className="text-sm text-slate-600">대표자 직책
                    <input id="organization-representative-title" name="representativeTitle" defaultValue={workspace.organization.representative_title ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label htmlFor="organization-phone" className="text-sm text-slate-600">연락처
                    <input id="organization-phone" name="phone" defaultValue={workspace.organization.phone ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label htmlFor="organization-email" className="text-sm text-slate-600">이메일
                    <input id="organization-email" name="email" type="email" defaultValue={workspace.organization.email ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <label htmlFor="organization-website-url" className="text-sm text-slate-600 md:col-span-2">웹사이트
                    <input id="organization-website-url" name="websiteUrl" defaultValue={workspace.organization.website_url ?? ''} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900" />
                  </label>
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>조직 식별값: {workspace.organization.slug ?? '-'}</span>
                    <span>현재 유형: {isPlatformManagementOrganizationView ? kindLabel.platform_management : (kindLabel[workspace.organization.kind] ?? workspace.organization.kind ?? '-')}</span>
                  </div>
                  {isPlatformAdmin && isPlatformManagementOrganizationView ? (
                    <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
                      <p className="font-semibold">플랫폼 관리조직 전용 기능</p>
                      <p className="mt-1 text-sky-800">직접 조직 생성은 플랫폼 관리조직의 관리자만 사용할 수 있습니다.</p>
                      <Link href="/admin/organizations" className="mt-3 inline-flex rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-900 hover:bg-sky-100">
                        직접 조직 생성 열기
                      </Link>
                    </div>
                  ) : null}
                  <div className="md:col-span-2">
                    <SubmitButton pendingLabel="저장 중...">회사정보 저장</SubmitButton>
                  </div>
                </ClientActionForm>
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
                  {organizationExitStatusLabel(latestExitRequest.status)}
                    </Badge>
                  </div>
              <p className="mt-2 text-slate-600">사유: {latestExitRequest.reason ?? '-'}</p>
              {latestExitRequest.reviewed_note ? <p className="mt-1 text-slate-600">검토 메모: {latestExitRequest.reviewed_note}</p> : null}
            </div>
          ) : null}
          <ClientActionForm
            action={createOrganizationExitRequestAction}
            successTitle="탈퇴 신청이 접수되었습니다."
            successMessage="플랫폼 관리자 검토 후 처리됩니다. 승인 전까지 조직 운영은 유지됩니다."
            errorTitle="탈퇴 신청에 실패했습니다."
            errorCause="이미 대기 중인 신청이 있거나 탈퇴 요청 저장에 실패했습니다."
            errorResolution="기존 신청 상태를 확인하거나 잠시 후 다시 시도해 주세요."
            className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <div className="space-y-1">
              <label htmlFor="organization-exit-reason" className="text-sm font-medium text-slate-700">
                탈퇴 신청 사유 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="organization-exit-reason"
                name="reason"
                required
                aria-required="true"
                placeholder="탈퇴 신청 사유를 입력해 주세요."
                className="min-h-24 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <SubmitButton variant="destructive" pendingLabel="신청 중...">플랫폼 관리자 승인 요청</SubmitButton>
          </ClientActionForm>
        </CardContent>
      </Card>

      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>조직 비활성화 / 삭제</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ClientActionForm
            action={deactivateOrganizationAction}
            successTitle="조직이 비활성화되었습니다."
            successMessage="새 작업이 중지되고 운영 대상에서 제외됩니다."
            errorTitle="비활성화에 실패했습니다."
            errorCause="확인 문구가 틀렸거나 권한이 없습니다."
            errorResolution="확인 문구 '비활성화'를 정확히 입력했는지 확인해 주세요."
            className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <p className="text-sm text-slate-700">조직을 비활성화하면 새 작업이 중지되고 목록에서 운영 대상에서 제외됩니다.</p>
            <label htmlFor="organization-deactivate-confirm" className="block text-xs font-medium text-slate-600">
              확인 문구 입력: 비활성화
              <input
                id="organization-deactivate-confirm"
                name="confirmText"
                required
                aria-required="true"
                className="mt-1 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm"
                placeholder="비활성화"
              />
            </label>
            <SubmitButton pendingLabel="비활성화 중..." variant="secondary">조직 비활성화</SubmitButton>
          </ClientActionForm>

          <ClientActionForm
            action={deleteOrganizationAction}
            successTitle="조직 삭제 처리가 완료되었습니다."
            successMessage="활성 구성원 상태와 기본 조직 연결이 해제되었습니다."
            errorTitle="조직 삭제에 실패했습니다."
            errorCause="확인 문구가 틀렸거나 권한이 없습니다."
            errorResolution="확인 문구 '삭제'를 정확히 입력했는지 확인하고, 문제가 지속되면 관리자에게 문의해 주세요."
            className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <p className="text-sm text-slate-700">조직 삭제는 안전 삭제로 처리되며, 활성 구성원 상태와 기본 조직 연결을 해제합니다.</p>
            <label htmlFor="organization-delete-confirm" className="block text-xs font-medium text-slate-600">
              확인 문구 입력: 삭제
              <input
                id="organization-delete-confirm"
                name="confirmText"
                required
                aria-required="true"
                className="mt-1 h-10 w-full rounded-lg border border-red-200 bg-white px-3 text-sm"
                placeholder="삭제"
              />
            </label>
            <SubmitButton pendingLabel="삭제 처리 중..." variant="destructive">조직 삭제</SubmitButton>
          </ClientActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
