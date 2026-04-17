'use client';

// audit-link-exempt: reason=대시보드 요약 위젯이라 개별 감사로그 버튼을 직접 두지 않음; fallback=각 메뉴의 상세 화면에서 기록 보기 버튼과 감사로그 링크를 제공함; expires=2026-06-30; approvedBy=codex

import { useMemo } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { DashboardAiOverview } from '@/lib/ai/dashboard-home';
import { ROUTES } from '@/lib/routes/registry';
import type {
  PlatformScenarioMode,
  DashboardSnapshot,
} from '@/components/dashboard-hub-types';
import { DashboardCommunicationPanel } from '@/components/dashboard-communication-panel';

export function DashboardHubClient({
  organizationId,
  currentUserId,
  scenarioMode,
  data,
  isPlatformAdmin = false,
  initialAiOverview
}: {
  organizationId: string | null;
  currentUserId: string;
  scenarioMode?: PlatformScenarioMode | null;
  data: DashboardSnapshot;
  isPlatformAdmin?: boolean;
  initialAiOverview: DashboardAiOverview;
}) {
  const immediateNotifications = useMemo(
    () => data.unreadNotificationItems.filter((item) => item.category === 'immediate'),
    [data.unreadNotificationItems]
  );

  const confirmNotifications = useMemo(
    () => data.unreadNotificationItems.filter((item) => item.category === 'confirm'),
    [data.unreadNotificationItems]
  );

  const meetingNotifications = useMemo(
    () => data.unreadNotificationItems.filter((item) => item.category === 'meeting'),
    [data.unreadNotificationItems]
  );

  return (
    <div className="space-y-6">
      {/* 알림-일정 연동 요약 스트립 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link
          href={`${ROUTES.NOTIFICATIONS}#immediate` as Route}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center transition hover:bg-rose-100"
          aria-label={`즉시필요 알림 ${immediateNotifications.length}건 보기`}
        >
          <p className="text-xs font-semibold text-rose-700">즉시필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-rose-800">{immediateNotifications.length}</p>
          <p className="mt-1 text-[10px] text-rose-600">업무일정 임박</p>
        </Link>
        <Link
          href={`${ROUTES.NOTIFICATIONS}#confirm` as Route}
          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center transition hover:bg-blue-100"
          aria-label={`검토필요 알림 ${confirmNotifications.length}건 보기`}
        >
          <p className="text-xs font-semibold text-blue-700">검토필요</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-blue-800">{confirmNotifications.length}</p>
          <p className="mt-1 text-[10px] text-blue-600">요청·협업 알림</p>
        </Link>
        <Link
          href={`${ROUTES.NOTIFICATIONS}#meeting` as Route}
          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-center transition hover:bg-violet-100"
          aria-label={`미팅알림 ${meetingNotifications.length}건 보기`}
        >
          <p className="text-xs font-semibold text-violet-700">미팅알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-violet-800">{meetingNotifications.length}</p>
          <p className="mt-1 text-[10px] text-violet-600">미팅 일정</p>
        </Link>
        <Link
          href={`${ROUTES.NOTIFICATIONS}#other` as Route}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center transition hover:bg-slate-100"
          aria-label={`기타알림 ${Math.max(0, data.unreadNotifications - immediateNotifications.length - confirmNotifications.length - meetingNotifications.length)}건 보기`}
        >
          <p className="text-xs font-semibold text-slate-700">기타알림</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">{Math.max(0, data.unreadNotifications - immediateNotifications.length - confirmNotifications.length - meetingNotifications.length)}</p>
          <p className="mt-1 text-[10px] text-slate-500">비용·기타</p>
        </Link>
      </div>

      <DashboardCommunicationPanel
        organizationId={organizationId}
        currentUserId={currentUserId}
        scenarioMode={scenarioMode}
        data={data}
        isPlatformAdmin={isPlatformAdmin}
        initialAiOverview={initialAiOverview}
      />
    </div>
  );
}
