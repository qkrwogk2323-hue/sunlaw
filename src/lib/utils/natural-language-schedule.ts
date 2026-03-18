/**
 * 자연어 일정 입력 파서
 * 순수 클라이언트 JS — 외부 패키지 없음, API 호출 없음
 *
 * 예시:
 *   "내일 3시 김대표 미팅"    → { date: '2026-03-19', time: '15:00', kind: 'meeting', title: '김대표 미팅' }
 *   "3월 30일 사장님 방문"    → { date: '2026-03-30', time: '09:00', kind: 'collection_visit', title: '사장님 방문' }
 *   "긴급 오전 10시 마감"     → { date: today,       time: '10:00', kind: 'deadline', isImportant: true }
 */

export type ScheduleKind = 'hearing' | 'deadline' | 'meeting' | 'reminder' | 'collection_visit' | 'other';

export type ParsedSchedule = {
  title: string;
  scheduledStart: string | null; // "YYYY-MM-DDTHH:MM" (datetime-local 호환)
  scheduleKind: ScheduleKind;
  isImportant: boolean;
};

// 날짜 패턴 -------------------------------------------------------------------

const RELATIVE_DATE: Array<[RegExp, (now: Date) => Date]> = [
  [/모레/, (d) => addDays(d, 2)],
  [/내일/, (d) => addDays(d, 1)],
  [/오늘|today/, (d) => d],
];

const ABSOLUTE_DATE = /(?:(\d{1,2})월\s*(\d{1,2})일|(\d{1,2})\/(\d{1,2}))/;

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_RE = new RegExp(`이번\\s*주?\\s*([${WEEKDAY_NAMES.join('')}])요일`);

// 시간 패턴 -------------------------------------------------------------------

const AM_PM_TIME = /(?:(오전|오후|am|pm)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?/i;
const CLOCK_TIME = /(?:(오전|오후|am|pm)\s*)?(\d{1,2}):(\d{2})/i;

// 종류 키워드 맵 --------------------------------------------------------------

const KIND_MAP: Array<[RegExp, ScheduleKind]> = [
  [/기일|심리|공판|선고/, 'hearing'],
  [/마감|데드라인|deadline/, 'deadline'],
  [/회의|미팅|meeting|면담|상담/, 'meeting'],
  [/방문|출장|현장/, 'collection_visit'],
  [/리마인더|알림|reminder/, 'reminder'],
];

// 중요도 키워드 ---------------------------------------------------------------

const IMPORTANT_RE = /긴급|중요|급하|빨리|필수/;

// 제목에서 제거할 토큰 ---------------------------------------------------------

const NOISE_TOKENS = [
  /모레|내일|오늘/g,
  /\d{1,2}월\s*\d{1,2}일/g,
  /\d{1,2}\/\d{1,2}/g,
  /이번\s*주?\s*[일월화수목금토]요일/g,
  /(?:(?:오전|오후|am|pm)\s*)?\d{1,2}시(?:\s*\d{1,2}분)?/gi,
  /(?:(?:오전|오후|am|pm)\s*)?\d{1,2}:\d{2}/gi,
  /긴급|중요|급하|빨리|필수/g,
  // Kind keywords are kept in title for context
  // ...KIND_MAP.map(([re]) => new RegExp(re.source, 'g')), 
];

// 헬퍼 -----------------------------------------------------------------------

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// 날짜 파싱 ------------------------------------------------------------------

function parseDate(text: string, now: Date): string | null {
  // 상대 날짜
  for (const [re, fn] of RELATIVE_DATE) {
    if (re.test(text)) return toDateStr(fn(now));
  }

  // "이번주 X요일"
  const weekdayMatch = text.match(WEEKDAY_RE);
  if (weekdayMatch) {
    const targetDay = WEEKDAY_NAMES.indexOf(weekdayMatch[1]);
    if (targetDay >= 0) {
      const d = new Date(now);
      const diff = (targetDay - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff);
      return toDateStr(d);
    }
  }

  // "N월 M일" or "N/M"
  const absMatch = text.match(ABSOLUTE_DATE);
  if (absMatch) {
    const month = parseInt(absMatch[1] ?? absMatch[3], 10);
    const day = parseInt(absMatch[2] ?? absMatch[4], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${now.getFullYear()}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return null;
}

// 시간 파싱 ------------------------------------------------------------------

function parseTime(text: string): string | null {
  // "오전/오후 N시 [M분]"
  const amPmMatch = text.match(AM_PM_TIME);
  if (amPmMatch) {
    const meridiem = (amPmMatch[1] ?? '').toLowerCase();
    let hour = parseInt(amPmMatch[2], 10);
    const min = parseInt(amPmMatch[3] ?? '0', 10);
    
    if (meridiem === '오후' || meridiem === 'pm') {
      if (hour < 12) hour += 12;
    } else if (meridiem === '오전' || meridiem === 'am') {
      if (hour === 12) hour = 0;
    } else {
      // No meridiem specified. Heuristic: 1-7 is likely PM (13-19) for business hours?
      // "2시 회의" -> 14:00. "11시 회의" -> 11:00. "9시 출근" -> 09:00.
      // Let's match typical business hours (09-18).
      // 1,2,3,4,5,6 -> 13,14,15,16,17,18.
      // 7,8,9,10,11,12 -> keep as is (AM/Noon).
      if (hour >= 1 && hour <= 6) {
        hour += 12;
      }
    }
    return `${pad2(hour)}:${pad2(min)}`;
  }

  // "HH:MM" or "오후 HH:MM"
  const clockMatch = text.match(CLOCK_TIME);
  if (clockMatch) {
    const meridiem = (clockMatch[1] ?? '').toLowerCase();
    let hour = parseInt(clockMatch[2], 10);
    const min = parseInt(clockMatch[3], 10);

    if (meridiem === '오후' || meridiem === 'pm') {
      if (hour < 12) hour += 12;
    } else if (meridiem === '오전' || meridiem === 'am') {
      if (hour === 12) hour = 0;
    } else {
        // Same heuristic for 2:30 vs 14:30?
        // "2:30" usually means 14:30 in business?
        // Let's apply the same 1-6 -> PM rule.
        if (hour >= 1 && hour <= 6) {
          hour += 12;
        }
    }
    return `${pad2(hour)}:${pad2(min)}`;
  }

  return null;
}

// 종류 파싱 ------------------------------------------------------------------

function parseKind(text: string): ScheduleKind {
  for (const [re, kind] of KIND_MAP) {
    if (re.test(text)) return kind;
  }
  return 'other';
}

// 제목 정제 ------------------------------------------------------------------

function extractTitle(text: string): string {
  let cleaned = text;
  for (const re of NOISE_TOKENS) {
    cleaned = cleaned.replace(re, ' ');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

// 메인 파서 ------------------------------------------------------------------

export function parseNaturalLanguageSchedule(
  input: string,
  now = new Date()
): ParsedSchedule {
  const text = input.trim();

  const rawDateStr = parseDate(text, now);
  const rawTimeStr = parseTime(text);
  
  // Default to today if time is provided but date isn't.
  // If neither, start is null (let user pick).
  // Exception: if text is empty, everything is empty.
  // Actually, if only title is provided ("Meeting"), we might want to default to today?
  // Let's stick to: if we found a Date OR a Time, we construct a scheduledStart.
  // If only Time found -> Date is Today.
  // If only Date found -> Time is 09:00 (default in logic below).
  
  let dateStr = rawDateStr;
  if (!dateStr && rawTimeStr) {
    dateStr = toDateStr(now);
  }

  const timeStr = rawTimeStr ?? '09:00';
  const scheduledStart = dateStr ? `${dateStr}T${timeStr}` : null;
  const scheduleKind = parseKind(text);
  const isImportant = IMPORTANT_RE.test(text);
  const title = extractTitle(text) || text;

  return { title, scheduledStart, scheduleKind, isImportant };
}

// 미리보기 레이블 ------------------------------------------------------------

const KIND_LABEL: Record<ScheduleKind, string> = {
  hearing: '기일',
  deadline: '마감',
  meeting: '회의',
  reminder: '리마인더',
  collection_visit: '방문',
  other: '기타',
};

export function formatParsedPreview(p: ParsedSchedule): string {
  const parts: string[] = [];
  if (p.scheduledStart) {
    const [datePart, timePart] = p.scheduledStart.split('T');
    parts.push(`📅 ${datePart}`);
    if (timePart) parts.push(`⏰ ${timePart}`);
  }
  parts.push(`🏷️ ${KIND_LABEL[p.scheduleKind]}`);
  if (p.isImportant) parts.push('⭐ 중요');
  if (p.title) parts.push(`"${p.title}"`);
  return parts.join('  ');
}
