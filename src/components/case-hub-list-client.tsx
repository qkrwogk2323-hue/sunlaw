import type { Route } from 'next';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { HubMetricBadge } from '@/components/hub-metric-badge';
import { HubReadinessRing } from '@/components/hub-readiness-ring';
import { PremiumCaseCard } from '@/components/premium-case-card';
import { PremiumInfoPanel } from '@/components/premium-info-panel';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';
import type { CaseHubSummary, CaseHubStatus } from '@/lib/queries/case-hubs';
import { ROUTES } from '@/lib/routes/registry';

const STATUS_LABEL: Record<CaseHubStatus, string> = {
  draft: '준비 중',
  setup_required: '참여자 모집 중',
  ready: '준비 완료',
  active: '협업 중',
  review_pending: '검토 대기',
  archived: '보관됨'
};

function HubCard({ hub }: { hub: CaseHubSummary }) {
  return (
    <PremiumCaseCard
      href={`${ROUTES.CASE_HUBS}/${hub.id}` as Route}
      title={hub.title ?? hub.caseTitle ?? '사건 미지정'}
      subtitle={[
        hub.caseReferenceNo ?? null,
        hub.primaryClientName ? `대표 의뢰인 ${hub.primaryClientName}` : null,
        STATUS_LABEL[hub.status]
      ].filter(Boolean).join(' · ')}
      badges={
        <>
          <HubMetricBadge label="협업" value={`${hub.collaboratorCount}/${hub.collaboratorLimit}`} tone="blue" />
          <HubMetricBadge label="열람" value={`${hub.viewerCount}/${hub.viewerLimit}`} tone="violet" />
          <HubMetricBadge label="미읽음" value={`${hub.unreadCount}`} tone="amber" />
          <HubMetricBadge label="최근 활동" value={formatHubRelativeActivity(hub.lastActivityAt)} tone="slate" />
        </>
      }
      meta="허브 입장"
      actionLabel="로비 열기"
    >
      {/* PIN 배지·관리 링크 제거 (2026-04-17). 접근 제어는 Auth+멤버십+RLS로 충분. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">사건 식별</p>
          <p className="text-sm text-slate-600">{hub.caseReferenceNo ?? '참조번호 미지정'}</p>
          <p className="text-sm text-slate-600">{hub.primaryClientName ? `대표 의뢰인 ${hub.primaryClientName}` : '대표 의뢰인 미지정'}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <HubReadinessRing percent={hub.readinessPercent} size="sm" />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">허브 상태</p>
            <p className="text-sm text-slate-600">
              공개 범위 {hub.visibilityScope === 'organization' ? '조직 전체' : hub.visibilityScope === 'private' ? '초대 전용' : hub.visibilityScope === 'custom' ? '사용자 지정' : '미설정'}
            </p>
            <p className="text-sm text-slate-600">
              준비된 참여자 {hub.readyMemberCount}명 · 허브 상태 {STATUS_LABEL[hub.status]}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">최근 활동</p>
          <p className="text-sm text-slate-600">{formatHubRelativeActivity(hub.lastActivityAt)}</p>
          <p className="text-sm text-slate-600">활성 액션은 로비 입장과 허브 관리 2개 이내로 유지합니다.</p>
        </div>
      </div>
    </PremiumCaseCard>
  );
}

interface Props {
  hubs: CaseHubSummary[];
  query?: string;
}

export function CaseHubListClient({ hubs, query = '' }: Props) {
  const filtered = hubs.filter((hub) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (hub.caseTitle ?? '').toLowerCase().includes(q) ||
      (hub.primaryClientName ?? '').toLowerCase().includes(q) ||
      (hub.caseReferenceNo ?? '').toLowerCase().includes(q) ||
      (hub.title ?? '').toLowerCase().includes(q)
    );
  });

  if (!hubs.length) {
    return (
      <PremiumInfoPanel title="허브 로비" description="사건을 허브와 연결하면 협업 준비도, 미읽음, 최근 활동을 한곳에서 추적합니다.">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-8 py-16 text-center">
          <Network className="mx-auto size-12 text-slate-300" aria-hidden="true" />
          <p className="mt-4 text-base font-semibold text-slate-700">아직 사건허브가 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">사건목록에서 허브 연동을 시작하면 협업 로비가 생성됩니다.</p>
          <Link
            href={ROUTES.CASES}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 text-sm font-semibold text-sky-800"
          >
            사건목록으로 이동
          </Link>
        </div>
      </PremiumInfoPanel>
    );
  }

  return (
    <div className="space-y-5">
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">조건에 맞는 사건허브가 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">사건명이나 의뢰인 이름을 다시 확인하거나 검색어를 줄여 보세요.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {filtered.map((hub) => (
            <HubCard key={hub.id} hub={hub} />
          ))}
        </div>
      )}
    </div>
  );
}
