import type { Route } from 'next';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { HubMetricBadge } from '@/components/hub-metric-badge';
import type { CaseHubSummary } from '@/lib/queries/case-hubs';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';

export function HubContextStrip({
  hubs,
  currentLabel
}: {
  hubs: CaseHubSummary[];
  currentLabel: string;
}) {
  const primary = hubs[0] ?? null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(248,250,252,0.95))] p-4 shadow-[0_10px_24px_rgba(14,165,233,0.08)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Network className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">최근 허브</p>
              <p className="text-sm text-slate-700">{currentLabel} 화면에서도 최근 사용한 허브를 바로 다시 열 수 있습니다.</p>
            </div>
          </div>
          {primary ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{primary.title ?? primary.caseTitle ?? '사건허브'}</span>
              <HubMetricBadge label="협업" value={`${primary.collaboratorCount}/${primary.collaboratorLimit}`} tone="blue" />
              <HubMetricBadge label="열람" value={`${primary.viewerCount}/${primary.viewerLimit}`} tone="violet" />
              <HubMetricBadge label="미읽음" value={`${primary.unreadCount}`} tone="amber" />
              <HubMetricBadge label="최근 활동" value={formatHubRelativeActivity(primary.lastActivityAt)} tone="slate" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <HubMetricBadge label="허브" value="0" tone="slate" />
              <span className="text-sm text-slate-500">활성 허브가 아직 없습니다.</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primary ? (
            <Link
              href={`/case-hubs/${primary.id}` as Route}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
            >
              허브 입장
            </Link>
          ) : null}
          <Link
            href={'/case-hubs' as Route}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-white px-5 text-sm font-semibold text-sky-800"
          >
            허브 목록
          </Link>
        </div>
      </div>
    </section>
  );
}
