import Link from 'next/link';
import type { Route } from 'next';
import { BriefcaseBusiness } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaseCreateForm } from '@/components/forms/case-create-form';
import { forceDeleteCaseAction, moveCaseToDeletedAction, restoreCaseAction } from '@/lib/actions/case-actions';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCaseClientLinkedMap, listCases, purgeDeletedCasesPastRetention } from '@/lib/queries/cases';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getCaseStageLabel, isCaseStageStale } from '@/lib/case-stage';
import { getCaseHubRegistrations } from '@/lib/queries/collaboration-hubs';
import { getCaseHubList, getCaseHubsForCases } from '@/lib/queries/case-hubs';
import { CaseHubConnectButton } from '@/components/case-hub-connect-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { HubContextStrip } from '@/components/hub-context-strip';
import { PremiumInfoPanel } from '@/components/premium-info-panel';
import { HubMetricBadge } from '@/components/hub-metric-badge';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { bulkUploadCasesAction } from '@/lib/actions/bulk-upload-actions';
import { buttonStyles } from '@/components/ui/button';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';

type BucketKey = 'active' | 'completed' | 'deleted';

const BUCKET_META: Record<BucketKey, { label: string; helper: string; cardDescription: string }> = {
  active: {
    label: '진행중 사건',
    helper: '현재 진행중인 사건목록입니다.',
    cardDescription: '지금 관리 중인 사건과 다음 조치가 필요한 사건만 모아 봅니다.'
  },
  completed: {
    label: '완료된 사건',
    helper: '완료된 사건목록입니다.',
    cardDescription: '종결되었거나 마무리된 사건 이력을 다시 확인할 때 사용합니다.'
  },
  deleted: {
    label: '삭제함',
    helper: '삭제예정함입니다. 30일 이후 자동삭제되며 강제삭제도 가능합니다.',
    cardDescription: '삭제함으로 보낸 사건을 복구하거나 최종 보관 처리할 수 있습니다.'
  }
};

function getCaseStatusLabel(status?: string | null) {
  const normalized = `${status ?? ''}`.toLowerCase();
  if (normalized === 'active' || normalized === 'intake' || normalized === 'in_progress') return '진행중';
  if (normalized === 'closed' || normalized === 'completed' || normalized === 'done') return '완료';
  if (normalized === 'archived') return '삭제 대기';
  return status || '상태 미설정';
}

function parseBucket(input?: string): BucketKey {
  if (input === 'completed') return 'completed';
  if (input === 'deleted') return 'deleted';
  return 'active';
}

export default async function CasesPage({
  searchParams
}: {
  searchParams?: Promise<{ bucket?: string; q?: string }>;
}) {
  const auth = await requireAuthenticatedUser();
  const currentOrganizationId = getEffectiveOrganizationId(auth);
  const resolved = searchParams ? await searchParams : undefined;
  const bucket = parseBucket(resolved?.bucket);
  const queryFilter = `${resolved?.q ?? ''}`.trim().toLowerCase();

  await purgeDeletedCasesPastRetention(currentOrganizationId, 30);

  const [activeCases, completedCases, deletedCases] = await Promise.all([
    listCases(currentOrganizationId, { bucket: 'active' }),
    listCases(currentOrganizationId, { bucket: 'completed' }),
    listCases(currentOrganizationId, { bucket: 'deleted' })
  ]);

  const selectedCases = bucket === 'active' ? activeCases : bucket === 'completed' ? completedCases : deletedCases;
  const filteredCases = selectedCases.filter((item: any) => {
    if (!queryFilter) return true;
    const haystack = `${item.title ?? ''} ${item.reference_no ?? ''} ${item.case_number ?? ''}`.toLowerCase();
    return haystack.includes(queryFilter);
  });

  const allCaseIds = [...activeCases, ...completedCases, ...deletedCases].map((item: any) => item.id);
  const [hubRegistrations, caseClientLinkedMap, caseHubMap, hubList] = await Promise.all([
    getCaseHubRegistrations(currentOrganizationId, allCaseIds),
    getCaseClientLinkedMap(allCaseIds),
    getCaseHubsForCases(currentOrganizationId, allCaseIds),
    getCaseHubList(currentOrganizationId)
  ]);

  const organizations = auth.memberships.map((membership) => ({
    id: membership.organization_id,
    name: membership.organization?.name ?? membership.organization_id
  }));

  function renderCaseCard(item: any) {
    return (
      <div key={item.id} className="vs-interactive rounded-xl border border-slate-200 bg-white/85 p-3 transition hover:border-slate-900">
        <Link href={`/cases/${item.id}`} className="block">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.reference_no ?? '-'} · {item.case_type}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge tone={caseClientLinkedMap[item.id] ? 'blue' : 'slate'}>
                {caseClientLinkedMap[item.id] ? '의뢰인 연동' : '의뢰인 미연동'}
              </Badge>
              <Badge tone="slate">
                {hubRegistrations[item.id]?.sharedHubId ? '허브 연결' : '허브 미연결'}
              </Badge>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={isCaseStageStale(item.updated_at, 7) ? 'amber' : 'slate'}>
              {isCaseStageStale(item.updated_at, 7) ? '단계 갱신 필요' : '단계 최신'}
            </Badge>
            <Badge tone="blue">{getCaseStageLabel(item.stage_key)}</Badge>
            <Badge tone="slate">{getCaseStatusLabel(item.case_status)}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>{item.court_name ?? '법원 미지정'}</span>
            <span>{item.case_number ?? '사건번호 미등록'}</span>
            <span>{formatCurrency(item.principal_amount)}</span>
            <span>{formatDateTime(item.updated_at)}</span>
          </div>
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* 허브 연동/입장 버튼 */}
          {bucket !== 'deleted' && (
            <CaseHubConnectButton
              caseId={item.id}
              caseTitle={item.title}
              organizationId={item.organization_id ?? currentOrganizationId}
              hasClients={Boolean(caseClientLinkedMap[item.id])}
              hub={caseHubMap[item.id] ?? null}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
          {bucket !== 'deleted' ? (
            <DangerActionButton
              action={moveCaseToDeletedAction}
              fields={{ caseId: item.id, organizationId: item.organization_id }}
              confirmTitle="사건을 삭제함으로 이동할까요?"
              confirmDescription="삭제함으로 이동된 사건은 30일 후 자동으로 영구 삭제됩니다. 그 전에 삭제함에서 복원할 수 있습니다."
              highlightedInfo={item.title}
              confirmLabel="삭제함 이동"
              variant="warning"
              undoNote="삭제함으로 이동한 뒤에도 '삭제함' 탭에서 복원할 수 있습니다."
              successTitle="삭제함으로 이동했습니다."
              successMessage={`'${item.title}' 사건이 삭제함에 보관됩니다.`}
              errorTitle="삭제함 이동에 실패했습니다."
              errorCause="서버 처리 중 문제가 발생했습니다."
              errorResolution="잠시 후 다시 시도하거나 페이지를 새로고침 해주세요."
              buttonVariant="secondary"
              className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            >
              삭제함 이동
            </DangerActionButton>
          ) : null}
          {bucket === 'deleted' ? (
            <DangerActionButton
              action={restoreCaseAction}
              fields={{ caseId: item.id, organizationId: item.organization_id }}
              confirmTitle="사건을 복구할까요?"
              confirmDescription="삭제함에 있던 사건을 다시 진행 목록으로 돌립니다."
              highlightedInfo={item.title}
              confirmLabel="복구"
              variant="warning"
              successTitle="사건을 복구했습니다."
              successMessage={`'${item.title}' 사건을 다시 진행 목록으로 되돌렸습니다.`}
              errorTitle="사건 복구에 실패했습니다."
              errorCause="삭제함 상태가 아니거나 복구 권한이 없습니다."
              errorResolution="삭제함 상태를 확인한 뒤 다시 시도해 주세요."
              buttonVariant="secondary"
            >
              복구
            </DangerActionButton>
          ) : null}
          {bucket === 'deleted' ? (
            <DangerActionButton
              action={forceDeleteCaseAction}
              fields={{ caseId: item.id, organizationId: item.organization_id }}
              confirmTitle="사건을 최종 보관 처리할까요?"
              confirmDescription="이 작업을 완료하면 삭제함에서 더 이상 보이지 않습니다. 최종 보관 처리된 사건은 일반 목록과 대시보드에서 제외됩니다."
              highlightedInfo={item.title}
              confirmLabel="최종 보관"
              variant="danger"
              successTitle="사건이 최종 보관 처리되었습니다."
              errorTitle="최종 보관 처리에 실패했습니다."
              errorCause="삭제함 상태가 아니거나 서버 처리 중 문제가 발생했습니다."
              errorResolution="삭제함 상태를 확인한 뒤 다시 시도하거나 관리자에게 문의해 주세요."
              buttonVariant="destructive"
            >
              최종 보관
            </DangerActionButton>
          ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HubContextStrip hubs={hubList.slice(0, 4)} currentLabel="사건 목록" />

      <div className="grid gap-6 xl:grid-cols-[8fr_4fr]">
        <div className="vs-brand-panel overflow-hidden rounded-[1.8rem] p-6 text-white shadow-[0_24px_54px_rgba(8,47,73,0.26)]">
          <div className="grid gap-3 md:grid-cols-3">
            {(['active', 'completed', 'deleted'] as BucketKey[]).map((key) => {
              const count = key === 'active' ? activeCases.length : key === 'completed' ? completedCases.length : deletedCases.length;
              const isActive = key === bucket;
              const href = `/cases?bucket=${key}${queryFilter ? `&q=${encodeURIComponent(queryFilter)}` : ''}` as Route;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`rounded-2xl border p-4 text-center backdrop-blur-sm transition ${
                    isActive
                      ? 'border-sky-100/70 bg-white/18'
                      : 'border-white/10 bg-white/8 hover:border-sky-100/40'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-100/75">{BUCKET_META[key].label}</p>
                  <p className="mt-3 text-4xl font-semibold text-white tabular-nums">{count}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-200/82">{BUCKET_META[key].cardDescription}</p>
                  <p className="mt-3 text-xs font-semibold text-sky-100/88">해당 목록 열기</p>
                </Link>
              );
            })}
          </div>
        </div>
        <PremiumInfoPanel
          title="사건허브 요약"
          description="사건목록에서도 최근 사용한 사건허브를 바로 다시 열 수 있습니다."
        >
          {hubList.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <HubMetricBadge label="협업" value={`${hubList[0].collaboratorCount}/${hubList[0].collaboratorLimit}`} tone="blue" />
                <HubMetricBadge label="열람" value={`${hubList[0].viewerCount}/${hubList[0].viewerLimit}`} tone="violet" />
                <HubMetricBadge label="미읽음" value={`${hubList[0].unreadCount}`} tone="amber" />
                <HubMetricBadge label="최근 활동" value={formatHubRelativeActivity(hubList[0].lastActivityAt)} tone="slate" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{hubList[0].title ?? hubList[0].caseTitle ?? '사건허브'}</p>
              <p className="text-sm text-slate-500">최근 사용한 허브를 기준으로 바로 허브 화면으로 이어집니다.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
              <p className="text-sm font-medium text-slate-700">아직 연결된 사건허브가 없습니다.</p>
              <p className="mt-1 text-sm text-slate-500">사건 카드의 허브 연동 버튼으로 첫 허브를 열어 보세요.</p>
            </div>
          )}
        </PremiumInfoPanel>
      </div>

      <div className="space-y-3">
        <CollapsibleSettingsSection
          title="사건 등록하기"
          description="새 사건을 직접 등록할 때만 열어서 사용합니다."
        >
          <Card className="vs-mesh-card">
            <CardContent className="pt-5">
              <CaseCreateForm organizations={organizations} defaultOrganizationId={currentOrganizationId} />
            </CardContent>
          </Card>
        </CollapsibleSettingsSection>
        <CollapsibleSettingsSection
          title="CSV 일괄 등록"
          description="양식에 맞춘 CSV 파일로 여러 사건을 한 번에 등록합니다."
        >
          <div>
            <p className="mb-1 text-sm font-medium text-slate-900">대량 등록은 CSV 양식에 맞춰 올려 주세요.</p>
            <p className="mb-3 text-sm text-slate-500">직접 입력은 최대 5건까지 권장합니다. 더 많은 사건은 양식을 내려받아 그대로 작성한 뒤 한 번에 등록하세요.</p>
            <BulkUploadPanel
              mode="cases"
              organizationId={currentOrganizationId ?? ''}
              action={bulkUploadCasesAction}
            />
          </div>
        </CollapsibleSettingsSection>
        <UnifiedListSearch
          action="/cases"
          defaultValue={queryFilter}
          placeholder="사건명, 참조번호, 사건번호 검색"
          ariaLabel="사건 목록 검색"
          hiddenFields={{ bucket }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>사건목록</span>
            <span className="flex flex-wrap items-center gap-3 text-sm font-normal text-slate-500">
              <span>{BUCKET_META[bucket].helper}</span>
              <Link
                href={'/admin/audit?tab=general&table=cases' as Route}
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
              >
                사건 변경 이력 보기
              </Link>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredCases.length ? (
            <CollapsibleList
              label="사건"
              totalCount={filteredCases.length}
              visibleContent={filteredCases.slice(0, 7).map(renderCaseCard)}
              hiddenContent={filteredCases.slice(7).map(renderCaseCard)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 text-center">
              <BriefcaseBusiness className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">표시할 사건이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
