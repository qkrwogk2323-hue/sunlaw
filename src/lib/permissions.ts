import type {
  AuthContext,
  Membership,
  MembershipPermissionOverride,
  PermissionKey,
  PermissionSet
} from '@/lib/types';

export const PERMISSION_GROUPS = {
  organization: ['team_invite', 'team_permission_manage', 'organization_settings_manage', 'user_manage'],
  cases: ['case_create', 'case_edit', 'case_delete', 'case_assign', 'case_stage_manage'],
  documents: ['document_create', 'document_edit', 'document_approve', 'document_share', 'document_export'],
  requests: ['request_create', 'request_manage', 'request_close'],
  schedules: ['schedule_create', 'schedule_edit', 'schedule_confirm', 'schedule_manage', 'calendar_export'],
  billing: ['billing_view', 'billing_issue', 'billing_payment_confirm', 'billing_export', 'billing_manage'],
  collection: ['collection_view', 'collection_contact_manage', 'collection_payment_plan_manage', 'collection_payment_confirm', 'collection_metrics_view', 'collection_manage'],
  legalSupport: ['legal_request_create', 'legal_progress_view'],
  legalExecution: ['legal_document_create', 'legal_document_approve', 'legal_filing_manage', 'asset_inquiry_execute'],
  notifications: ['notification_create'],
  reports: ['report_view', 'report_export', 'case_board_export'],
  compensation: ['collection_compensation_view_self', 'collection_compensation_view_team', 'collection_compensation_view_org', 'collection_compensation_manage_plan', 'collection_compensation_fix_plan', 'collection_compensation_export'],
  settlement: ['settlement_view', 'settlement_manage', 'settlement_export']
} as const satisfies Record<string, PermissionKey[]>;

export const PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSION_GROUPS).flat();

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  team_invite: '직원 초대',
  team_permission_manage: '권한 관리',
  organization_settings_manage: '조직 설정 관리',
  case_create: '사건 생성',
  case_edit: '사건 수정',
  case_delete: '사건 삭제',
  case_assign: '사건 배정',
  case_stage_manage: '사건 단계 관리',
  document_create: '문서 생성',
  document_edit: '문서 수정',
  document_approve: '문서 결재',
  document_share: '문서 공유',
  document_export: '문서 내보내기',
  request_create: '요청 생성',
  request_manage: '요청 처리',
  request_close: '요청 종료',
  schedule_create: '일정 생성',
  schedule_edit: '일정 수정',
  schedule_confirm: '일정 확정',
  schedule_manage: '일정 관리',
  calendar_export: '캘린더 내보내기',
  billing_view: 'Billing 조회',
  billing_issue: '청구 발행',
  billing_payment_confirm: '입금 확인',
  billing_export: 'Billing 내보내기',
  billing_manage: '청구/입금 관리',
  collection_view: '추심 현황 조회',
  collection_contact_manage: '추심 연락 관리',
  collection_payment_plan_manage: '분납 약정 관리',
  collection_payment_confirm: '회수 입금 반영',
  collection_metrics_view: '회수 지표 조회',
  collection_manage: '추심 관리',
  legal_request_create: '법률 지원 요청 생성',
  legal_progress_view: '법률 진행 조회',
  legal_document_create: '법률 문서 생성',
  legal_document_approve: '법률 문서 승인',
  legal_filing_manage: '소송/집행 진행 관리',
  asset_inquiry_execute: '재산조회/명시 실행',
  notification_create: '알림 생성',
  report_view: '리포트 조회',
  report_export: '리포트 내보내기',
  case_board_export: '사건 현황판 내보내기',
  collection_compensation_view_self: '본인 성과/보수 조회',
  collection_compensation_view_team: '팀 성과/보수 조회',
  collection_compensation_view_org: '조직 성과/보수 조회',
  collection_compensation_manage_plan: '보수 규칙 관리',
  collection_compensation_fix_plan: '보수 규칙 확정',
  collection_compensation_export: '성과/보수 내보내기',
  settlement_view: '정산 조회',
  settlement_manage: '정산 관리',
  settlement_export: '정산 내보내기',
  user_manage: '직원 관리'
};

export const TEMPLATE_LABELS: Record<string, string> = {
  org_admin: '조직관리자',
  org_staff: '조직원',
  admin_general: '관리자',
  lawyer: '변호사',
  office_manager: '사무장',
  collection_agent: '추심직원',
  intern_readonly: '인턴/열람전용'
};

const templates: Record<string, PermissionSet> = {
  org_admin: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionSet,
  org_staff: {
    ...({} as PermissionSet),
    case_create: true,
    case_edit: true,
    document_create: true,
    request_create: true,
    request_manage: true,
    schedule_create: true,
    schedule_edit: true,
    schedule_manage: true,
    billing_view: true,
    collection_view: true,
    report_view: true
  },
  admin_general: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionSet,
  lawyer: {
    case_create: true,
    case_edit: true,
    case_assign: true,
    case_stage_manage: true,
    document_create: true,
    document_edit: true,
    document_approve: true,
    document_share: true,
    request_create: true,
    request_manage: true,
    request_close: true,
    schedule_create: true,
    schedule_edit: true,
    schedule_confirm: true,
    billing_view: true,
    legal_request_create: true,
    legal_progress_view: true,
    legal_document_create: true,
    legal_document_approve: true,
    legal_filing_manage: true,
    asset_inquiry_execute: true,
    report_view: true,
    case_board_export: true
  },
  office_manager: {
    case_create: true,
    case_edit: true,
    case_assign: true,
    document_create: true,
    document_edit: true,
    document_share: true,
    request_create: true,
    request_manage: true,
    request_close: true,
    schedule_create: true,
    schedule_edit: true,
    schedule_confirm: true,
    schedule_manage: true,
    billing_view: true,
    billing_issue: true,
    billing_payment_confirm: true,
    billing_export: true,
    billing_manage: true,
    notification_create: true,
    report_view: true,
    case_board_export: true
  },
  collection_agent: {
    case_edit: true,
    request_create: true,
    request_manage: true,
    request_close: true,
    schedule_create: true,
    schedule_edit: true,
    billing_view: true,
    collection_view: true,
    collection_contact_manage: true,
    collection_payment_plan_manage: true,
    collection_payment_confirm: true,
    collection_metrics_view: true,
    legal_request_create: true,
    legal_progress_view: true,
    collection_compensation_view_self: true,
    case_board_export: true
  },
  intern_readonly: {
    report_view: true,
    collection_view: true,
    collection_metrics_view: true,
    billing_view: true
  },
  org_owner: Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionSet,
  org_manager: {
    ...({} as PermissionSet),
    case_create: true,
    case_edit: true,
    case_assign: true,
    document_create: true,
    document_edit: true,
    document_approve: true,
    document_share: true,
    request_create: true,
    request_manage: true,
    request_close: true,
    schedule_create: true,
    schedule_edit: true,
    schedule_confirm: true,
    schedule_manage: true,
    billing_view: true,
    billing_issue: true,
    billing_payment_confirm: true,
    billing_export: true,
    billing_manage: true,
    collection_view: true,
    collection_manage: true,
    notification_create: true,
    report_view: true,
    report_export: true,
    case_board_export: true,
    user_manage: true
  },
};

function applyOverrides(base: PermissionSet, overrides?: MembershipPermissionOverride[] | null, legacy?: PermissionSet | null): PermissionSet {
  const next = { ...base, ...(legacy ?? {}) } as PermissionSet;
  for (const override of overrides ?? []) {
    next[override.permission_key] = override.effect === 'grant';
  }
  return next;
}

export function resolveMembershipPermissions(membership: Membership | null | undefined): PermissionSet {
  if (!membership) return {} as PermissionSet;
  const template = templates[membership.permission_template_key ?? ''] ?? templates[membership.role] ?? ({} as PermissionSet);
  return applyOverrides(template, membership.permission_overrides, membership.permissions);
}

export function hasPermission(auth: AuthContext, organizationId: string | null | undefined, permission: PermissionKey) {
  if (!organizationId) return false;
  const membership = auth.memberships.find((item) => item.organization_id === organizationId) ?? null;
  if (!membership) return false;
  return Boolean(resolveMembershipPermissions(membership)[permission]);
}

export function isWorkspaceAdmin(membership: Membership | null | undefined) {
  return Boolean(membership && membership.actor_category === 'admin');
}

export function getDefaultTemplatePermissions(templateKey: string): PermissionSet {
  return { ...(templates[templateKey] ?? {}) };
}
