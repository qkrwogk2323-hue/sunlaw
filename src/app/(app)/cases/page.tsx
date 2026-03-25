import Link from 'next/link';
import type { Route } from 'next';
import { BriefcaseBusiness, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaseCreateForm } from '@/components/forms/case-create-form';
import { forceDeleteCaseAction, moveCaseToDeletedAction, restoreCaseAction } from '@/lib/actions/case-actions';
import { getEffectiveOrganizationId, isManagementRole, requireAuthenticatedUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCaseClientLinkedMap, listCases } from '@/lib/queries/cases';
import { resolveOrganizationCasePolicies } from '@/lib/case-scope';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getCaseStageLabel, isCaseStageStale } from '@/lib/case-stage';
import { getCaseHubRegistrations } from '@/lib/queries/collaboration-hubs';
import { getCaseHubList, getCaseHubsForCases } from '@/lib/queries/case-hubs';
import { CaseHubConnectButton } from '@/components/case-hub-connect-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { CollapsibleList } from '@/components/ui/collapsible-list';
import { UnifiedListSearch } from '@/components/ui/unified-list-search';
import { HubContextStrip } from '@/components/hub-context-strip';
import { CasesBulkConnectPanel } from '@/components/cases-bulk-connect-panel';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { bulkUploadCasesAction } from '@/lib/actions/bulk-upload-actions';
import { buttonStyles } from '@/components/ui/button';
import { CollapsibleSettingsSection } from '@/components/ui/collapsible-settings-section';
import { ExportLinks } from '@/components/export-links';
import { LogButton } from '@/components/ui/log-button';

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

  // Determine if this user is in restricted (assigned-cases-only) scope
  const { restrictedOrganizationIds } = resolveOrganizationCasePolicies(auth, currentOrganizationId);
  const isRestrictedScope = restrictedOrganizationIds.length > 0 && !auth.memberships.some(
    (m) => m.organization_id === currentOrganizationId && isManagementRole(m.role)
  );

  const currentMembership = auth.memberships.find(
    (membership) => membership.organization_id === currentOrganizationId && membership.status === 'active'
  ) ?? null;
  // 사건 생성은 활성 조직원이면 모두 허용한다.
  const canCreateCase = Boolean(currentMembership);
  // 삭제/복구/최종 보관은 관리자만 허용한다.
  const canDeleteCase = Boolean(currentMembership && isManagementRole(currentMembership.role));

  // Current organization name for context display
  const currentOrgName = auth.memberships.find(
    (m) => m.organization_id === currentOrganizationId
  )?.organization?.name ?? null;

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
    const hasHub = Boolean(hubRegistrations[item.id]?.sharedHubId || caseHubMap[item.id]);
    const hasClient = Boolean(caseClientLinkedMap[item.id]);
    const isStale = isCaseStageStale(item.updated_at, 7);

    return (
      <div key={item.id} className="vs-interactive rounded-xl border border-slate-200 bg-white/85 transition hover:border-slate-400">
        {/* 행 1: 제목 + 핵심 배지 + 액션 */}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <Link href={`/cases/${item.id}`} className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium text-slate-900 text-sm leading-tight">{item.title}</span>
              <Badge tone="blue">{getCaseStageLabel(item.stage_key)}</Badge>
              <Badge tone="slate">{getCaseStatusLabel(item.case_status)}</Badge>
              {isStale && <Badge tone="amber">갱신필요</Badge>}
              {hasClient && <Badge tone="green">의뢰인</Badge>}
              {hasHub && <Badge tone="green">허브</Badge>}
            </div>
            {(item.reference_no || item.court_name || item.case_number || item.principal_amount) && (
              <p className="mt-0.5 text-xs text-slate-400 truncate">
                {[item.reference_no, item.court_name, item.case_number, formatCurrency(item.principal_amount)].filter(Boolean).join(' · ')}
              </p>
            )}
          </Link>
          {/* 액션 버튼 영역 */}
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {bucket !== 'deleted' && (
              <CaseHubConnectButton
                caseId={item.id}
                caseTitle={item.title}
                organizationId={item.organization_id ?? currentOrganizationId}
                hasClients={hasClient}
                hub={caseHubMap[item.id] ?? null}
              />
            )}
            {bucket !== 'deleted' && canDeleteCase ? (
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
                errorCause="권한이 없거나 사건 상태가 변경되었습니다."
                errorResolution="페이지를 새로고침하고 다시 시도해 주세요."
                buttonVariant="secondary"
                className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                삭제함
              </DangerActionButton>
            ) : null}
            {bucket === 'deleted' && canDeleteCase ? (
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
            {bucket === 'deleted' && canDeleteCase ? (
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
                보관
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

      <div className="space-y-3">
        {canCreateCase ? (
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
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="mt-0.5 shrink-0" aria-hidden="true">🔒</span>
            <span>사건 등록 권한이 없습니다. 조직 관리자에게 사건 등록 권한을 요청하세요.</span>
          </div>
        )}
        {canCreateCase ? (
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
        ) : null}
        <div className="flex items-center gap-2">
          {!isRestrictedScope && currentOrganizationId && (
            <LogButton
              organizationId={currentOrganizationId}
              surface="cases"
              label="사건 기록"
              title="사건 상태·담당·문서 기록"
              description="사건 생성·수정·상태변경·담당자 변경, 문서 승인·반려 이력입니다."
            />
          )}
          <div className="min-w-0 flex-1">
            <UnifiedListSearch
              action="/cases"
              defaultValue={queryFilter}
              placeholder="사건명, 참조번호, 사건번호 검색"
              ariaLabel="사건 목록 검색"
              hiddenFields={{ bucket }}
            />
          </div>
          <details className="relative shrink-0">
            <summary
              className="flex h-10 w-10 list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              aria-label="사건 목록 다운로드"
            >
              <Download className="size-4" />
            </summary>
            <div className="absolute right-0 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_38px_rgba(15,23,42,0.14)]">
              <ExportLinks resource="case-board" className="flex-col items-stretch" />
            </div>
          </details>
        </div>
      </div>

      {bucket === 'active' ? (
        <CasesBulkConnectPanel
          organizationId={currentOrganizationId}
          unlinkedClientCaseIds={activeCases.filter((c: { id: string }) => !caseClientLinkedMap[c.id]).map((c: { id: string }) => c.id)}
          unlinkedHubCaseIds={activeCases.filter((c: { id: string }) => !hubRegistrations[c.id]?.sharedHubId).map((c: { id: string }) => c.id)}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_200px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              <span>
                사건목록
                {currentOrgName ? (
                  <span className="ml-2 text-sm font-normal text-slate-500">— {currentOrgName}</span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-3 text-sm font-normal text-slate-500">
                <span>{BUCKET_META[bucket].helper}</span>
                <Link
                  href={'/cases/history' as Route}
                  className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-9 rounded-xl px-3 text-xs' })}
                >
                  사건 변경 이력 보기
                </Link>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isRestrictedScope && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">⚠️</span>
                <span>
                  현재 나에게 배정된 사건만 표시됩니다.
                  {' '}전체 사건을 보려면 관리자에게 권한 변경을 요청하세요.
                </span>
              </div>
            )}
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

        {/* 우측 작은 박스: 사건 분류 탐색 */}
        <div className="space-y-2">
          {(['active', 'completed', 'deleted'] as BucketKey[]).map((key) => {
            const count = key === 'active' ? activeCases.length : key === 'completed' ? completedCases.length : deletedCases.length;
            const isActive = key === bucket;
            const href = `/cases?bucket=${key}${queryFilter ? `&q=${encodeURIComponent(queryFilter)}` : ''}` as Route;
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                  isActive
                    ? 'border-sky-300 bg-sky-50 text-sky-900 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <span>{BUCKET_META[key].label}</span>
                <span className={`font-semibold tabular-nums ${isActive ? 'text-sky-900' : 'text-slate-900'}`}>{count}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
