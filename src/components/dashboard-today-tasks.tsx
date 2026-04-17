/**
 * 대시보드 "오늘 할 일" 위젯 — cross-case 시간 축 (일정·마감·청구).
 *
 * 원래 디자인 목업(1df65a6 후속):
 *   ┌─ 오늘 할 일 ─
 *   │  • 14시 조병수 재판 출석
 *   │  • 내일까지 이정훈 채권자목록 제출
 *   └──────────────
 *
 * urgentSchedules(일정·마감)와 upcomingBilling(미수 청구)을 시간순으로 합쳐
 * 사건 허브 drill-down 링크와 함께 보여준다.
 *
 * 서버 안전 컴포넌트 (hooks 없음).
 */
import type { Route } from 'next';
import Link from 'next/link';
import { CalendarClock, Receipt, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/routes/registry';

type ScheduleItem = {
  id: string;
  title: string | null;
  schedule_kind: string | null;
  scheduled_start: string | null;
  case_id: string | null;
  cases?: { title: string | null } | { title: string | null }[] | null;
};

type BillingItem = {
  id: string;
  title: string | null;
  amount: number | null;
  status: string | null;
  due_on: string | null;
  case_id: string | null;
  cases?: { title: string | null } | { title: string | null }[] | null;
};

type MergedItem = {
  id: string;
  source: 'schedule' | 'billing';
  title: string;
  caseTitle: string;
  caseId: string | null;
  sortKey: number;
  timeLabel: string;
};

function caseTitle(
  cases?: { title: string | null } | { title: string | null }[] | null
): string {
  if (!cases) return '';
  if (Array.isArray(cases)) return cases[0]?.title ?? '';
  return cases.title ?? '';
}

function formatTimeLabel(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `내일 ${time}`;
  if (diffDays === -1) return `어제`;
  if (diffDays > 1 && diffDays <= 7) return `${diffDays}일 후`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatDueLabel(dateStr: string | null): string {
  if (!dateStr) return '기한 미정';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)}일 경과`;
  if (diffDays === 0) return '오늘까지';
  if (diffDays === 1) return '내일까지';
  return `${diffDays}일 남음`;
}

const SCHEDULE_KIND_LABEL: Record<string, string> = {
  hearing: '재판',
  deadline: '마감',
  meeting: '미팅',
  reminder: '알림',
  collection_visit: '방문',
  other: '일정',
};

interface DashboardTodayTasksProps {
  schedules: ScheduleItem[];
  billing: BillingItem[];
  maxItems?: number;
}

export function DashboardTodayTasks({
  schedules,
  billing,
  maxItems = 6,
}: DashboardTodayTasksProps) {
  const scheduleItems: MergedItem[] = schedules.map((s) => ({
    id: `schedule-${s.id}`,
    source: 'schedule',
    title: s.title ?? SCHEDULE_KIND_LABEL[s.schedule_kind ?? ''] ?? '일정',
    caseTitle: caseTitle(s.cases),
    caseId: s.case_id,
    sortKey: s.scheduled_start ? new Date(s.scheduled_start).getTime() : Infinity,
    timeLabel: formatTimeLabel(s.scheduled_start),
  }));
  const billingItems: MergedItem[] = billing.map((b) => ({
    id: `billing-${b.id}`,
    source: 'billing',
    title: b.title ?? '청구 확인',
    caseTitle: caseTitle(b.cases),
    caseId: b.case_id,
    sortKey: b.due_on ? new Date(`${b.due_on}T00:00:00`).getTime() : Infinity,
    timeLabel: formatDueLabel(b.due_on),
  }));
  const merged = [...scheduleItems, ...billingItems]
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, maxItems);

  if (!merged.length) return null;

  return (
    <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">오늘 할 일</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 px-0">
        {merged.map((item) => {
          const href = (item.caseId
            ? `${ROUTES.CASES}/${item.caseId}${item.source === 'billing' ? '?tab=billing' : '?tab=schedule'}`
            : ROUTES.CASES) as Route;
          const Icon = item.source === 'billing' ? Receipt : CalendarClock;
          return (
            <Link
              key={item.id}
              href={href}
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/60"
              aria-label={`${item.caseTitle} ${item.title}`}
            >
              <Icon
                className={item.source === 'billing' ? 'size-4 shrink-0 text-amber-600' : 'size-4 shrink-0 text-sky-600'}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">{item.title}</span>
                  <Badge tone={item.source === 'billing' ? 'amber' : 'blue'}>
                    {item.source === 'billing' ? '청구' : '일정'}
                  </Badge>
                </div>
                {item.caseTitle ? (
                  <p className="truncate text-xs text-slate-500">{item.caseTitle}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-500 tabular-nums">
                {item.timeLabel}
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
