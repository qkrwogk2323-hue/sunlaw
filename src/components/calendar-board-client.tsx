'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Plus, ScrollText, Sparkles, ThumbsDown } from 'lucide-react';
import { addScheduleAction, updateScheduleAction, updateScheduleCompletionAction, updateScheduleCancellationAction } from '@/lib/actions/case-actions';
import { fetchCalendarMonthAction } from '@/lib/actions/calendar-actions';
import type { ScheduleBriefing } from '@/lib/ai/schedule-briefing';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { billingStatusLabel, labelFrom } from '@/lib/status-labels';
import { Badge } from '@/components/ui/badge';
import { BulkUploadPanel } from '@/components/bulk-upload-panel';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { ROUTES } from '@/lib/routes/registry';

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
  canceled_at?: string | null;
  canceled_by?: string | null;
  canceled_by_name?: string | null;
  canceled_reason?: string | null;
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
  action_type: 'completed' | 'reopened' | 'canceled' | 'cancel_reverted';
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
  canceledAt?: string | null;
  canceledByName?: string | null;
  canceledReason?: string | null;
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

function cancellationLabel(entry: UnifiedEntry) {
  if (!entry.canceledAt) return null;
  const reason = entry.canceledReason ? ` · 사유: ${entry.canceledReason}` : '';
  return `${entry.canceledByName ?? '담당자'} · ${formatDateTime(entry.canceledAt)}${reason}`;
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

function ScheduleCancellationButton({
  entry
}: {
  entry: UnifiedEntry;
}) {
  if (entry.source !== 'schedule' || !entry.raw) return null;

  const isCanceled = Boolean(entry.canceledAt);

  return (
    <ClientActionForm
      action={updateScheduleCancellationAction.bind(null, entry.id)}
      successTitle={isCanceled ? '일정 취소를 해제했습니다.' : '일정을 취소했습니다.'}
      errorCause={isCanceled ? '일정 취소 해제에 실패했습니다.' : '일정 취소에 실패했습니다.'}
      errorResolution="잠시 후 다시 시도해 주세요."
      className="inline-flex"
    >
      <input type="hidden" name="canceled" value={isCanceled ? 'false' : 'true'} />
      <input type="hidden" name="reason" value="일정 확인 화면에서 취소 처리" />
      <SubmitButton variant="ghost" pendingLabel="반영 중..." className="h-8 px-3 text-xs">
        {isCanceled ? '취소 해제' : '취소'}
      </SubmitButton>
    </ClientActionForm>
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
  briefing,
  bulkUploadAction
}: {
  organizationId: string | null;
  currentUserId: string;
  canManage: boolean;
  snapshot: Snapshot;
  caseOptions: CaseOption[];
  briefing?: ScheduleBriefing;
  bulkUploadAction: (organizationId: string, csvText: string) => Promise<import('@/lib/actions/bulk-upload-actions').BulkUploadResult>;
}) {
  const [liveSnapshot, setLiveSnapshot] = useState(snapshot);
  const [isNavigating, startNavTransition] = useTransition();
  const [kindFilter, setKindFilter] = useState<'all' | 'work' | 'meeting' | 'other'>('all');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [createCaseId, setCreateCaseId] = useState(caseOptions[0]?.id ?? '');
  const [createTitle, setCreateTitle] = useState('');
  const [createKind, setCreateKind] = useState('');
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createScheduledStart, setCreateScheduledStart] = useState(() => toDateInput(liveSnapshot.schedules[0]?.scheduled_start) || toDateTimeInputFromDateKey(toLocalDateKey(new Date())));
  const [monthJump, setMonthJump] = useState(liveSnapshot.focusMonth);
  const [currentMoment] = useState(() => new Date());

  const navigateMonth = (targetMonth: string) => {
    startNavTransition(async () => {
      const result = await fetchCalendarMonthAction(targetMonth);
      if (result.ok) {
        setLiveSnapshot(result.snapshot as unknown as Snapshot);
        setMonthJump(targetMonth);
        window.history.replaceState(null, '', `/calendar?month=${targetMonth}`);
      }
    });
  };
  const [recentEntryCutoff] = useState(() => Date.now() - 1000 * 60 * 60 * 48);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [aiHelperOpen, setAiHelperOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [aiDraftText, setAiDraftText] = useState('');

  const todayKey = toLocalDateKey(currentMoment);
  const weekLaterTime = useMemo(() => {
    const next = new Date(currentMoment);
    next.setDate(currentMoment.getDate() + 7);
    return next.getTime();
  }, [currentMoment]);

  const entries = useMemo<UnifiedEntry[]>(() => {
    const scheduleEntries = liveSnapshot.schedules.map((item) => {
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
        canceledAt: item.canceled_at ?? null,
        canceledByName: item.canceled_by_name ?? null,
        canceledReason: item.canceled_reason ?? null,
        raw: item
      };
    });

    const requestEntries = liveSnapshot.requests
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

    const billingEntries = liveSnapshot.billingEntries
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
  }, [currentUserId, recentEntryCutoff, liveSnapshot.billingEntries, liveSnapshot.requests, liveSnapshot.schedules]);

  const summary = {
    today: entries.filter((entry) => toLocalDateKey(entry.when) === todayKey).length,
    week: entries.filter((entry) => new Date(entry.when).getTime() <= weekLaterTime).length,
    important: entries.filter((entry) => entry.isImportant).length,
    new: entries.filter((entry) => entry.isNew).length
  };

  const prevMonth = monthShift(liveSnapshot.focusMonth, -1);
  const nextMonth = monthShift(liveSnapshot.focusMonth, 1);
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
  const startOfMonth = useMemo(() => {
    const date = new Date(currentMoment.getFullYear(), currentMoment.getMonth(), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentMoment]);
  const endOfMonth = useMemo(() => {
    const date = new Date(currentMoment.getFullYear(), currentMoment.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [currentMoment]);

  const scheduleEntriesOnly = useMemo(() => entries.filter((entry) => entry.source === 'schedule'), [entries]);
  const todayTasks = useMemo(() => scheduleEntriesOnly.filter((entry) => toLocalDateKey(entry.when) === todayKey), [scheduleEntriesOnly, todayKey]);
  const filteredScheduleEntries = useMemo(() => todayTasks.filter((entry) => {
    const kind = entry.raw?.schedule_kind ?? 'other';
    if (kindFilter === 'meeting') return kind === 'meeting';
    if (kindFilter === 'other') return kind === 'other';
    if (kindFilter === 'work') return kind !== 'meeting' && kind !== 'other';
    return true;
  }), [kindFilter, todayTasks]);
  const kindSummaryCount = useMemo(() => {
    if (kindFilter === 'meeting') return todayTasks.filter((entry) => (entry.raw?.schedule_kind ?? 'other') === 'meeting').length;
    if (kindFilter === 'other') return todayTasks.filter((entry) => (entry.raw?.schedule_kind ?? 'other') === 'other').length;
    if (kindFilter === 'work') return todayTasks.filter((entry) => {
      const kind = entry.raw?.schedule_kind ?? 'other';
      return kind !== 'meeting' && kind !== 'other';
    }).length;
    return todayTasks.length;
  }, [kindFilter, todayTasks]);

  const aiScheduleSuggestion = useMemo(() => {
    const text = aiDraftText.trim().toLowerCase();
    if (!text) return null;

    const meetingKeywords = ['회의', '미팅', '면담', '상담', '방문', '오신대', '오신다', '만남', '미리 만나', '통화'];
    const workKeywords = ['마감', '기한', '제출', '회신', '검토', '작성', '정리', '보정', '납부', '준비', '등록', '처리'];

    const hasMeetingKeyword = meetingKeywords.some((keyword) => text.includes(keyword));
    const hasWorkKeyword = workKeywords.some((keyword) => text.includes(keyword));

    if (hasMeetingKeyword) {
      return {
        scheduleKind: 'meeting',
        label: '미팅일정',
        reason: '만남, 방문, 상담처럼 사람을 직접 만나거나 이야기하는 일정으로 읽혔습니다.'
      };
    }

    if (hasWorkKeyword) {
      return {
        scheduleKind: 'deadline',
        label: '업무일정',
        reason: '기한, 제출, 검토, 작성처럼 처리해야 할 업무 일정으로 읽혔습니다.'
      };
    }

    return {
      scheduleKind: 'other',
      label: '기타일정',
      reason: '업무일정이나 미팅일정으로 단정하기 어려워 기타일정으로 먼저 제안합니다.'
    };
  }, [aiDraftText]);

  function applyAiScheduleSuggestion() {
    if (!aiScheduleSuggestion) return;
    setCreateFormOpen(true);
    setCreateTitle(aiDraftText.trim());
    setCreateKind(aiScheduleSuggestion.scheduleKind);
    setAiHelperOpen(false);
  }

  return (
    <div className="space-y-6">
      {briefing && (
        <BriefingCard briefing={briefing} />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>일정</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {filteredScheduleEntries.length > 0 ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    className="size-4 rounded border-slate-300"
                    checked={selectedIds.size === filteredScheduleEntries.filter(e => e.source === 'schedule').length && filteredScheduleEntries.filter(e => e.source === 'schedule').length > 0}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedIds(new Set(filteredScheduleEntries.filter(e => e.source === 'schedule').map(e => e.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                  <span className="text-xs">전체</span>
                </label>
              ) : null}
              {selectedIds.size > 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <span className="text-xs font-medium text-rose-700">{selectedIds.size}건 선택됨</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds(new Set());
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    aria-label="선택 취소"
                  >
                    선택 취소
                  </button>
                </div>
              ) : null}
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                {[
                  { key: 'all' as const, label: '전체' },
                  { key: 'work' as const, label: '업무일정' },
                  { key: 'meeting' as const, label: '미팅일정' },
                  { key: 'other' as const, label: '기타일정' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setKindFilter(item.key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${kindFilter === item.key ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCreateFormOpen((prev) => !prev)}
                  aria-label={createFormOpen ? '일정 추가 닫기' : '일정 추가'}
                  className={
                    createFormOpen
                      ? 'h-9 rounded-xl border-red-300 bg-red-50 px-3 text-xs text-red-600 hover:bg-red-100 hover:text-red-700'
                      : 'h-9 rounded-xl border-sky-600 bg-sky-600 px-3 text-xs font-semibold text-white shadow-sm hover:border-sky-700 hover:bg-sky-700'
                  }
                >
                  {createFormOpen ? '✕ 닫기' : '+ 일정 추가'}
                </Button>
              ) : null}
              <div className="min-w-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {kindFilter === 'all' ? '전체' : kindFilter === 'work' ? '업무일정' : kindFilter === 'meeting' ? '미팅일정' : '기타일정'}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 tabular-nums">{kindSummaryCount}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {canManage && createFormOpen ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
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
                  <Input
                    id="create-title"
                    name="title"
                    placeholder="일정 제목"
                    required
                    aria-required="true"
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-schedule-kind" className="text-sm font-medium text-slate-700">
                    일정 종류 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="create-schedule-kind"
                    name="scheduleKind"
                    value={createKind}
                    required
                    aria-required="true"
                    onChange={(event) => setCreateKind(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  >
                    <option value="" disabled>종류 선택 *</option>
                    <option value="hearing">기일</option>
                    <option value="deadline">마감</option>
                    <option value="meeting">회의</option>
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
                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2">
                    <Input name="location" aria-label="장소" placeholder="장소" className="md:col-span-2" />
                    <Textarea name="notes" placeholder="메모" className="md:col-span-2 min-h-24" />
                    <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                      <input type="checkbox" name="isImportant" className="size-4 rounded border-slate-300" />
                      중요 일정으로 표시
                    </label>
                  </div>
                </details>
              </ClientActionForm>
            </div>
          ) : null}
          {filteredScheduleEntries.length ? (
            filteredScheduleEntries.map((entry) => {
              const editable = canManage && entry.source === 'schedule' && entry.raw;
              const urgent = !entry.completedAt && !entry.canceledAt && new Date(entry.when).getTime() <= endOfWeek.getTime();
              const canceled = Boolean(entry.canceledAt);
              return (
                <div key={`${entry.source}-${entry.id}`} className={`flex gap-3 rounded-2xl border bg-white p-4 shadow-sm ${urgent ? 'border-amber-200' : 'border-slate-200'}`}>
                  <div className="shrink-0 pt-0.5">
                    {entry.source === 'schedule' ? (
                      <input
                        type="checkbox"
                        aria-label={`${entry.title} 선택`}
                        className="size-4 rounded border-slate-300"
                        checked={selectedIds.has(entry.id)}
                        onChange={(event) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (event.target.checked) next.add(entry.id); else next.delete(entry.id);
                            return next;
                          });
                        }}
                      />
                    ) : <div className="size-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-semibold ${canceled ? 'text-red-600 underline decoration-red-500 decoration-2 underline-offset-4' : entry.completedAt ? 'line-through text-slate-400' : 'text-slate-900'}`}>{entry.title}</p>
                          <Badge tone={entry.tone}>{entry.badge}</Badge>
                          {entry.isImportant ? <Badge tone="amber">중요</Badge> : null}
                          {entry.isNew ? <Badge tone="green">신규</Badge> : null}
                          {urgent ? <Badge tone="amber">임박</Badge> : null}
                          {canceled ? <Badge tone="red">취소됨</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{entry.caseTitle} · {formatDateTime(entry.when)}</p>
                        <p className={`mt-2 text-sm leading-6 ${canceled ? 'text-red-600 underline decoration-red-400 underline-offset-4' : entry.completedAt ? 'line-through text-slate-400' : 'text-slate-600'}`}>{entry.detail}</p>
                        {completionLabel(entry) ? <p className="mt-2 text-xs text-slate-500">완료 체크 · {completionLabel(entry)}</p> : null}
                        {cancellationLabel(entry) ? <p className="mt-2 text-xs text-red-600">취소 기록 · {cancellationLabel(entry)}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.source === 'schedule' && !canceled ? <ScheduleCompletionCheckbox entry={entry} /> : null}
                        {entry.source === 'schedule' ? <ScheduleCancellationButton entry={entry} /> : null}
                        {entry.caseId ? (
                          <Link
                            href={`${ROUTES.CASES}/${entry.caseId}` as Route}
                            className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-8 rounded-lg px-3 text-xs' })}
                          >
                            사건 보기
                          </Link>
                        ) : null}
                        {editable ? (
                          <button type="button" onClick={() => setEditingScheduleId((current) => current === entry.id ? null : entry.id)} className="text-sm font-medium text-slate-700 underline underline-offset-4">
                            {editingScheduleId === entry.id ? '편집 닫기' : '일정 편집'}
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
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              <p>현재 조건에 맞는 일정이 없습니다.</p>
              <p className="mt-1">범위나 일정 종류를 바꾸거나 새 일정을 등록해 보세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid w-full gap-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="size-4 text-sky-600" />
              달력 이동
            </div>
            <label className="mt-3 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <span className="sr-only">기준 월 선택</span>
              <Input
                type="month"
                value={monthJump}
                onChange={(event) => setMonthJump(event.target.value)}
                className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-semibold shadow-none focus:border-0"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={isNavigating} onClick={() => navigateMonth(prevMonth)} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-50" aria-label="이전 월">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" disabled={isNavigating} onClick={() => navigateMonth(monthJump)} className="inline-flex h-9 flex-[2] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-50" aria-label="선택한 월로 이동">
                {isNavigating ? '이동 중…' : '보기'}
              </button>
              <button type="button" disabled={isNavigating} onClick={() => navigateMonth(nextMonth)} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-50" aria-label="다음 월">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiHelperOpen(true)}
            className="flex min-h-[138px] flex-col justify-between rounded-2xl border border-violet-200 bg-[linear-gradient(180deg,#faf7ff,#ffffff)] p-4 text-left transition hover:border-violet-300"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="size-4 text-violet-600" />
              AI 일정 도우미
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-6 text-slate-600">짧게 적으면 일정 종류를 먼저 제안하고, 바로 일정 추가에 연결합니다.</p>
              <div className="inline-flex h-9 items-center rounded-xl border border-violet-200 bg-white px-3 text-sm font-medium text-violet-700">
                일정 메모 넣기
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setCsvUploadOpen(true)}
            className="flex min-h-[138px] flex-col justify-between rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,#f3f9ff,#ffffff)] p-4 text-left transition hover:border-sky-300"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="size-4 text-sky-600" />
              일정 CSV 등록
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-6 text-slate-600">사건번호 또는 사건명으로 기존 사건에 붙여 여러 일정을 한 번에 올립니다.</p>
              <div className="inline-flex h-9 items-center rounded-xl border border-sky-200 bg-white px-3 text-sm font-medium text-sky-700">
                양식 내려받기 / 파일 올리기
              </div>
            </div>
          </button>
          <div className="flex min-h-[138px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ScrollText className="size-4 text-emerald-600" />
              일정 기록
            </div>
            <div className="mt-3 grid gap-2">
              {/* BUG: 감사로그 직접 이동 버그 제거 */}
              <button type="button" disabled className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed" aria-disabled="true" title="감사 기록은 준비 중입니다.">
                일정 변경 기록 (준비 중)
              </button>
              <Link href={'/calendar/worklog' as Route} className={buttonStyles({ variant: 'secondary', className: 'h-10 rounded-xl justify-center' })}>
                일정 처리 기록
              </Link>
              <Link href={'/calendar/worklog' as Route} className={buttonStyles({ variant: 'secondary', className: 'h-10 rounded-xl justify-center' })}>
                업무일지
              </Link>
            </div>
          </div>
        </div>
      </div>

      {aiHelperOpen ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAiHelperOpen(false);
          }}
          aria-label="AI 일정 도우미"
        >
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">AI 일정 도우미</h2>
                <p className="mt-2 text-sm text-slate-600">누구를 만나고, 무엇을 처리해야 하는지만 적으면 일정 종류를 먼저 제안합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setAiHelperOpen(false)}
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-10 rounded-xl px-4' })}
              >
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <Textarea
                value={aiDraftText}
                onChange={(event) => setAiDraftText(event.target.value)}
                placeholder="예: 목요일 오후 3시 김대리랑 보정서류 검토 미팅 / 이번 주 금요일까지 납부 확인 서류 정리"
                className="min-h-36 rounded-2xl"
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {aiScheduleSuggestion ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-900">{aiScheduleSuggestion.label}에 등록할까요?</p>
                    <p className="text-sm leading-6 text-slate-600">{aiScheduleSuggestion.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={applyAiScheduleSuggestion}
                        className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-10 rounded-xl px-4' })}
                      >
                        {aiScheduleSuggestion.label}으로 일정 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateFormOpen(true);
                          setCreateTitle(aiDraftText.trim());
                          setCreateKind('other');
                          setAiHelperOpen(false);
                        }}
                        className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'h-10 rounded-xl px-4' })}
                      >
                        기타일정으로 열기
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">일정 메모를 입력하면 업무일정, 미팅일정, 기타일정 중 하나를 먼저 제안합니다.</p>
                )}
              </div>
            </div>
          </div>
        </dialog>
      ) : null}

      {csvUploadOpen ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCsvUploadOpen(false);
          }}
          aria-label="일정 CSV 등록"
        >
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">일정 CSV 등록</h2>
                <p className="mt-2 text-sm text-slate-600">사건번호 또는 사건명으로 기존 사건을 찾고, 일정종류와 기한 메모를 한 번에 올립니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setCsvUploadOpen(false)}
                className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-10 rounded-xl px-4' })}
              >
                닫기
              </button>
            </div>

            <div className="mt-5">
              {organizationId ? (
                <BulkUploadPanel
                  mode="schedules"
                  organizationId={organizationId}
                  action={bulkUploadAction}
                />
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  현재 조직을 찾을 수 없어 일정 CSV 등록을 열 수 없습니다.
                </div>
              )}
            </div>
          </div>
        </dialog>
      ) : null}

    </div>
  );
}
