export const CASE_STAGE_OPTIONS = [
  { key: 'intake', label: '접수' },
  { key: 'review', label: '검토 중' },
  { key: 'revision_wait', label: '수정 요청 대기' },
  { key: 'client_reply_wait', label: '의뢰인 답변 대기' },
  { key: 'recheck', label: '재검토 중' },
  { key: 'done', label: '완료' }
] as const;

export type CaseStageKey = (typeof CASE_STAGE_OPTIONS)[number]['key'];

const CASE_STAGE_LABEL_MAP = new Map<string, string>(CASE_STAGE_OPTIONS.map((item) => [item.key, item.label]));

export function getCaseStageLabel(stageKey?: string | null) {
  if (!stageKey) return '단계 미설정';
  return CASE_STAGE_LABEL_MAP.get(stageKey) ?? stageKey;
}

export function isCaseStageStale(updatedAt?: string | null, staleDays = 7) {
  if (!updatedAt) return false;
  const updatedTs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedTs)) return false;
  return Date.now() - updatedTs >= staleDays * 24 * 60 * 60 * 1000;
}
