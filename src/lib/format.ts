const SEOUL_TIME_ZONE = 'Asia/Seoul';

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getDateTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour24: read('hour'),
    minute: read('minute')
  };
}

function formatMeridiemTime(hour24: string, minute: string) {
  const numericHour = Number(hour24);
  const period = numericHour < 12 ? '오전' : '오후';
  const hour12 = numericHour % 12 || 12;

  return `${period} ${String(hour12).padStart(2, '0')}:${minute}`;
}

export function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '-';

  const { year, month, day } = getDateTimeParts(date);
  return `${year}. ${month}. ${day}.`;
}

export function formatDateTime(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '-';

  const { year, month, day, hour24, minute } = getDateTimeParts(date);
  return `${year}. ${month}. ${day}. ${formatMeridiemTime(hour24, minute)}`;
}

export function formatNotificationDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return '-';

  const now = getDateTimeParts(new Date());
  const target = getDateTimeParts(date);
  const dateLabel = now.year === target.year
    ? `${target.month}. ${target.day}.`
    : `${target.year}. ${target.month}. ${target.day}.`;

  return `${dateLabel} ${formatMeridiemTime(target.hour24, target.minute)}`;
}

export function formatCurrency(value?: number | null) {
  const amount = value ?? 0;
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(amount);
}

export function normalizeBusinessNumber(value?: string | null) {
  return `${value ?? ''}`.replace(/\D/g, '');
}

export function isValidKoreanBusinessNumber(value?: string | null) {
  const digits = normalizeBusinessNumber(value);
  if (digits.length !== 10) return false;

  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
  const checksum = (10 - ((sum + Math.floor((Number(digits[8]) * 5) / 10)) % 10)) % 10;

  return checksum === Number(digits[9]);
}

export function formatBusinessNumber(value?: string | null) {
  const digits = normalizeBusinessNumber(value);
  if (digits.length !== 10) return value || '-';
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function normalizeResidentRegistrationNumber(value?: string | null) {
  return `${value ?? ''}`.replace(/\D/g, '');
}

export function formatResidentRegistrationNumberMasked(value?: string | null) {
  const digits = normalizeResidentRegistrationNumber(value);
  if (digits.length !== 13) return '***-******';
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
}

export function makeSlug(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'org';
}

export function buildCaseReference(organizationSlug: string, date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${organizationSlug.toUpperCase()}-${y}${m}${d}-${random}`;
}
