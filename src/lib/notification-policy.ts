/**
 * notification-policy.ts — 알림 수신자 범위 및 목적지 규칙 단일 원본
 *
 * 사용 기준 (PROJECT_RULES 4-5, 4-6, 4-7):
 *   notification_type → recipient_scope → destination_rule
 *
 * 제품군별 규칙:
 *   - law / collection: 조직 내부 관리자(org_owner, org_manager) + 담당자
 *   - general_org: 연결된 조직 관리자
 *   - client_portal: 의뢰인 본인 + 연결 조직 관리자
 *   - platform: 플랫폼 운영 콘솔 전용 (일반 사용자 화면 노출 금지)
 */

// ─── 알림 타입 상수 ───────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  // 비용/청구
  BILLING_ENTRY_CREATED: 'billing_entry_created',
  BILLING_NOTICE: 'billing_notice',
  FEE_AGREEMENT_CREATED: 'fee_agreement_created',
  INSTALLMENT_ROUNDS_EXTENDED: 'installment_rounds_extended',
  INSTALLMENT_SHORTAGE_MERGED: 'installment_shortage_merged',
  PAYMENT_RECORDED: 'payment_recorded',

  // 사건
  CASE_CREATED: 'case_created',
  CASE_LINKED_CLIENT: 'case_linked_client',
  CASE_STAGE_CHANGED: 'case_stage_changed',
  CASE_ASSIGNED: 'case_assigned',

  // 협업
  HUB_INVITED: 'hub_invited',
  HUB_MESSAGE_RECEIVED: 'hub_message_received',
  COLLABORATION_REQUEST: 'collaboration_request',

  // 온보딩
  STAFF_PROFILE_INCOMPLETE: 'staff_profile_incomplete',
  CLIENT_PROFILE_INCOMPLETE: 'client_profile_incomplete',

  // 채널
  KAKAO_CHANNEL_NOTICE: 'kakao_channel_notice',

  // 플랫폼 전용 (일반 사용자 화면 노출 금지)
  PLATFORM_BUG_ALERT: 'platform_bug_alert',
  PLATFORM_ORG_REVIEW: 'platform_org_review',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ─── 수신자 범위 ──────────────────────────────────────────────────────────
export type RecipientScope =
  | 'org_managers'          // 조직 내 org_owner + org_manager
  | 'org_assigned'          // 사건 담당자
  | 'org_managers_and_assigned' // 관리자 + 담당자
  | 'client_self'           // 의뢰인 본인
  | 'client_self_and_linked_managers' // 의뢰인 본인 + 연결 조직 관리자
  | 'platform_only';        // 플랫폼 콘솔 전용

// ─── 목적지 규칙 ─────────────────────────────────────────────────────────
export type DestinationScope =
  | 'internal'      // 일반 조직 화면 (/cases, /billing 등)
  | 'portal'        // 의뢰인 포털 (/portal/*)
  | 'platform';     // 플랫폼 콘솔 (/admin/*)

export type NotificationPolicy = {
  recipientScope: RecipientScope;
  destinationScope: DestinationScope;
  /** 의뢰인 포털 목적지 경로 패턴 (portal scope일 때) */
  portalHrefTemplate?: string;
  /** 내부 목적지 경로 패턴 (internal scope일 때) */
  internalHrefTemplate?: string;
};

// ─── 타입별 정책 표 (단일 원본) ───────────────────────────────────────────
export const NOTIFICATION_POLICY: Record<NotificationType, NotificationPolicy> = {
  [NOTIFICATION_TYPES.BILLING_ENTRY_CREATED]: {
    recipientScope: 'org_managers_and_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/billing',
  },
  [NOTIFICATION_TYPES.BILLING_NOTICE]: {
    recipientScope: 'org_managers_and_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/billing',
  },
  [NOTIFICATION_TYPES.FEE_AGREEMENT_CREATED]: {
    recipientScope: 'org_managers_and_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/billing',
  },
  [NOTIFICATION_TYPES.INSTALLMENT_ROUNDS_EXTENDED]: {
    recipientScope: 'client_self_and_linked_managers',
    destinationScope: 'portal',
    portalHrefTemplate: '/portal/cases/:caseId',
  },
  [NOTIFICATION_TYPES.INSTALLMENT_SHORTAGE_MERGED]: {
    recipientScope: 'client_self_and_linked_managers',
    destinationScope: 'portal',
    portalHrefTemplate: '/portal/cases/:caseId',
  },
  [NOTIFICATION_TYPES.PAYMENT_RECORDED]: {
    recipientScope: 'org_managers_and_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/billing',
  },
  [NOTIFICATION_TYPES.CASE_CREATED]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/cases/:caseId',
  },
  [NOTIFICATION_TYPES.CASE_LINKED_CLIENT]: {
    recipientScope: 'client_self_and_linked_managers',
    destinationScope: 'portal',
    portalHrefTemplate: '/portal/cases/:caseId',
  },
  [NOTIFICATION_TYPES.CASE_STAGE_CHANGED]: {
    recipientScope: 'org_managers_and_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/cases/:caseId',
  },
  [NOTIFICATION_TYPES.CASE_ASSIGNED]: {
    recipientScope: 'org_assigned',
    destinationScope: 'internal',
    internalHrefTemplate: '/cases/:caseId',
  },
  [NOTIFICATION_TYPES.HUB_INVITED]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/inbox',
  },
  [NOTIFICATION_TYPES.HUB_MESSAGE_RECEIVED]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/inbox/:hubId',
  },
  [NOTIFICATION_TYPES.COLLABORATION_REQUEST]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/organizations',
  },
  [NOTIFICATION_TYPES.STAFF_PROFILE_INCOMPLETE]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/settings/team',
  },
  [NOTIFICATION_TYPES.CLIENT_PROFILE_INCOMPLETE]: {
    recipientScope: 'client_self_and_linked_managers',
    destinationScope: 'portal',
    portalHrefTemplate: '/portal',
  },
  [NOTIFICATION_TYPES.KAKAO_CHANNEL_NOTICE]: {
    recipientScope: 'org_managers',
    destinationScope: 'internal',
    internalHrefTemplate: '/notifications',
  },
  [NOTIFICATION_TYPES.PLATFORM_BUG_ALERT]: {
    recipientScope: 'platform_only',
    destinationScope: 'platform',
    internalHrefTemplate: '/admin/audit',
  },
  [NOTIFICATION_TYPES.PLATFORM_ORG_REVIEW]: {
    recipientScope: 'platform_only',
    destinationScope: 'platform',
    internalHrefTemplate: '/admin/organization-requests',
  },
};

/**
 * 특정 notification_type이 플랫폼 전용인지 확인.
 * isPlatformOnlyHref()와 함께 사용해 의뢰인/일반조직에 노출 방지.
 */
export function isPlatformOnlyNotification(type: string): boolean {
  const policy = NOTIFICATION_POLICY[type as NotificationType];
  return policy?.destinationScope === 'platform' || policy?.recipientScope === 'platform_only';
}

/**
 * 특정 notification_type의 목적지 경로가 의뢰인 포털인지 확인.
 * destination_url 생성 시 /portal/* 여부를 결정할 때 사용.
 */
export function isClientPortalNotification(type: string): boolean {
  const policy = NOTIFICATION_POLICY[type as NotificationType];
  return policy?.destinationScope === 'portal';
}

/**
 * 목적지 URL 빌드 헬퍼.
 * template의 :caseId, :hubId 등을 params로 치환.
 */
export function buildNotificationDestinationUrl(
  type: NotificationType,
  params: Record<string, string> = {}
): string {
  const policy = NOTIFICATION_POLICY[type];
  const template = policy.destinationScope === 'portal'
    ? (policy.portalHrefTemplate ?? '/portal')
    : (policy.internalHrefTemplate ?? '/notifications');
  return template.replace(/:([a-zA-Z]+)/g, (_, key) => params[key] ?? `[${key}]`);
}
