import { createHash } from 'node:crypto';

export const AI_FEATURE_IDS = [
  'home_ai_assistant',
  'ai_summary_card',
  'next_action_recommendation',
  'draft_assist',
  'anomaly_alert',
  'admin_copilot'
] as const;

export type AiFeatureId = (typeof AI_FEATURE_IDS)[number];

export type AiSourceLink = {
  label: string;
  href: string;
};

export type AiResponseSourceMeta = {
  feature: AiFeatureId;
  dataType: string;
  generatedAt: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
  links: AiSourceLink[];
  estimated: boolean;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?82[-\s]?)?(?:01[0-9]|0[2-6][0-9]?)[-\s]?\d{3,4}[-\s]?\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const ACCOUNT_RE = /\b\d{2,4}[-\s]?\d{2,6}[-\s]?\d{4,8}\b/g;
const RESIDENT_RE = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const TOKEN_RE = /\b(?:sk|pk|ghp|xoxb|xoxp|AIza|AKIA)[A-Za-z0-9_\-]{8,}\b/g;
const API_KEY_RE = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[A-Za-z0-9\-_.=]{8,}\b/gi;
const SESSION_RE = /\b(?:session|sess|sid|token|bearer|authorization)\s*[:=]\s*[A-Za-z0-9\-_.=]{8,}\b/gi;
const ADDRESS_RE = /\b(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n,]{4,}(?:로|길|동)\s*\d+(?:-\d+)?\b/g;

function maskWithPrefix(value: string, visiblePrefix = 3) {
  const compact = value.replace(/\s+/g, '');
  if (compact.length <= visiblePrefix) return '*'.repeat(Math.max(compact.length, 3));
  return `${compact.slice(0, visiblePrefix)}${'*'.repeat(Math.max(4, compact.length - visiblePrefix))}`;
}

export function containsSensitiveData(text: string) {
  EMAIL_RE.lastIndex = 0;
  PHONE_RE.lastIndex = 0;
  CARD_RE.lastIndex = 0;
  ACCOUNT_RE.lastIndex = 0;
  RESIDENT_RE.lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  API_KEY_RE.lastIndex = 0;
  SESSION_RE.lastIndex = 0;
  ADDRESS_RE.lastIndex = 0;
  return (
    EMAIL_RE.test(text)
    || PHONE_RE.test(text)
    || CARD_RE.test(text)
    || ACCOUNT_RE.test(text)
    || RESIDENT_RE.test(text)
    || TOKEN_RE.test(text)
    || API_KEY_RE.test(text)
    || SESSION_RE.test(text)
    || ADDRESS_RE.test(text)
  );
}

export function maskSensitiveText(text: string) {
  let next = text;
  next = next.replace(EMAIL_RE, (v) => {
    const [local, domain] = v.split('@');
    const localMasked = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`;
    return `${localMasked}@${domain}`;
  });
  next = next.replace(RESIDENT_RE, '******-*******');
  next = next.replace(PHONE_RE, (v) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length < 7) return '***-****';
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  });
  next = next.replace(CARD_RE, (v) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length < 8) return '****';
    return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
  });
  next = next.replace(ACCOUNT_RE, (v) => maskWithPrefix(v, 3));
  next = next.replace(TOKEN_RE, (v) => `${v.slice(0, 4)}********`);
  next = next.replace(API_KEY_RE, (v) => {
    const [k] = v.split(/[:=]/);
    return `${k}=********`;
  });
  next = next.replace(SESSION_RE, (v) => {
    const [k] = v.split(/[:=]/);
    return `${k}=********`;
  });
  next = next.replace(ADDRESS_RE, '[주소 마스킹]');
  return next;
}

export function sanitizeAiText(text: string) {
  return maskSensitiveText(text.trim());
}

export function sanitizeAiChecklist<T extends { label: string; detail: string }>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    label: sanitizeAiText(row.label),
    detail: sanitizeAiText(row.detail)
  }) as T);
}

export function buildAiSourceMeta(input: {
  feature: AiFeatureId;
  dataType: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
  links?: AiSourceLink[];
  estimated?: boolean;
}): AiResponseSourceMeta {
  return {
    feature: input.feature,
    dataType: input.dataType,
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    filters: input.filters,
    links: input.links ?? [],
    estimated: input.estimated ?? false
  };
}

export function hashForAudit(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function classifyAiFeedbackReason(reason: string) {
  const normalized = sanitizeAiText(reason).toLowerCase();

  if (/권한|접근|조직|타 조직|다른 조직|범위/.test(normalized)) return 'permission_filter';
  if (/민감|주민|계좌|카드|전화|이메일|주소|토큰|세션|api/.test(normalized)) return 'pii_masking';
  if (/출처|근거|링크|원문|어디서/.test(normalized)) return 'source_citation';
  if (/요약|틀렸|오답|잘못|환각|사실/.test(normalized)) return 'prompt_quality';
  return 'general_quality';
}
