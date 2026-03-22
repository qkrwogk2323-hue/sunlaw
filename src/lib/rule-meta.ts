/**
 * rule-meta.ts
 * 선언형 규칙 메타데이터 타입 정의 (PROJECT_RULES.md 기반)
 *
 * 페이지/액션/AI 파일 상단에 @rule-meta-start ... @rule-meta-end 주석 블록으로 선언하면
 * CI scripts/check-rule-meta.mjs가 이를 파싱해 강제 검사합니다.
 */

// ─── Surface & Org 분류 ────────────────────────────────────────────────────────

/** 기능이 노출되는 대상 범위 */
export type SurfaceScope = 'common' | 'platform' | 'tenant' | 'portal';

/** 사용자 조직 세부 유형 */
export type OrgType = 'law_firm' | 'credit_company' | 'general_business' | 'others';

/** 감사 추적 엔터티 */
export type TraceEntity =
  | 'organization_request'
  | 'organization'
  | 'subscription'
  | 'case'
  | 'client'
  | 'billing'
  | 'document'
  | 'request'
  | 'schedule'
  | 'collection'
  | 'hub'
  | 'none';

// ─── Page 메타 ─────────────────────────────────────────────────────────────────

/** 페이지 규칙 메타데이터 (예: src/app/.../page.tsx에 선언) */
export interface PageRuleMeta {
  /** 노출 범위 */
  surfaceScope: SurfaceScope;
  /** 허용 조직 유형 (미지정 = 전체 허용) */
  orgTypes?: OrgType[];
  /** 인증 필요 여부 */
  requiresAuth: boolean;
  /** 현재 상태 + 감사 이력 진입 경로 필요 여부 */
  requiresTraceability: boolean;
  /** 추적 대상 엔터티 */
  traceEntity: TraceEntity;
  /** 이력/감사로그 링크 경로 */
  historyPath?: string;
  /** 현재 상태 링크 경로 */
  currentStatePath?: string;
  /** AI 기능 포함 여부 */
  allowsAi?: boolean;
  /** 포함된 AI feature 식별자 목록 */
  aiFeatures?: string[];
}

// ─── Action 메타 ───────────────────────────────────────────────────────────────

/** 서버 액션 규칙 메타데이터 (예: src/lib/actions/... 에 선언) */
export interface ActionRuleMeta {
  /** 적용 범위 */
  actionScope: SurfaceScope;
  /** 허용 조직 유형 */
  orgTypes?: OrgType[];
  /** 서버 권한 가드 필수 여부 */
  requiresAuthGuard: boolean;
  /** 감사 로그 기록 필수 여부 */
  requiresAuditLog: boolean;
  /** 영향 받는 엔터티 목록 */
  affectedEntities: string[];
  /** 필수 테스트 경로 */
  requiredTests: Array<'happy' | 'error' | 'auth' | 'regression'>;
  /** revalidatePath 대상 */
  revalidateTargets?: string[];
}

// ─── AI 메타 ───────────────────────────────────────────────────────────────────

/** AI 답변 타입 제한 */
export type AiAnswerType =
  | 'menu_link'
  | 'status_summary'
  | 'next_action'
  | 'draft_text'
  | 'checklist';

/** AI 기능 규칙 메타데이터 (예: src/lib/ai/... 에 선언) */
export interface AiRuleMeta {
  /** AI 기능 식별자 */
  feature: string;
  /** 노출 범위 */
  surfaceScope: SurfaceScope;
  /** 허용 조직 유형 */
  orgTypes?: OrgType[];
  /** 허용 답변 타입 (이 외 답변 생성 금지) */
  allowedAnswerTypes: AiAnswerType[];
  /** 민감정보 마스킹 필수 */
  requiresRedaction: boolean;
  /** 권한 범위 데이터 제한 필수 */
  requiresScopeCheck: boolean;
  /** source 메타데이터 반환 필수 */
  requiresSourceMeta: boolean;
  /** requestId 반환 필수 */
  requiresRequestId: boolean;
  /** modelVersion 반환 필수 */
  requiresModelVersion: boolean;
  /** 피드백 UI 연결 필수 */
  requiresFeedback: boolean;
  /** 자동 mutation 금지 (항상 false) */
  allowsMutation: false;
}

// ─── 파싱 유틸 ────────────────────────────────────────────────────────────────

/**
 * 파일 내용에서 @rule-meta-start ... @rule-meta-end 블록을 파싱해 key-value 객체로 반환
 * CI 스크립트에서 사용
 */
export function parseRuleMetaBlock(fileContent: string): Record<string, string> | null {
  const match = fileContent.match(/@rule-meta-start\s*([\s\S]*?)@rule-meta-end/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.trim().match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}
