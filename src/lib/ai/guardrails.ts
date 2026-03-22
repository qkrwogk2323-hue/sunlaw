import { createHash } from 'node:crypto';

export type AiResponseSourceMeta = {
  dataType: string;
  generatedAt: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?82[-\s]?)?(?:01[0-9]|0[2-6][0-9]?)[-\s]?\d{3,4}[-\s]?\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const ACCOUNT_RE = /\b\d{2,4}[-\s]?\d{2,6}[-\s]?\d{4,8}\b/g;
const RESIDENT_RE = /\b\d{6}[-\s]?[1-4]\d{6}\b/g;
const TOKEN_RE = /\b(?:sk|pk|ghp|xoxb|xoxp|AIza|AKIA)[A-Za-z0-9_\-]{8,}\b/g;
const SESSION_RE = /\b(?:session|sess|sid|token|bearer|authorization)\s*[:=]\s*[A-Za-z0-9\-_.=]{8,}\b/gi;

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
  SESSION_RE.lastIndex = 0;
  return (
    EMAIL_RE.test(text)
    || PHONE_RE.test(text)
    || CARD_RE.test(text)
    || ACCOUNT_RE.test(text)
    || RESIDENT_RE.test(text)
    || TOKEN_RE.test(text)
    || SESSION_RE.test(text)
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
  next = next.replace(SESSION_RE, (v) => {
    const [k] = v.split(/[:=]/);
    return `${k}=********`;
  });
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
  dataType: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
}): AiResponseSourceMeta {
  return {
    dataType: input.dataType,
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    filters: input.filters
  };
}

export function hashForAudit(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
