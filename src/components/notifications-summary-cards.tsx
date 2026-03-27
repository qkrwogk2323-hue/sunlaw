'use client';

import { executeInteractionByKey } from '@/lib/interactions/execute-interaction-by-key';
import { NOTIFICATION_INTERACTION_KEYS } from '@/lib/interactions/registry';

type Props = {
  immediateCount: number;
  confirmCount: number;
  meetingCount: number;
  otherCount: number;
};

function execute(key: typeof NOTIFICATION_INTERACTION_KEYS[keyof typeof NOTIFICATION_INTERACTION_KEYS]) {
  void executeInteractionByKey(key, {
    navigate: (href) => window.location.assign(href)
  });
}

export function NotificationsSummaryCards({
  immediateCount,
  confirmCount,
  meetingCount,
  otherCount
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <button
        type="button"
        onClick={() => execute(NOTIFICATION_INTERACTION_KEYS.SUMMARY_IMMEDIATE)}
        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center transition hover:bg-rose-100"
        aria-label={`즉시필요 알림 ${immediateCount}건`}
      >
        <p className="text-xs font-semibold text-rose-700">즉시필요</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-rose-800">{immediateCount}</p>
        <p className="mt-1 text-[10px] text-rose-600">업무일정 임박</p>
      </button>
      <button
        type="button"
        onClick={() => execute(NOTIFICATION_INTERACTION_KEYS.SUMMARY_CONFIRM)}
        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center transition hover:bg-blue-100"
        aria-label={`검토필요 알림 ${confirmCount}건`}
      >
        <p className="text-xs font-semibold text-blue-700">검토필요</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-blue-800">{confirmCount}</p>
        <p className="mt-1 text-[10px] text-blue-600">요청·협업 알림</p>
      </button>
      <button
        type="button"
        onClick={() => execute(NOTIFICATION_INTERACTION_KEYS.SUMMARY_MEETING)}
        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center transition hover:bg-violet-100"
        aria-label={`미팅알림 ${meetingCount}건`}
      >
        <p className="text-xs font-semibold text-violet-700">미팅알림</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-violet-800">{meetingCount}</p>
        <p className="mt-1 text-[10px] text-violet-600">미팅 일정</p>
      </button>
      <button
        type="button"
        onClick={() => execute(NOTIFICATION_INTERACTION_KEYS.SUMMARY_OTHER)}
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center transition hover:bg-slate-100"
        aria-label={`기타알림 ${otherCount}건`}
      >
        <p className="text-xs font-semibold text-slate-700">기타알림</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{otherCount}</p>
        <p className="mt-1 text-[10px] text-slate-500">비용·기타</p>
      </button>
    </div>
  );
}
