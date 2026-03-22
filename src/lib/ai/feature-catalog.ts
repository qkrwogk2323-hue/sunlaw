import type { AiFeatureId } from '@/lib/ai/guardrails';

export const AI_AREA_IDS = [
  'home_ai',
  'draft_ai',
  'billing_contract_ai',
  'schedule_ai',
  'document_ai',
  'portal_ai',
  'platform_ai'
] as const;

export type AiAreaId = (typeof AI_AREA_IDS)[number];

export const AI_ANSWER_TYPES = [
  'menu_link',
  'status_summary',
  'next_action',
  'draft_text',
  'checklist'
] as const;

export type AiAnswerType = (typeof AI_ANSWER_TYPES)[number];

export type AiAreaSpec = {
  id: AiAreaId;
  label: string;
  organizationScope: 'platform' | 'organization' | 'portal' | 'common';
  description: string;
};

export const AI_OPERATION_DOMAIN_IDS = [
  'billing_contract',
  'schedule',
  'document',
  'hub',
  'client',
  'case',
  'platform'
] as const;

export type AiOperationDomainId = (typeof AI_OPERATION_DOMAIN_IDS)[number];

export type AiOperationDomainSpec = {
  id: AiOperationDomainId;
  label: string;
  allowedAnswerTypes: AiAnswerType[];
  allowedRoutes: string[];
};

export type AiFeaturePolicy = {
  feature: AiFeatureId;
  areaId: AiAreaId;
  label: string;
  allowedAnswerTypes: AiAnswerType[];
  allowedRoutes: string[];
  blocked: boolean;
  blockedReason?: string;
};

export const AI_AREA_CATALOG: Record<AiAreaId, AiAreaSpec> = {
  home_ai: {
    id: 'home_ai',
    label: '홈 AI',
    organizationScope: 'organization',
    description: '현재 상태 요약, 다음 할 일 추천, 관련 메뉴 안내만 담당합니다.'
  },
  draft_ai: {
    id: 'draft_ai',
    label: '작성 AI',
    organizationScope: 'organization',
    description: '메시지, 초대, 안내문 초안 작성만 담당합니다.'
  },
  billing_contract_ai: {
    id: 'billing_contract_ai',
    label: '비용·계약 AI',
    organizationScope: 'organization',
    description: '비용 상태 설명, 분납 안내, 계약 연결 안내만 담당합니다.'
  },
  schedule_ai: {
    id: 'schedule_ai',
    label: '일정 AI',
    organizationScope: 'organization',
    description: '일정 요약과 준비 목록만 담당합니다.'
  },
  document_ai: {
    id: 'document_ai',
    label: '문서 AI',
    organizationScope: 'organization',
    description: '문서 체크리스트와 문서 요약만 담당합니다.'
  },
  portal_ai: {
    id: 'portal_ai',
    label: '의뢰인 포털 AI',
    organizationScope: 'portal',
    description: '의뢰인에게 보이는 진행 안내와 제출 안내만 담당합니다.'
  },
  platform_ai: {
    id: 'platform_ai',
    label: '플랫폼 운영 AI',
    organizationScope: 'platform',
    description: '현재는 답변을 제공하지 않으며 운영 메뉴 직접 확인만 안내합니다.'
  }
};

export const AI_FEATURE_POLICY: Record<AiFeatureId, AiFeaturePolicy> = {
  home_ai_assistant: {
    feature: 'home_ai_assistant',
    areaId: 'home_ai',
    label: '홈 업무 도우미',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'next_action'],
    allowedRoutes: ['/dashboard', '/notifications', '/calendar', '/cases', '/clients', '/billing', '/contracts', '/case-hubs', '/inbox'],
    blocked: false
  },
  ai_summary_card: {
    feature: 'ai_summary_card',
    areaId: 'home_ai',
    label: '오늘의 요약 카드',
    allowedAnswerTypes: ['status_summary', 'menu_link'],
    allowedRoutes: ['/dashboard', '/notifications', '/calendar', '/billing'],
    blocked: false
  },
  next_action_recommendation: {
    feature: 'next_action_recommendation',
    areaId: 'home_ai',
    label: '다음 액션 추천',
    allowedAnswerTypes: ['next_action', 'menu_link'],
    allowedRoutes: ['/dashboard', '/notifications', '/calendar', '/clients', '/billing', '/cases'],
    blocked: false
  },
  draft_assist: {
    feature: 'draft_assist',
    areaId: 'draft_ai',
    label: '작성 보조',
    allowedAnswerTypes: ['draft_text'],
    allowedRoutes: ['/clients', '/inbox', '/case-hubs'],
    blocked: false
  },
  anomaly_alert: {
    feature: 'anomaly_alert',
    areaId: 'home_ai',
    label: '변동 안내',
    allowedAnswerTypes: ['status_summary', 'menu_link'],
    allowedRoutes: ['/dashboard', '/notifications', '/billing', '/calendar'],
    blocked: false
  },
  admin_copilot: {
    feature: 'admin_copilot',
    areaId: 'platform_ai',
    label: '운영 코파일럿',
    allowedAnswerTypes: [],
    allowedRoutes: ['/admin/organization-requests', '/admin/organizations', '/admin/support', '/settings/subscription'],
    blocked: true,
    blockedReason: '플랫폼 운영 판단과 조정은 AI가 답하지 않습니다.'
  },
  schedule_briefing: {
    feature: 'schedule_briefing',
    areaId: 'schedule_ai',
    label: '일정 브리핑',
    allowedAnswerTypes: ['status_summary', 'checklist', 'menu_link'],
    allowedRoutes: ['/calendar', '/calendar/worklog'],
    blocked: false
  },
  document_checklist: {
    feature: 'document_checklist',
    areaId: 'document_ai',
    label: '문서 체크리스트',
    allowedAnswerTypes: ['checklist', 'status_summary'],
    allowedRoutes: ['/documents', '/cases'],
    blocked: false
  },
  overdue_notice: {
    feature: 'overdue_notice',
    areaId: 'billing_contract_ai',
    label: '연체 안내 초안',
    allowedAnswerTypes: ['draft_text', 'status_summary', 'menu_link'],
    allowedRoutes: ['/billing', '/contracts', '/cases'],
    blocked: false
  }
};

export const AI_OPERATION_DOMAIN_CATALOG: Record<AiOperationDomainId, AiOperationDomainSpec> = {
  billing_contract: {
    id: 'billing_contract',
    label: '비용·계약',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'next_action'],
    allowedRoutes: ['/billing', '/contracts', '/cases']
  },
  schedule: {
    id: 'schedule',
    label: '일정',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'checklist'],
    allowedRoutes: ['/calendar', '/calendar/worklog']
  },
  document: {
    id: 'document',
    label: '문서',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'checklist'],
    allowedRoutes: ['/documents', '/cases']
  },
  hub: {
    id: 'hub',
    label: '허브·협업',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'next_action'],
    allowedRoutes: ['/case-hubs', '/inbox']
  },
  client: {
    id: 'client',
    label: '의뢰인',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'next_action'],
    allowedRoutes: ['/clients', '/cases']
  },
  case: {
    id: 'case',
    label: '사건',
    allowedAnswerTypes: ['menu_link', 'status_summary', 'next_action'],
    allowedRoutes: ['/cases', '/calendar', '/documents']
  },
  platform: {
    id: 'platform',
    label: '플랫폼 운영',
    allowedAnswerTypes: [],
    allowedRoutes: ['/admin/organization-requests', '/admin/organizations', '/admin/support', '/settings/subscription']
  }
};

export function getAiFeaturePolicy(feature: AiFeatureId) {
  return AI_FEATURE_POLICY[feature];
}

export function getAiAreaSpec(areaId: AiAreaId) {
  return AI_AREA_CATALOG[areaId];
}

export function getAiOperationDomainSpec(domainId: AiOperationDomainId) {
  return AI_OPERATION_DOMAIN_CATALOG[domainId];
}
