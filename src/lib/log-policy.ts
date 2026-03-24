/**
 * 로그 정책 중앙 정의 (log-policy.ts)
 *
 * 무엇을 로그로 남길지, 어디서 볼지, 얼마나 오래 보관할지를 이 파일에서 관리한다.
 * 버튼·API·화면이 모두 이 정책을 단일 원본으로 참조한다.
 */

// ─── 계층 분류 ────────────────────────────────────────────────
export type LogImportance =
  | 'critical'   // 핵심 감사 로그: 법적·권한·금전·계정 분쟁 근거. 절대 누락 불가.
  | 'business'   // 업무 이력 로그: 실무 흐름 추적용. 전부 남길 필요는 없음.
  | 'ops'        // 운영/배달 로그: 알림·초대 발송 등 단기 추적용.
  | 'ignore';    // 무시: 탭 클릭·검색 입력·단순 조회. 영구 저장 금지.

// ─── 화면(surface) 분류 ───────────────────────────────────────
export type LogSurface =
  | 'team'          // 구성원·초대·임시계정
  | 'clients'       // 의뢰인 정보·계정·초대
  | 'cases'         // 사건 상태·담당·문서·허브
  | 'billing'       // 청구·약정·입금·구독
  | 'collaboration' // 협업·허브·사건공유
  | 'platform'      // 플랫폼 전용 (구독 on/off, 잠금 등)
  | 'all';          // 관리자 보조용 전체 로그

// ─── 보관 기간 (일) ───────────────────────────────────────────
export const LOG_RETENTION_DAYS: Record<LogImportance, number> = {
  critical: 730,  // 2년
  business: 365,  // 1년
  ops: 60,        // 60일
  ignore: 0       // 저장 안 함
};

// ─── 이벤트 타입 목록 ─────────────────────────────────────────
export type LogEventType = (typeof LOG_EVENTS)[number]['action'];

export const LOG_EVENTS = [
  // 계정·권한 (critical)
  { action: 'staff_temp_credential.issued',    importance: 'critical', surface: 'team',       summary: '직원 임시계정 발급' },
  { action: 'staff_temp_credential.reissued',  importance: 'critical', surface: 'team',       summary: '직원 임시계정 재발급' },
  { action: 'staff_temp_credential.revoked',   importance: 'critical', surface: 'team',       summary: '직원 임시계정 폐기' },
  { action: 'client_temp_credential.issued',   importance: 'critical', surface: 'clients',    summary: '의뢰인 임시계정 발급' },
  { action: 'client_temp_credential.reissued', importance: 'critical', surface: 'clients',    summary: '의뢰인 임시계정 재발급' },
  { action: 'client_temp_credential.revoked',  importance: 'critical', surface: 'clients',    summary: '의뢰인 임시계정 폐기' },
  { action: 'member.invited',                  importance: 'critical', surface: 'team',       summary: '구성원 초대 생성' },
  { action: 'member.invitation_resent',        importance: 'ops',      surface: 'team',       summary: '초대 재발송' },
  { action: 'member.invitation_revoked',       importance: 'critical', surface: 'team',       summary: '초대 철회' },
  { action: 'member.role_changed',             importance: 'critical', surface: 'team',       summary: '역할 변경' },
  { action: 'member.permission_changed',       importance: 'critical', surface: 'team',       summary: '권한 변경' },
  { action: 'member.removed',                  importance: 'critical', surface: 'team',       summary: '구성원 제거' },
  { action: 'member.password_reset_flagged',   importance: 'critical', surface: 'team',       summary: '비밀번호 강제변경 설정' },

  // 사건 (critical)
  { action: 'case.created',                    importance: 'critical', surface: 'cases',      summary: '사건 생성' },
  { action: 'case.updated',                    importance: 'business', surface: 'cases',      summary: '사건 수정' },
  { action: 'case.status_changed',             importance: 'critical', surface: 'cases',      summary: '사건 상태 변경' },
  { action: 'case.soft_deleted',               importance: 'critical', surface: 'cases',      summary: '사건 삭제함 이동' },
  { action: 'case.restored',                   importance: 'critical', surface: 'cases',      summary: '사건 복구' },
  { action: 'case.archived',                   importance: 'critical', surface: 'cases',      summary: '사건 최종 보관' },
  { action: 'case.handler_changed',            importance: 'critical', surface: 'cases',      summary: '담당자 변경' },
  { action: 'case.created_via_csv',            importance: 'business', surface: 'cases',      summary: 'CSV 사건 일괄 등록' },
  { action: 'case.hub_linked',                 importance: 'business', surface: 'cases',      summary: '허브 연결' },
  { action: 'case.hub_unlinked',               importance: 'business', surface: 'cases',      summary: '허브 연결 해제' },
  { action: 'document.added',                  importance: 'business', surface: 'cases',      summary: '문서 추가' },
  { action: 'document.deleted',                importance: 'critical', surface: 'cases',      summary: '문서 삭제' },
  { action: 'document.approved',               importance: 'critical', surface: 'cases',      summary: '문서 승인' },
  { action: 'document.rejected',               importance: 'critical', surface: 'cases',      summary: '문서 반려' },

  // 비용·계약 (critical)
  { action: 'billing.item_created',            importance: 'critical', surface: 'billing',    summary: '청구 항목 생성' },
  { action: 'billing.item_updated',            importance: 'critical', surface: 'billing',    summary: '청구 항목 수정' },
  { action: 'billing.item_deleted',            importance: 'critical', surface: 'billing',    summary: '청구 항목 삭제' },
  { action: 'billing.payment_recorded',        importance: 'critical', surface: 'billing',    summary: '입금 기록' },
  { action: 'billing.payment_corrected',       importance: 'critical', surface: 'billing',    summary: '입금 정정' },
  { action: 'subscription.enabled',            importance: 'critical', surface: 'platform',   summary: '구독 활성화' },
  { action: 'subscription.disabled',           importance: 'critical', surface: 'platform',   summary: '구독 비활성화' },
  { action: 'subscription.expiry_changed',     importance: 'critical', surface: 'platform',   summary: '구독 만료일 변경' },
  { action: 'subscription.locked',             importance: 'critical', surface: 'platform',   summary: '서비스 잠금' },
  { action: 'subscription.unlocked',           importance: 'critical', surface: 'platform',   summary: '서비스 잠금 해제' },

  // 협업 (business/critical)
  { action: 'collaboration.proposed',          importance: 'business', surface: 'collaboration', summary: '조직협업 제안' },
  { action: 'collaboration.accepted',          importance: 'critical', surface: 'collaboration', summary: '협업 승인' },
  { action: 'collaboration.rejected',          importance: 'critical', surface: 'collaboration', summary: '협업 거절' },
  { action: 'hub.created',                     importance: 'business', surface: 'collaboration', summary: '허브 생성' },
  { action: 'hub.joined',                      importance: 'business', surface: 'collaboration', summary: '허브 참여' },
  { action: 'hub.left',                        importance: 'business', surface: 'collaboration', summary: '허브 이탈' },
  { action: 'case.shared',                     importance: 'critical', surface: 'collaboration', summary: '사건 공유' },
  { action: 'case.share_revoked',              importance: 'critical', surface: 'collaboration', summary: '사건 공유 해제' },
] as const satisfies ReadonlyArray<{
  action: string;
  importance: LogImportance;
  surface: LogSurface;
  summary: string;
}>;

// ─── 조회 유틸 ────────────────────────────────────────────────

/** surface 기준으로 해당하는 action 목록 반환 */
export function getActionsForSurface(surface: LogSurface): string[] {
  if (surface === 'all') return LOG_EVENTS.map((e) => e.action);
  return LOG_EVENTS.filter((e) => e.surface === surface).map((e) => e.action);
}

/** action 문자열로 정책 항목 조회 */
export function getLogEventPolicy(action: string) {
  return LOG_EVENTS.find((e) => e.action === action) ?? null;
}

/** surface의 한국어 라벨 */
export const SURFACE_LABELS: Record<LogSurface, string> = {
  team:          '구성원·초대·임시계정',
  clients:       '의뢰인 정보·계정·초대',
  cases:         '사건 상태·담당·문서·허브',
  billing:       '청구·약정·입금·구독',
  collaboration: '협업·허브·사건공유',
  platform:      '플랫폼 전용',
  all:           '전체 로그 (관리자)',
};
