'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { ChevronLeft, Globe, Shield, Zap } from 'lucide-react';
import { ROUTES } from '@/lib/routes/registry';
import { buttonStyles } from '@/components/ui/button';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { Badge } from '@/components/ui/badge';
import { ActivityFeedPanel } from '@/components/activity-feed-panel';
import { PremiumInfoPanel } from '@/components/premium-info-panel';
import { PremiumPageHeader } from '@/components/premium-page-header';
import { CaseHubDocumentTimeline } from '@/components/case-hub-document-timeline';
import { activateCaseHubAction, archiveCaseHubAction } from '@/lib/actions/case-hub-actions';
import { formatHubRelativeActivity, getHubReadinessStateLabel } from '@/lib/case-hub-metrics';
import type { CaseHubDetail, CaseHubStatus } from '@/lib/queries/case-hubs';
import type { CaseHubBilling, CaseHubDocuments } from '@/lib/queries/case-hub-projection';

const STATUS_LABEL: Record<CaseHubStatus, string> = {
  draft: '준비 중',
  setup_required: '참여자 모집 중',
  ready: '준비 완료',
  active: '협업 중',
  review_pending: '검토 대기',
  archived: '보관됨'
};

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    hub_created: '허브가 생성되었습니다',
    hub_updated: '허브 설정이 갱신되었습니다',
    hub_activated: '협업이 시작되었습니다',
    hub_archived: '허브가 보관되었습니다',
    member_invited: '참여자가 초대되었습니다',
    seat_changed: '좌석이 조정되었습니다'
  };
  return map[action] ?? action;
}

function visibilityLabel(scope: string | null) {
  if (scope === 'organization') return '조직 전체';
  if (scope === 'private') return '초대 전용';
  if (scope === 'custom') return '사용자 지정';
  return '미설정';
}

function clientLinkTone(status: CaseHubDetail['primaryClientLinkStatus']) {
  if (status === 'pending_unlink') return 'amber';
  if (status === 'orphan_review') return 'red';
  if (status === 'unlinked') return 'slate';
  return 'green';
}

function clientLinkLabel(status: CaseHubDetail['primaryClientLinkStatus']) {
  if (status === 'pending_unlink') return '연결 해제 대기';
  if (status === 'orphan_review') return '복구 검토 중';
  if (status === 'unlinked') return '연결 해제';
  if (status === 'linked') return '연결 완료';
  return '상태 미지정';
}

interface Props {
  hub: CaseHubDetail;
  organizationId: string | null;
  currentProfileId: string;
  documents: CaseHubDocuments | null;
  billing: CaseHubBilling | null;
}

export function CaseHubLobbyClient({ hub, organizationId, currentProfileId, documents, billing }: Props) {
  const canActivate = ['setup_required', 'ready', 'draft'].includes(hub.status);
  const canManageHub = Boolean(organizationId);
  const currentMember = hub.members.find((member) => member.profileId === currentProfileId) ?? null;
  const readinessState = getHubReadinessStateLabel(hub.readinessPercent);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={'/case-hubs' as Route}
          className={buttonStyles({ variant: 'secondary', className: 'min-h-10 rounded-xl px-4 text-sm' })}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          허브 목록
        </Link>
        {canManageHub ? (
          <DangerActionButton
            action={archiveCaseHubAction}
            fields={{ hubId: hub.id, organizationId: organizationId ?? '' }}
            confirmTitle="허브를 보관할까요?"
            confirmDescription="허브를 보관하면 기본 목록에서 숨겨집니다. 복원은 관리자 작업이 필요합니다."
            highlightedInfo={hub.caseTitle ?? hub.title ?? '이 허브'}
            confirmLabel="보관"
            variant="warning"
            successTitle="허브가 보관되었습니다."
            errorTitle="허브 보관에 실패했습니다."
            errorCause="허브 보관 요청을 처리하는 중 오류가 발생했습니다."
            errorResolution="잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
            buttonVariant="secondary"
          >
            허브 보관
          </DangerActionButton>
        ) : null}
      </div>

      {/* 헤더 — 수치의 단일 원본. 중앙 카드·좌측 패널에서 중복 노출하지 않는다. */}
      <PremiumPageHeader
        eyebrow={STATUS_LABEL[hub.status]}
        title={hub.caseTitle ?? hub.title ?? '사건허브'}
        description={`${hub.caseReferenceNo ?? ''} · ${visibilityLabel(hub.visibilityScope)}`}
        metrics={[
          { label: '준비도', value: `${hub.readinessPercent}%`, helper: `${readinessState} 상태` },
          { label: '협업', value: `${hub.collaboratorCount}/${hub.collaboratorLimit}`, helper: '현재 협업 좌석 점유' },
          { label: '열람', value: `${hub.viewerCount}/${hub.viewerLimit}`, helper: '현재 열람 좌석 점유' },
          { label: '미읽음', value: hub.unreadCount, helper: '최근 활동 중 아직 확인하지 않은 항목' },
          { label: '최근 활동', value: formatHubRelativeActivity(hub.lastActivityAt), helper: '가장 마지막 갱신 시점' }
        ]}
      />

      {/* 3:6:3 본문 */}
      <div className="grid gap-6 lg:grid-cols-[3fr_6fr_3fr]">

        {/* ── 좌측: 내 상태 + 참여자 (병합) ── */}
        <aside className="space-y-4">
          <PremiumInfoPanel title="내 상태" description="현재 내 좌석, 공개 범위, 참여자를 한 눈에 봅니다.">
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm">
                <Shield className="size-4 shrink-0 text-sky-600" aria-hidden="true" />
                <span className="text-slate-700">
                  {currentMember
                    ? `${currentMember.seatKind === 'collaborator' ? '협업' : '열람'} · ${currentMember.membershipRole}`
                    : '좌석 미배정'}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm">
                <Globe className="size-4 shrink-0 text-sky-600" aria-hidden="true" />
                <span className="text-slate-700">{visibilityLabel(hub.visibilityScope)}</span>
              </div>
            </div>

            {/* 참여자 인라인 */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">참여자</p>
              {hub.members.length ? (
                <div className="space-y-2">
                  {hub.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.profileName ?? '이름 없음'}</p>
                        <p className="text-xs text-slate-500">{member.seatKind === 'collaborator' ? '협업' : '열람'} · {member.membershipRole}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500">{member.isReady ? '준비 완료' : '대기 중'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">아직 참여자가 없습니다.</p>
              )}
            </div>
          </PremiumInfoPanel>
        </aside>

        {/* ── 중앙: CTA 최상단 → 문서 타임라인 ── */}
        <main className="space-y-6">
          {/* 액션 버튼 그룹 — 중앙 최상단, 가장 먼저 보임 */}
          <div className="space-y-3">
            {canActivate && canManageHub ? (
              <ClientActionForm
                action={activateCaseHubAction}
                successTitle="협업이 시작되었습니다."
                successMessage="허브가 활성 상태로 전환되었습니다."
                errorTitle="협업 시작에 실패했습니다."
                errorCause="허브 준비 조건을 아직 만족하지 못했거나 서버 응답이 실패했습니다."
                errorResolution="대표 의뢰인, 공개 범위, 참여 구성을 확인한 뒤 다시 시도해 주세요."
              >
                <input type="hidden" name="hubId" value={hub.id} />
                <input type="hidden" name="organizationId" value={organizationId ?? ''} />
                <SubmitButton className="w-full h-12 bg-slate-950 text-sm font-semibold text-white rounded-xl" pendingLabel="시작 중...">
                  <Zap className="mr-2 size-4" aria-hidden="true" />
                  협업 시작
                </SubmitButton>
              </ClientActionForm>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Link href={`${ROUTES.CASES}/${hub.caseId}` as Route} className={buttonStyles({ variant: 'secondary', className: 'justify-center rounded-xl px-3 py-2.5 text-xs font-semibold' })}>
                사건 상세
              </Link>
              <Link href={`${ROUTES.CASES}/${hub.caseId}?tab=billing` as Route} className={buttonStyles({ variant: 'secondary', className: 'justify-center rounded-xl px-3 py-2.5 text-xs font-semibold' })}>
                비용 탭
              </Link>
              <Link href={`${ROUTES.CONTRACTS}?caseId=${hub.caseId}` as Route} className={buttonStyles({ variant: 'secondary', className: 'justify-center rounded-xl px-3 py-2.5 text-xs font-semibold' })}>
                계약 관리
              </Link>
              <Link href={`${ROUTES.CASES}/${hub.caseId}?tab=schedule` as Route} className={buttonStyles({ variant: 'secondary', className: 'justify-center rounded-xl px-3 py-2.5 text-xs font-semibold' })}>
                일정
              </Link>
              <Link href={`${ROUTES.CASES}/${hub.caseId}?tab=documents` as Route} className={buttonStyles({ variant: 'secondary', className: 'justify-center rounded-xl px-3 py-2.5 text-xs font-semibold' })}>
                문서
              </Link>
            </div>
          </div>

          {/* 문서 타임라인 — CTA 바로 아래, 스크롤 없이 보임 */}
          {documents ? (
            <PremiumInfoPanel
              title="문서 타임라인"
              description="이 사건의 생성 문서와 계약서를 한 타임라인으로 모아 최근 순으로 보여줍니다."
            >
              <CaseHubDocumentTimeline
                documents={documents}
                emptyDescription="문서를 생성하거나 계약서를 작성하면 여기에 등록됩니다."
                maxItems={10}
              />
            </PremiumInfoPanel>
          ) : null}
        </main>

        {/* ── 우측: 활동 + 허브 정보 + 비용 ── */}
        <aside className="space-y-4">
          <ActivityFeedPanel
            items={hub.recentActivity.map((item) => ({
              id: item.id,
              title: actionLabel(item.action),
              actor: item.actorName,
              createdAt: item.createdAt
            }))}
          />

          <PremiumInfoPanel title="허브 정보" description="이 허브의 핵심 값을 요약합니다.">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">대표 의뢰인</dt>
                <dd className="flex items-center gap-2 font-medium text-slate-900">
                  <span>{hub.primaryClientName ?? '미지정'}</span>
                  {hub.primaryClientLinkStatus ? (
                    <Badge tone={clientLinkTone(hub.primaryClientLinkStatus)}>
                      {clientLinkLabel(hub.primaryClientLinkStatus)}
                    </Badge>
                  ) : null}
                </dd>
              </div>
              {hub.primaryClientOrphanReason ? (
                <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 px-3 py-3">
                  <dt className="text-slate-500">복구 사유</dt>
                  <dd className="font-medium text-red-800">{hub.primaryClientOrphanReason}</dd>
                  {hub.primaryClientReviewDeadline ? (
                    <dd className="text-xs text-red-700">검토 기한 {hub.primaryClientReviewDeadline}</dd>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">준비된 참여자</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{hub.readyMemberCount}명</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">최근 읽음</dt>
                <dd className="font-medium text-slate-900">{currentMember?.lastReadAt ? formatHubRelativeActivity(currentMember.lastReadAt) : '기록 없음'}</dd>
              </div>
            </dl>
          </PremiumInfoPanel>

          {billing ? (
            <PremiumInfoPanel title="비용 현황" description="이 사건의 청구·수금·미수금을 한 번에 봅니다.">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">총 청구</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">{billing.totalInvoiced.toLocaleString('ko-KR')}원</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">수금 완료</dt>
                  <dd className="font-medium text-emerald-700 tabular-nums">{billing.totalPaid.toLocaleString('ko-KR')}원</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">미수금</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">{billing.totalPending.toLocaleString('ko-KR')}원</dd>
                </div>
                {billing.overdueCount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-rose-600">연체</dt>
                    <dd className="font-semibold text-rose-600 tabular-nums">{billing.overdueCount}건</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">활성 약정</dt>
                  <dd className="font-medium text-slate-900 tabular-nums">{billing.activeAgreements}건</dd>
                </div>
              </dl>
              <Link
                href={`${ROUTES.CASES}/${hub.caseId}?tab=billing` as Route}
                className="mt-3 block text-center text-xs font-semibold text-sky-700 hover:text-sky-900"
              >
                비용 탭 열기 →
              </Link>
            </PremiumInfoPanel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
