/**
 * [AI TEMPLATE] — 새 AI 기능을 만들 때 이 파일을 복사해서 시작하세요.
 * 사용법: cp src/templates/ai.template.ts src/lib/ai/your-ai-feature.ts
 *
 * RULE META (필수 — CI check:rule-meta 및 check:ai-guardrails가 검사합니다)
 * @rule-meta-start
 * aiFeature: your_feature_name
 * surfaceScope: tenant
 * orgTypes: law_firm
 * allowedAnswerTypes: status_summary,next_action
 * requiresRedaction: true
 * requiresScopeCheck: true
 * requiresSourceMeta: true
 * requiresRequestId: true
 * requiresModelVersion: true
 * requiresFeedback: true
 * allowsMutation: false
 * @rule-meta-end
 */

import { requireOrganizationActionAccess } from '@/lib/auth';

/** AI 답변 타입 — allowedAnswerTypes에 선언된 것만 사용 (Rule AI-3) */
type AnswerType = 'menu_link' | 'status_summary' | 'next_action' | 'draft_text' | 'checklist';

/** AI 응답 표준 구조 — source/requestId/modelVersion 필수 (Rule AI-4, AI-5) */
export interface AiResponse {
  answer: string;
  answerType: AnswerType;
  provider: string;
  requestId: string;
  modelVersion: string;
  source: Array<{
    kind: string;
    generatedAt: string;
    scope: string;
  }>;
}

export async function runYourAiFeature(input: {
  organizationId: string;
  question: string;
}): Promise<AiResponse> {
  // 1. 권한 검증 (Rule 1-1, AI-2)
  await requireOrganizationActionAccess(input.organizationId, {
    permission: 'case_edit', // 실제 필요 권한으로 교체
    errorMessage: 'AI 기능 접근 권한이 없습니다.',
  });

  // 2. 입력 민감정보 마스킹 (Rule AI-1)
  // const redactedQuestion = redactSensitiveInfo(input.question);

  // 3. 권한 범위 내 데이터만 조회 (Rule AI-2)
  // const scopedData = await getDataWithinScope(input.organizationId);

  // 4. AI 실행 (자동 실행 금지 — 사용자 확인 후 호출되어야 함, Rule AI-6)
  const answer = ''; // 실제 AI 답변 생성 로직

  // 5. allowedAnswerTypes 중 하나로만 분류 (Rule AI-3)
  const answerType: AnswerType = 'status_summary'; // allowedAnswerTypes에 맞게

  // 6. 표준 메타데이터 반환 (source/requestId/modelVersion 필수 — Rule AI-4, AI-5)
  return {
    answer,
    answerType,
    provider: 'rules', // 실제 제공자로 교체
    requestId: crypto.randomUUID(),
    modelVersion: 'rules-v1', // 실제 모델 버전으로 교체
    source: [
      {
        kind: 'your_data_source',
        generatedAt: new Date().toISOString(),
        scope: `organization:${input.organizationId}`,
      },
    ],
  };
}
