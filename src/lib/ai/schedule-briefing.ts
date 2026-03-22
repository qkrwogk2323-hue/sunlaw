/**
 * 일정 확인 AI 브리핑 — 이번 주 기일/마감 브리핑 + 준비사항 제안
 * 외부 AI 없이 rule-based로 동작. Gemini API 키 있으면 더 풍부한 준비사항 생성.
 */

export type ScheduleBriefingItem = {
  id: string;
  title: string;
  caseTitle: string | null;
  scheduledAt: string;
  daysUntil: number;
  kind: string;
  kindLabel: string;
  urgency: 'critical' | 'high' | 'normal';
  preparations: string[];
  conflictsWith?: string | null;
};

export type ScheduleBriefing = {
  generatedAt: string;
  todayLabel: string;
  weekSummary: string;
  criticalCount: number;
  thisWeekItems: ScheduleBriefingItem[];
  conflicts: Array<{ date: string; titles: string[] }>;
  tip: string | null;
};

const KIND_LABELS: Record<string, string> = {
  hearing: '기일',
  deadline: '마감',
  meeting: '회의',
  reminder: '리마인더',
  collection_visit: '방문 회수',
  other: '기타',
};

const KIND_PREPARATIONS: Record<string, string[]> = {
  hearing: [
    '준비서면 제출 여부 확인',
    '증거목록 최신화',
    '의뢰인 출석 여부 재확인',
    '상대방 서면 수령 여부 체크',
  ],
  deadline: [
    '제출 기한 전날 완료 목표로 일정 조정',
    '서류 목록 최종 점검',
    '전자소송 시스템 접수 여부 확인',
  ],
  meeting: [
    '회의 안건 사전 공유',
    '관련 사건 자료 준비',
    '참석자 확인 및 장소/링크 재안내',
  ],
  collection_visit: [
    '방문 대상 주소 최신화',
    '채무자 연락처 재확인',
    '회수 계획서 지참',
  ],
  reminder: [],
  other: [],
};

function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? '기타';
}

function preparations(kind: string): string[] {
  return KIND_PREPARATIONS[kind] ?? [];
}

function daysUntilDate(targetIso: string, todayIso: string): number {
  const target = new Date(targetIso);
  const today = new Date(todayIso);
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgency(daysUntil: number, kind: string): ScheduleBriefingItem['urgency'] {
  if (daysUntil <= 1) return 'critical';
  if (daysUntil <= 3 || kind === 'hearing' || kind === 'deadline') return 'high';
  return 'normal';
}

type RawSchedule = {
  id: string;
  title: string;
  schedule_kind: string;
  scheduled_start: string;
  is_important?: boolean | null;
  cases?: { title?: string | null } | Array<{ title?: string | null }> | null;
};

function caseTitle(raw: RawSchedule): string | null {
  if (Array.isArray(raw.cases)) return raw.cases[0]?.title ?? null;
  return raw.cases?.title ?? null;
}

export function buildScheduleBriefing(
  schedules: RawSchedule[],
  todayIso: string,
  weekEndIso: string,
): ScheduleBriefing {
  const today = new Date(todayIso);
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekEndIso);
  weekEnd.setHours(23, 59, 59, 999);

  const thisWeekRaw = schedules.filter((s) => {
    const d = new Date(s.scheduled_start);
    return d >= today && d <= weekEnd && !s.scheduled_start.includes('completed');
  });

  const items: ScheduleBriefingItem[] = thisWeekRaw.map((s) => {
    const days = daysUntilDate(s.scheduled_start, today.toISOString());
    return {
      id: s.id,
      title: s.title,
      caseTitle: caseTitle(s),
      scheduledAt: s.scheduled_start,
      daysUntil: days,
      kind: s.schedule_kind,
      kindLabel: kindLabel(s.schedule_kind),
      urgency: s.is_important ? 'critical' : urgency(days, s.schedule_kind),
      preparations: preparations(s.schedule_kind),
    };
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // 기일 겹침 감지 (같은 날 2개 이상)
  const byDate = new Map<string, string[]>();
  for (const item of items) {
    const dateKey = item.scheduledAt.slice(0, 10);
    const existing = byDate.get(dateKey) ?? [];
    existing.push(item.title);
    byDate.set(dateKey, existing);
  }
  const conflicts = Array.from(byDate.entries())
    .filter(([, titles]) => titles.length >= 2)
    .map(([date, titles]) => ({ date, titles }));

  const criticalCount = items.filter((i) => i.urgency === 'critical').length;
  const highCount = items.filter((i) => i.urgency === 'high').length;

  const todayLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  let weekSummary = '';
  if (!items.length) {
    weekSummary = '이번 주 예정된 기일·마감이 없습니다.';
  } else if (criticalCount > 0) {
    weekSummary = `오늘/내일 처리해야 할 긴급 항목 ${criticalCount}건 포함, 이번 주 총 ${items.length}건`;
  } else {
    weekSummary = `이번 주 일정 ${items.length}건${highCount > 0 ? ` (우선 처리 ${highCount}건)` : ''}`;
  }

  let tip: string | null = null;
  if (conflicts.length > 0) {
    tip = `⚠️ ${conflicts[0].date} 에 일정 ${conflicts[0].titles.length}개가 겹칩니다. 담당자 분배를 확인하세요.`;
  } else if (criticalCount === 0 && items.length > 0) {
    tip = '이번 주 긴급 항목 없음. 다음 주 기일도 미리 확인해 두세요.';
  }

  return {
    generatedAt: new Date().toISOString(),
    todayLabel,
    weekSummary,
    criticalCount,
    thisWeekItems: items,
    conflicts,
    tip,
  };
}
