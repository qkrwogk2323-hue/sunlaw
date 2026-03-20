export type HubReadinessInput = {
  primaryClientId: string | null;
  visibilityScope: string | null;
  memberCount: number;
  collaboratorCount: number;
  collaboratorLimit: number;
  lifecycleStatus: string | null;
};

export type HubReadinessScore = {
  score: number;
  percent: number;
  setupReady: boolean;
  policyReady: boolean;
  capacityRatio: number;
};

const SLOT_COUNTS = [6, 8, 10, 12] as const;

export function calculateHubReadiness(input: HubReadinessInput): HubReadinessScore {
  const setupReady = Boolean(
    input.primaryClientId &&
    input.visibilityScope &&
    input.memberCount > 0
  );
  const policyReady = Boolean(
    input.visibilityScope &&
    ['organization', 'private', 'custom'].includes(input.visibilityScope) &&
    input.lifecycleStatus !== 'soft_deleted'
  );
  const capacityRatio = input.collaboratorLimit > 0
    ? Math.min(1, input.collaboratorCount / input.collaboratorLimit)
    : 0;
  const score = 0.6 * capacityRatio + 0.2 * (setupReady ? 1 : 0) + 0.2 * (policyReady ? 1 : 0);

  return {
    score,
    percent: Math.round(score * 100),
    setupReady,
    policyReady,
    capacityRatio
  };
}

export function formatHubRelativeActivity(isoString: string | null): string {
  if (!isoString) return '활동 없음';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export function normalizeSlotCount(limit: number): number {
  const safeLimit = Math.max(1, limit);
  return SLOT_COUNTS.find((count) => safeLimit <= count) ?? 12;
}

export function getHubReadinessStateLabel(percent: number): string {
  if (percent < 40) return '설정 필요';
  if (percent < 70) return '참여자 구성 중';
  if (percent < 100) return '준비 완료';
  return '협업 가능';
}
