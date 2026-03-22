'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, CalendarCheck2, CalendarDays, CalendarRange, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Plus, ScrollText, Sparkles, ThumbsDown } from 'lucide-react';
import { addScheduleAction, updateScheduleAction, updateScheduleCompletionAction } from '@/lib/actions/case-actions';
import type { ScheduleBriefing } from '@/lib/ai/schedule-briefing';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { billingStatusLabel, labelFrom } from '@/lib/status-labels';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';

type ScheduleItem = {
  id: string;
  title: string;
  schedule_kind: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  location?: string | null;
  notes?: string | null;
  is_important?: boolean | null;
  client_visibility?: string | null;
  case_id?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

type RequestItem = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  request_kind?: string | null;
  due_at?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
  assigned?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
  creator?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

type BillingItem = {
  id: string;
  title: string;
  amount: number;
  status: string;
  due_on?: string | null;
  notes?: string | null;
  case_id?: string | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

function relatedTitle(value?: { title?: string | null } | Array<{ title?: string | null }> | null) {
  if (Array.isArray(value)) return value[0]?.title ?? null;
  return value?.title ?? null;
}

type CaseOption = {
  id: string;
  title: string;
};

type Snapshot = {
  focusMonth: string;
  schedules: ScheduleItem[];
  requests: RequestItem[];
  billingEntries: BillingItem[];
  workLogs: WorkLogItem[];
};

type WorkLogItem = {
  id: string;
  case_id?: string | null;
  case_schedule_id?: string | null;
  actor_name?: string | null;
  action_type: 'completed' | 'reopened';
  summary: string;
  schedule_title: string;
  schedule_scheduled_start?: string | null;
  created_at: string;
};

type UnifiedEntry = {
  id: string;
  source: 'schedule' | 'request' | 'billing';
  title: string;
  when: string;
  caseId: string | null;
  caseTitle: string;
  detail: string;
  badge: string;
  tone: 'blue' | 'amber' | 'green' | 'slate';
  isImportant: boolean;
  isNew: boolean;
  ownerScope: 'personal' | 'organization';
  completedAt?: string | null;
  completedByName?: string | null;
  raw?: ScheduleItem;
};

type CalendarCell = {
  key: string;
  date: Date;
  inMonth: boolean;
};

const scheduleKindLabels: Record<string, string> = {
  hearing: '기일',
  deadline: '마감',
  meeting: '회의',
  reminder: '리마인더',
  collection_visit: '방문회수',
  other: '기타'
};

const requestStatusLabels: Record<string, string> = {
  open: '진행 중',
  in_progress: '처리 중',
  resolved: '해결됨',
  closed: '종료됨'
};

function calendarDotClass(ownerScope: UnifiedEntry['ownerScope']) {
  if (ownerScope === 'personal') {
    return 'bg-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_1px_4px_rgba(5,150,105,0.28)]';
  }

  return 'bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.16),0_1px_4px_rgba(225,29,72,0.28)]';
}

function toDateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toDateTimeInputFromDateKey(dateKey: string) {
  const date = new Date(`${dateKey}T09:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function monthShift(month: string, delta: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function toLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarCells(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const focusDate = new Date(year, monthIndex - 1, 1);
  const gridStart = new Date(focusDate);
  const weekday = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(1 - weekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      key: toLocalDateKey(date),
      date,
      inMonth: date.getMonth() === focusDate.getMonth()
    } satisfies CalendarCell;
  });
}

function isWithinRange(value: string, start: Date, end: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function isSameYear(value: string, year: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === year;
}

function completionLabel(entry: UnifiedEntry) {
  if (!entry.completedAt) return null;
  return `${entry.completedByName ?? '담당자'} · ${formatDateTime(entry.completedAt)}`;
}

function ScheduleCompletionCheckbox({
  entry
}: {
  entry: UnifiedEntry;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(Boolean(entry.completedAt));

  if (entry.source !== 'schedule' || !entry.raw) return null;

  return (
    <form ref={formRef} action={updateScheduleCompletionAction.bind(null, entry.id)} className="inline-flex items-center gap-2">
      <input ref={hiddenRef} type="hidden" name="completed" value={checked ? 'true' : 'false'} />
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          if (hiddenRef.current) {
            hiddenRef.current.value = next ? 'true' : 'false';
          }
          formRef.current?.requestSubmit();
        }}
        className="size-4 rounded border-slate-300"
        aria-label={checked ? '완료 해제' : '완료 체크'}
      />
      <span className="text-xs text-slate-500">{checked ? '완료됨' : '미완료'}</span>
    </form>
  );
}

function BriefingCard({ briefing }: { briefing: ScheduleBriefing }) {
  const [collapsed, setCollapsed] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const urgencyBadge = (urgency: ScheduleBriefing['thisWeekItems'][number]['urgency']) => {
    if (urgency === 'critical') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">긴급</span>;
    if (urgency === 'high') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">우선</span>;
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">일반</span>;
  };

  const formatDays = (days: number) => {
    if (days === 0) return '오늘';
    if (days === 1) return '내일';
    return `D-${days}`;
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-600">
            <Sparkles className="size-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-600">AI 일정 브리핑</p>
            <p className="text-sm font-semibold text-slate-900">{briefing.todayLabel} 기준</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!feedbackSent && (
            <button
              type="button"
              onClick={() => {
                const reason = window.prompt('어떤 부분이 잘못됐나요? (선택 사항)');
                if (reason !== null) setFeedbackSent(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="AI 브리핑 피드백 제출"
            >
              <ThumbsDown className="size-3" aria-hidden="true" />
              <span>틀렸나요?</span>
            </button>
          )}
          {feedbackSent && <span className="text-xs text-slate-400">피드백 감사합니다</span>}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'AI 브리핑 펼치기' : 'AI 브리핑 접기'}
          >
            {collapsed ? '브리핑 보기 ▼' : '접기 ▲'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-700">{briefing.weekSummary}</p>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {briefing.conflicts.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-sm text-amber-800">
                {briefing.conflicts[0].date} 에 일정 {briefing.conflicts[0].titles.length}개 겹침 —{' '}
                {briefing.conflicts[0].titles.join(', ')}
              </p>
            </div>
          )}

          {briefing.thisWeekItems.length === 0 && (
            <p className="py-2 text-center text-sm text-slate-400">이번 주 예정된 기일·마감이 없습니다.</p>
          )}

          {briefing.thisWeekItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${item.urgency === 'critical' ? 'border-red-200 bg-red-50' : item.urgency === 'high' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {urgencyBadge(item.urgency)}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {item.kindLabel}
                </span>
                <span className={`text-xs font-bold ${item.urgency === 'critical' ? 'text-red-600' : 'text-slate-500'}`}>
                  {formatDays(item.daysUntil)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
              {item.caseTitle && (
                <p className="mt-0.5 text-xs text-slate-500">사건: {item.caseTitle}</p>
              )}
              {item.preparations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {item.preparations.map((prep) => (
                    <li key={prep} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                      {prep}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {briefing.tip && (
            <p className="mt-1 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{briefing.tip}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarBoardClient({
  organizationId,
  currentUserId,
  canManage,
  snapshot,
  caseOptions,
  briefing
}: {
  organizationId: string | null;
  currentUserId: string;
  canManage: boolean;
  snapshot: Snapshot;
  caseOptions: CaseOption[];
  briefing?: ScheduleBriefing;
}) {
  const [scope, setScope] = useState<'merged' | 'personal' | 'organization'>('merged');
  const [category, setCategory] = useState<'today' | 'week' | 'important' | 'new'>('today');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [quickPanel, setQuickPanel] = useState<'todayTasks' | 'weekTasks' | 'yearSchedules' | null>('todayTasks');
  const [createCaseId, setCreateCaseId] = useState(caseOptions[0]?.id ?? '');
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createScheduledStart, setCreateScheduledStart] = useState(() => toDateInput(snapshot.schedules[0]?.scheduled_start) || toDateTimeInputFromDateKey(toLocalDateKey(new Date())));
  const [currentMoment] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(toLocalDateKey(new Date()).startsWith(snapshot.focusMonth) ? toLocalDateKey(new Date()) : null);
  const [recentEntryCutoff] = useState(() => Date.now() - 1000 * 60 * 60 * 48);

  const todayKey = toLocalDateKey(currentMoment);
  const weekLaterTime = useMemo(() => {
    const next = new Date(currentMoment);
    next.setDate(currentMoment.getDate() + 7);
    return next.getTime();
  }, [currentMoment]);

  const entries = useMemo<UnifiedEntry[]>(() => {
    const scheduleEntries = snapshot.schedules.map((item) => {
      const updatedSource = item.updated_at || item.created_at || item.scheduled_start;
      const isNew = Boolean(item.case_id) && new Date(updatedSource || item.scheduled_start).getTime() >= recentEntryCutoff;
      return {
        id: item.id,
        source: 'schedule' as const,
        title: item.title,
        when: item.scheduled_start,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 일정',
        detail: item.location || item.notes || '일정 상세를 확인하세요.',
        badge: labelFrom(scheduleKindLabels, item.schedule_kind),
        tone: item.is_important ? 'amber' as const : 'blue' as const,
        isImportant: Boolean(item.is_important),
        isNew,
        ownerScope: item.created_by === currentUserId ? 'personal' as const : 'organization' as const,
        completedAt: item.completed_at ?? null,
        completedByName: item.completed_by_name ?? null,
        raw: item
      };
    });

    const requestEntries = snapshot.requests
      .filter((item) => item.due_at)
      .map((item) => ({
        id: item.id,
        source: 'request' as const,
        title: item.title,
        when: item.due_at as string,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 요청',
        detail: item.body || '요청 상세를 확인하세요.',
        badge: labelFrom(requestStatusLabels, item.status),
        tone: 'green' as const,
        isImportant: item.status === 'open',
        isNew: false,
        ownerScope: 'organization' as const,
        completedAt: null,
        completedByName: null
      }));

    const billingEntries = snapshot.billingEntries
      .filter((item) => item.due_on)
      .map((item) => ({
        id: item.id,
        source: 'billing' as const,
        title: item.title,
        when: `${item.due_on}T09:00:00+09:00`,
        caseId: item.case_id ?? null,
        caseTitle: relatedTitle(item.cases) ?? '공통 비용',
        detail: `${formatCurrency(item.amount)} · ${billingStatusLabel(item.status)}`,
        badge: '청구',
        tone: 'amber' as const,
        isImportant: true,
        isNew: false,
        ownerScope: 'organization' as const,
        completedAt: null,
        completedByName: null
      }));

    return [...scheduleEntries, ...requestEntries, ...billingEntries].sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
  }, [currentUserId, recentEntryCutoff, snapshot.billingEntries, snapshot.requests, snapshot.schedules]);

  const scopedEntries = useMemo(() => entries.filter((entry) => {
    if (scope === 'personal') return entry.ownerScope === 'personal';
    if (scope === 'organization') return entry.ownerScope === 'organization';
    return true;
  }), [entries, scope]);

  const visibleEntries = useMemo(() => scopedEntries.filter((entry) => {
    const entryDate = new Date(entry.when);
    const entryKey = toLocalDateKey(entryDate);
    if (category === 'today') return entryKey === todayKey;
    if (category === 'week') return entryDate.getTime() <= weekLaterTime;
    if (category === 'important') return entry.isImportant;
    return entry.isNew;
  }), [category, scopedEntries, todayKey, weekLaterTime]);

  const calendarCells = useMemo(() => buildCalendarCells(snapshot.focusMonth), [snapshot.focusMonth]);

  const entriesByDay = useMemo(() => {
    const mapped = new Map<string, UnifiedEntry[]>();
    for (const entry of scopedEntries) {
      const key = toLocalDateKey(entry.when);
      const existing = mapped.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        mapped.set(key, [entry]);
      }
    }
    return mapped;
  }, [scopedEntries]);

  const selectedEntries = selectedDateKey ? (entriesByDay.get(selectedDateKey) ?? []) : visibleEntries;

  const summary = {
    today: scopedEntries.filter((entry) => toLocalDateKey(entry.when) === todayKey).length,
    week: scopedEntries.filter((entry) => new Date(entry.when).getTime() <= weekLaterTime).length,
    important: scopedEntries.filter((entry) => entry.isImportant).length,
    new: scopedEntries.filter((entry) => entry.isNew).length,
    personal: entries.filter((entry) => entry.ownerScope === 'personal').length,
    organization: entries.filter((entry) => entry.ownerScope === 'organization').length
  };

  const prevMonth = monthShift(snapshot.focusMonth, -1);
  const nextMonth = monthShift(snapshot.focusMonth, 1);
  const createScheduleAction = createCaseId ? addScheduleAction.bind(null, createCaseId) : async () => {};
  const startOfToday = useMemo(() => {
    const date = new Date(currentMoment);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentMoment]);
  const endOfWeek = useMemo(() => {
    const date = new Date(currentMoment);
    const day = date.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [currentMoment]);

  const scheduleEntriesOnly = useMemo(() => scopedEntries.filter((entry) => entry.source === 'schedule'), [scopedEntries]);
  const todayTasks = useMemo(() => scheduleEntriesOnly.filter((entry) => toLocalDateKey(entry.when) === todayKey), [scheduleEntriesOnly, todayKey]);
  const weekTasks = useMemo(() => scheduleEntriesOnly.filter((entry) => isWithinRange(entry.when, startOfToday, endOfWeek)), [endOfWeek, scheduleEntriesOnly, startOfToday]);
  const yearSchedules = useMemo(() => scheduleEntriesOnly.filter((entry) => isSameYear(entry.when, currentMoment.getFullYear())), [currentMoment, scheduleEntriesOnly]);

  const categoryCards = [
    { key: 'today' as const, label: '오늘 일정', value: summary.today, helper: '오늘 처리할 일정 수', icon: Clock3 },
    { key: 'week' as const, label: '7일 내 일정', value: summary.week, helper: '이번 주 안에 다가오는 일정', icon: CalendarDays },
    { key: 'important' as const, label: '중요 일정', value: summary.important, helper: '중요 표시된 일정 수', icon: CheckCircle2 },
    { key: 'new' as const, label: '최근 갱신 일정', value: summary.new, helper: '최근 갱신된 사건 연동 일정', icon: CalendarRange }
  ];

  const quickButtons = [
    { key: 'todayTasks' as const, label: '오늘 할 일', count: todayTasks.length, icon: CalendarCheck2 },
    { key: 'weekTasks' as const, label: '금주 할 일', count: weekTasks.length, icon: CheckCircle2 },
    { key: 'yearSchedules' as const, label: '금년도 스케줄', count: yearSchedules.length, icon: CalendarRange }
  ];

  const weekdayLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <div className="space-y-6">
      {briefing && (
        <BriefingCard briefing={briefing} />
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">일정 확인</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">개인 일정과 조직 일정을 한 화면에서 확인합니다.</h1>
            <p className="mt-2 text-sm text-slate-600">신규 배지는 사건 연동 일정이 최근 갱신된 경우에만 바로 표시됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={'/calendar/worklog' as Route} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              <ScrollText className="size-4" />업무일지
            </Link>
            <Link href={`/calendar?month=${prevMonth}` as Route} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              <ChevronLeft className="size-4" />이전 달
            </Link>
            <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900">{snapshot.focusMonth}</div>
            <Link href={`/calendar?month=${nextMonth}` as Route} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              다음 달<ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              {quickButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  onClick={() => setQuickPanel((current) => current === button.key ? null : button.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${quickPanel === button.key ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                >
                  <button.icon className="size-4" />
                  {button.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${quickPanel === button.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{button.count}</span>
                  <ChevronDown className={`size-4 transition ${quickPanel === button.key ? 'rotate-180' : ''}`} />
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {quickPanel === 'todayTasks' ? (
              <div className="space-y-3">
                {todayTasks.length ? todayTasks.map((entry) => (
                  <div key={`today-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-slate-900 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                        <p className={`mt-2 text-sm leading-6 text-slate-600 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.detail}</p>
                      </div>
                      <ScheduleCompletionCheckbox entry={entry} />
                    </div>
                    {completionLabel(entry) ? <p className="mt-3 text-xs text-slate-500">체크 기록 · {completionLabel(entry)}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">오늘 처리할 일정이 없습니다.</p>}
              </div>
            ) : null}

            {quickPanel === 'weekTasks' ? (
              <div className="space-y-3">
                {weekTasks.length ? weekTasks.map((entry) => (
                  <div key={`week-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-slate-900 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                        <p className={`mt-2 text-sm leading-6 text-slate-600 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.detail}</p>
                      </div>
                      <ScheduleCompletionCheckbox entry={entry} />
                    </div>
                    {completionLabel(entry) ? <p className="mt-3 text-xs text-slate-500">체크 기록 · {completionLabel(entry)}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">이번 주 안에 처리할 일정이 없습니다.</p>}
              </div>
            ) : null}

            {quickPanel === 'yearSchedules' ? (
              <div className="space-y-3">
                {yearSchedules.length ? yearSchedules.map((entry) => (
                  <div key={`year-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-slate-900 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                        <p className={`mt-2 text-sm leading-6 text-slate-600 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.detail}</p>
                      </div>
                      <ScheduleCompletionCheckbox entry={entry} />
                    </div>
                    {completionLabel(entry) ? <p className="mt-3 text-xs text-slate-500">체크 기록 · {completionLabel(entry)}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">올해 등록된 일정이 없습니다.</p>}
              </div>
            ) : null}

            {!quickPanel ? <p className="text-sm text-slate-500">버튼을 누르면 해당 일정 목록이 바로 펼쳐집니다.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>최근 체크 로그</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {snapshot.workLogs.length ? snapshot.workLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{log.actor_name ?? '담당자'} · {formatDateTime(log.created_at)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{log.summary}</p>
              </div>
            )) : <p className="text-sm text-slate-500">최근 체크 로그가 없습니다.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categoryCards.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setCategory(item.key)}
            className={`flex min-h-40 flex-col rounded-2xl border p-4 text-left transition ${category === item.key ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
          >
            {/* Rule 3-9-2: 1행(라벨+아이콘) → 2행(핵심값) → 3행(보조설명) */}
            <p className={`flex items-center gap-1.5 text-xs font-semibold tracking-[0.18em] ${category === item.key ? 'text-slate-200' : 'text-slate-500'}`}>
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold leading-none">{item.value}</p>
            <p className={`mt-auto pt-4 text-xs ${category === item.key ? 'text-slate-200' : 'text-slate-500'}`}>{item.helper}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {[
            { key: 'merged' as const, label: '합쳐서 보기' },
            { key: 'personal' as const, label: `내 일정 ${summary.personal}` },
            { key: 'organization' as const, label: `조직 일정 ${summary.organization}` }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${scope === item.key ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-500">현재 보기 · {scope === 'merged' ? '합쳐서 보기' : scope === 'personal' ? '내 일정만' : '조직 일정만'}</div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>월간 일정</CardTitle>
            {selectedDateKey ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDateKey(null)}>
                날짜 선택 해제
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">날짜를 누르면 아래 목록이 해당 날짜 일정으로 바뀝니다.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekdayLabels.map((label) => (
                  <div key={label} className="rounded-lg bg-slate-100 px-1 py-1.5 text-center text-[11px] font-semibold text-slate-600 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm">
                    {label}
                  </div>
                ))}
                {calendarCells.map((cell) => {
                  const dayEntries = entriesByDay.get(cell.key) ?? [];
                  const isToday = cell.key === todayKey;
                  const isSelected = cell.key === selectedDateKey;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey((current) => current === cell.key ? null : cell.key);
                        if (canManage) {
                          setCreateFormOpen(true);
                          setCreateScheduledStart(toDateTimeInputFromDateKey(cell.key));
                        }
                      }}
                      className={`min-h-20 rounded-xl border p-1.5 text-left transition sm:min-h-28 sm:p-2 lg:min-h-36 lg:rounded-2xl lg:p-3 ${isSelected ? 'border-slate-950 bg-slate-950 text-white' : isToday ? 'border-sky-300 bg-sky-50 text-slate-900' : cell.inMonth ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-semibold sm:text-sm ${isSelected ? 'text-white' : isToday ? 'text-sky-700' : ''}`}>{cell.date.getDate()}</span>
                        {dayEntries.length ? (
                          <span className={`hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex ${isSelected ? 'bg-white/18 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {dayEntries.length}건
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 lg:hidden">
                        {dayEntries.slice(0, 6).map((entry) => (
                          <span
                            key={`${cell.key}-${entry.source}-${entry.id}`}
                            className={`size-2.5 rounded-full ${calendarDotClass(entry.ownerScope)}`}
                            title={`${entry.ownerScope === 'personal' ? '내 일정' : '조직 일정'} · ${entry.title}`}
                          />
                        ))}
                        {dayEntries.length > 6 ? (
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>+{dayEntries.length - 6}</span>
                        ) : null}
                      </div>
                      <div className="mt-3 hidden space-y-1.5 lg:block">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            key={`${cell.key}-${entry.source}-${entry.id}`}
                            className={`rounded-lg px-2 py-1.5 text-xs ${isSelected ? 'bg-white/12 text-white' : entry.isImportant ? 'bg-amber-50 text-amber-900' : entry.isNew ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`size-2 rounded-full ${calendarDotClass(entry.ownerScope)}`} />
                              <span className="truncate font-medium">{entry.title}</span>
                              {entry.isNew ? <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isSelected ? 'bg-emerald-400/25 text-emerald-100' : 'bg-emerald-100 text-emerald-700'}`}>신규</span> : null}
                            </div>
                            <p className={`mt-1 truncate ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>{entry.caseTitle}</p>
                          </div>
                        ))}
                        {dayEntries.length > 3 ? (
                          <p className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>외 {dayEntries.length - 3}건</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        개인 일정은 내가 직접 등록한 일정이고, 조직 일정은 사건 일정·요청 마감·비용 후속 일정을 함께 보여줍니다.
      </div>

      {canManage ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <Plus className="size-4 text-slate-700" />
                <CardTitle>일정 등록</CardTitle>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setCreateFormOpen((current) => !current)}>
                {createFormOpen ? '닫기' : '등록 열기'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {!createFormOpen ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                날짜를 누르면 해당 날짜로 일정 등록이 바로 열립니다. 기본 화면은 일정 목록 확인에 집중합니다.
              </div>
            ) : (
              <ClientActionForm
                action={createScheduleAction}
                successTitle="일정 등록 완료"
                errorCause="일정 등록 정보를 저장하지 못했습니다."
                errorResolution="사건 선택과 일정 입력값을 확인한 뒤 다시 등록해 주세요."
                className="grid gap-3 xl:grid-cols-[1.1fr_1.4fr_0.9fr_1fr_auto]"
              >
                <input type="hidden" name="clientVisibility" value="internal_only" />
                <div className="space-y-1">
                  <label htmlFor="create-case-id" className="text-sm font-medium text-slate-700">
                    사건 선택 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="create-case-id"
                    aria-required="true"
                    value={createCaseId}
                    onChange={(event) => setCreateCaseId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    {caseOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-title" className="text-sm font-medium text-slate-700">
                    일정 제목 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <Input id="create-title" name="title" placeholder="일정 제목" required aria-required="true" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-schedule-kind" className="text-sm font-medium text-slate-700">
                    유형 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select id="create-schedule-kind" name="scheduleKind" defaultValue="deadline" aria-required="true" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                    <option value="hearing">기일</option>
                    <option value="deadline">마감</option>
                    <option value="meeting">회의</option>
                    <option value="reminder">리마인더</option>
                    <option value="collection_visit">방문회수</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-scheduled-start" className="text-sm font-medium text-slate-700">
                    일시 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <Input id="create-scheduled-start" name="scheduledStart" type="datetime-local" required aria-required="true" value={createScheduledStart} onChange={(event) => setCreateScheduledStart(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <SubmitButton disabled={!organizationId || !createCaseId}>등록</SubmitButton>
                </div>
                <details className="xl:col-span-5">
                  <summary className="cursor-pointer text-sm font-medium text-slate-600">추가 항목</summary>
                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
                    <Input name="location" aria-label="장소" placeholder="장소" className="md:col-span-2" />
                    <Textarea name="notes" placeholder="메모" className="md:col-span-2 min-h-24" />
                    <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                      <input type="checkbox" name="isImportant" className="size-4 rounded border-slate-300" />
                      중요 일정으로 표시
                    </label>
                  </div>
                </details>
              </ClientActionForm>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{selectedDateKey ? `${formatDate(selectedDateKey)} 일정` : '다가오는 일정보기'}</CardTitle>
            <Badge tone="blue">{selectedEntries.length}건</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {selectedDateKey ? '선택한 날짜의 일정을 보여줍니다. 다시 누르면 선택이 해제됩니다.' : '초록색 신규 배지는 최근 갱신된 사건 연동 일정만 표시합니다.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedEntries.length ? (
            selectedEntries.map((entry) => {
              const editable = canManage && entry.source === 'schedule' && entry.raw;
              return (
                <div key={`${entry.source}-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold text-slate-900 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.title}</p>
                        <Badge tone={entry.tone}>{entry.badge}</Badge>
                        {entry.isImportant ? <Badge tone="amber">중요</Badge> : null}
                        {entry.isNew ? <Badge tone="green">신규</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                      <p className={`mt-2 text-sm leading-6 text-slate-600 ${entry.completedAt ? 'line-through text-slate-400' : ''}`}>{entry.detail}</p>
                      {completionLabel(entry) ? <p className="mt-2 text-xs text-slate-500">완료 체크 · {completionLabel(entry)}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.source === 'schedule' ? <ScheduleCompletionCheckbox entry={entry} /> : null}
                      <Badge tone={entry.ownerScope === 'personal' ? 'blue' : 'slate'}>{entry.ownerScope === 'personal' ? '내 일정' : '조직 일정'}</Badge>
                      {entry.caseId ? (
                        <Link
                          href={`/cases/${entry.caseId}` as Route}
                          className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}
                        >
                          사건 보기
                        </Link>
                      ) : null}
                      {editable ? (
                        <button type="button" onClick={() => setEditingScheduleId((current) => current === entry.id ? null : entry.id)} className="text-sm font-medium text-slate-700 underline underline-offset-4">
                          {editingScheduleId === entry.id ? '편집 닫기' : '관리자 편집'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {editable && editingScheduleId === entry.id && entry.raw ? (
                    <ClientActionForm
                      action={updateScheduleAction.bind(null, entry.id)}
                      successTitle="일정 수정 완료"
                      errorCause="일정 수정 정보를 저장하지 못했습니다."
                      errorResolution="일정 시간과 입력값을 확인한 뒤 다시 저장해 주세요."
                      className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
                    >
                      <input type="hidden" name="clientVisibility" value="internal_only" />
                      <div className="space-y-1 md:col-span-2">
                        <label htmlFor={`edit-title-${entry.id}`} className="text-sm font-medium text-slate-700">
                          일정 제목 <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <Input id={`edit-title-${entry.id}`} name="title" defaultValue={entry.raw.title} required aria-required="true" className="md:col-span-2" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-kind-${entry.id}`} className="text-sm font-medium text-slate-700">
                          유형 <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <select id={`edit-kind-${entry.id}`} name="scheduleKind" defaultValue={entry.raw.schedule_kind} aria-required="true" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900">
                          <option value="hearing">기일</option>
                          <option value="deadline">마감</option>
                          <option value="meeting">회의</option>
                          <option value="reminder">리마인더</option>
                          <option value="collection_visit">방문회수</option>
                          <option value="other">기타</option>
                        </select>
                      </div>
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
                        공통 일정은 내부 전용으로만 관리됩니다.
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-start-${entry.id}`} className="text-sm font-medium text-slate-700">
                          시작 일시 <span className="text-red-500" aria-hidden="true">*</span>
                        </label>
                        <Input id={`edit-start-${entry.id}`} name="scheduledStart" type="datetime-local" defaultValue={toDateInput(entry.raw.scheduled_start)} required aria-required="true" />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`edit-end-${entry.id}`} className="text-sm font-medium text-slate-700">
                          종료 일시
                        </label>
                        <Input id={`edit-end-${entry.id}`} name="scheduledEnd" type="datetime-local" defaultValue={toDateInput(entry.raw.scheduled_end)} />
                      </div>
                      <Input name="location" aria-label="장소" defaultValue={entry.raw.location || ''} placeholder="장소" className="md:col-span-2" />
                      <Textarea name="notes" defaultValue={entry.raw.notes || ''} className="md:col-span-2" />
                      <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                        <input type="checkbox" name="isImportant" defaultChecked={Boolean(entry.raw.is_important)} className="size-4 rounded border-slate-300" />
                        중요 일정으로 유지
                      </label>
                      <div className="md:col-span-2">
                        <SubmitButton>일정 수정 저장</SubmitButton>
                      </div>
                    </ClientActionForm>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              <p>현재 선택한 보기 조건에 맞는 일정이 없습니다.</p>
              <p className="mt-1">카테고리를 변경하거나 새 일정을 등록해 보세요.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
