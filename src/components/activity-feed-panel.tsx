import { Activity } from 'lucide-react';
import { PremiumInfoPanel } from '@/components/premium-info-panel';
import { formatHubRelativeActivity } from '@/lib/case-hub-metrics';

export function ActivityFeedPanel({
  items
}: {
  items: Array<{ id: string; title: string; actor: string | null; createdAt: string }>;
}) {
  return (
    <PremiumInfoPanel title="최근 활동" description="허브에서 막 일어난 변경을 우선순위대로 확인합니다.">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Activity className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.actor ?? '시스템'} · {formatHubRelativeActivity(item.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
          <p className="text-sm font-medium text-slate-700">아직 최근 활동이 없습니다.</p>
          <p className="mt-1 text-sm text-slate-500">참여자 초대나 허브 설정 변경이 생기면 여기에 쌓입니다.</p>
        </div>
      )}
    </PremiumInfoPanel>
  );
}
