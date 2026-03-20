'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { ChevronLeft, Globe, Network, Shield, Users, Zap } from 'lucide-react';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { ActivityFeedPanel } from '@/components/activity-feed-panel';
import { HubMetricBadge } from '@/components/hub-metric-badge';
import { HubReadinessRing } from '@/components/hub-readiness-ring';
import { ParticipantSlotRing } from '@/components/participant-slot-ring';
import { PremiumInfoPanel } from '@/components/premium-info-panel';
import { PremiumPageHeader } from '@/components/premium-page-header';
import { activateCaseHubAction, archiveCaseHubAction } from '@/lib/actions/case-hub-actions';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';
import type { CaseHubDetail, CaseHubStatus } from '@/lib/queries/case-hubs';

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

interface Props {
  hub: CaseHubDetail;
  organizationId: string;
  currentProfileId: string;
}

export function CaseHubLobbyClient({ hub, organizationId, currentProfileId }: Props) {
  const canActivate = ['setup_required', 'ready', 'draft'].includes(hub.status);
  const currentMember = hub.members.find((member) => member.profileId === currentProfileId) ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={'/case-hubs' as Route}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          허브 목록
        </Link>
        <DangerActionButton
          action={archiveCaseHubAction}
          fields={{ hubId: hub.id, organizationId }}
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
      </div>

      <PremiumPageHeader
        eyebrow="플래그십 로비"
        title={hub.caseTitle ?? hub.title ?? '사건허브'}
        description="사건허브는 사건 관련 업무의 기준축입니다. 협업 좌석, 열람 범위, 미읽음, 최근 활동을 이 로비를 기준으로 연결합니다."
        metrics={[
          { label: '준비도', value: `${hub.readinessPercent}%`, helper: '대표 의뢰인, 공개 범위, 참여 구성이 준비될수록 올라갑니다.' },
          { label: '미읽음', value: hub.unreadCount, helper: '최근 활동 중 아직 확인하지 않은 항목' },
          { label: '최근 활동', value: formatHubRelativeActivity(hub.lastActivityAt), helper: '가장 마지막 갱신 시점' }
        ]}
        actions={(
          <>
            <HubMetricBadge label="협업" value={`${hub.collaboratorCount}/${hub.collaboratorLimit}`} tone="blue" />
            <HubMetricBadge label="열람" value={`${hub.viewerCount}/${hub.viewerLimit}`} tone="violet" />
            <HubMetricBadge label="미읽음" value={`${hub.unreadCount}`} tone="amber" />
          </>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <PremiumInfoPanel title="허브 지침" description="허브 입장 전에 현재 공개 범위와 내 좌석 상태를 확인합니다.">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Shield className="size-4 text-sky-600" aria-hidden="true" />
                  현재 내 상태
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {currentMember
                    ? `${currentMember.seatKind === 'collaborator' ? '협업 좌석' : '열람 좌석'} · ${currentMember.membershipRole}`
                    : '아직 허브 좌석이 배정되지 않았습니다.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Globe className="size-4 text-sky-600" aria-hidden="true" />
                  공개 범위
                </div>
                <p className="mt-2 text-sm text-slate-600">{visibilityLabel(hub.visibilityScope)}</p>
              </div>
              <HubReadinessRing percent={hub.readinessPercent} label="허브 준비도" size="lg" />
            </div>
          </PremiumInfoPanel>

          <PremiumInfoPanel title="참여자" description="허브에 이미 들어온 사람과 준비 완료 상태를 빠르게 확인합니다.">
            {hub.members.length ? (
              <div className="space-y-2">
                {hub.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.profileName ?? '이름 없음'}</p>
                      <p className="text-xs text-slate-500">{member.seatKind === 'collaborator' ? '협업' : '열람'} · {member.membershipRole}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{member.isReady ? '준비 완료' : '대기 중'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
                <p className="text-sm font-medium text-slate-700">아직 참여자가 없습니다.</p>
                <p className="mt-1 text-sm text-slate-500">사건목록이나 허브 설정에서 참여자를 초대해 주세요.</p>
              </div>
            )}
          </PremiumInfoPanel>
        </aside>

        <main className="space-y-6">
          <PremiumInfoPanel title="허브 중앙 로비" description="사건허브의 준비도, 슬롯 점유, 실행 액션을 중앙에서 집중 관리합니다.">
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="flex justify-center">
                <HubReadinessRing percent={hub.readinessPercent} label="준비도" size="lg" />
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#eff6ff)] p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
                      <Network className="size-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{hub.title ?? hub.caseTitle ?? '사건허브 로비'}</p>
                      <p className="text-sm text-slate-500">{hub.caseReferenceNo ?? '참조번호 미지정'} · {visibilityLabel(hub.visibilityScope)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <HubMetricBadge label="협업" value={`${hub.collaboratorCount}/${hub.collaboratorLimit}`} tone="blue" />
                    <HubMetricBadge label="열람" value={`${hub.viewerCount}/${hub.viewerLimit}`} tone="violet" />
                    <HubMetricBadge label="미읽음" value={`${hub.unreadCount}`} tone="amber" />
                    <HubMetricBadge label="최근 활동" value={formatHubRelativeActivity(hub.lastActivityAt)} tone="slate" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ParticipantSlotRing occupied={hub.collaboratorCount} limit={hub.collaboratorLimit} label="협업 슬롯" />
                  <ParticipantSlotRing occupied={hub.viewerCount} limit={hub.viewerLimit} label="열람 슬롯" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {canActivate ? (
                    <ClientActionForm
                      action={activateCaseHubAction}
                      successTitle="협업이 시작되었습니다."
                      successMessage="허브가 활성 상태로 전환되었습니다."
                      errorTitle="협업 시작에 실패했습니다."
                      errorCause="허브 준비 조건을 아직 만족하지 못했거나 서버 응답이 실패했습니다."
                      errorResolution="대표 의뢰인, 공개 범위, 참여 구성을 확인한 뒤 다시 시도해 주세요."
                    >
                      <input type="hidden" name="hubId" value={hub.id} />
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <SubmitButton className="h-11 bg-slate-950 px-5 text-sm font-semibold text-white" pendingLabel="시작 중...">
                        <Zap className="mr-2 size-4" aria-hidden="true" />
                        협업 시작
                      </SubmitButton>
                    </ClientActionForm>
                  ) : null}
                  <Link href={'/cases' as Route} className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">
                    사건목록으로 이동
                  </Link>
                </div>
              </div>
            </div>
          </PremiumInfoPanel>
        </main>

        <aside className="space-y-4">
          <ActivityFeedPanel
            items={hub.recentActivity.map((item) => ({
              id: item.id,
              title: actionLabel(item.action),
              actor: item.actorName,
              createdAt: item.createdAt
            }))}
          />

          <PremiumInfoPanel title="허브 정보" description="허브 상태를 다른 메뉴에서 다시 쓸 수 있는 핵심 값만 요약합니다.">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">대표 의뢰인</dt>
                <dd className="font-medium text-slate-900">{hub.primaryClientName ?? '미지정'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">준비된 참여자</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{hub.readyMemberCount}명</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">허브 상태</dt>
                <dd className="font-medium text-slate-900">{STATUS_LABEL[hub.status]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">최근 읽음 기준</dt>
                <dd className="font-medium text-slate-900">{currentMember?.lastReadAt ? formatHubRelativeActivity(currentMember.lastReadAt) : '기록 없음'}</dd>
              </div>
            </dl>
          </PremiumInfoPanel>
        </aside>
      </div>
    </div>
  );
}
