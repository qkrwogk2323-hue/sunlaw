# Vein Spiral — AI 기능별 정책표

> **Single Source of Truth for AI feature policies.**  
> 모든 AI 기능은 이 표를 기준으로 구현·검토됩니다.  
> 코드 기준: `src/lib/ai/feature-catalog.ts`

---

## 서비스 전제 정책

| 원칙 | 내용 |
|------|------|
| **원문 접근 원칙** | 조직원은 자신이 접근 가능한 사건/의뢰인 원문을 볼 수 있다. AI도 기능 수행에 필요한 원문은 볼 수 있다. |
| **최소 컨텍스트 원칙** | AI는 원문 전체가 아니라 기능 수행에 필요한 최소 원문 범위만 사용한다. 일괄 마스킹이 아닌 기능별 선택적 제거가 기본이다. |
| **공개 범위 분리 원칙** | 조직 내부 전용 AI 결과와 의뢰인 공개 가능 AI 결과는 반드시 분리된 생성 경로를 사용한다. |
| **자동 실행 금지 원칙** | 모든 AI 결과는 사용자 확인 후 반영한다. AI가 직접 DB에 쓰거나 상태를 바꾸는 자동 실행은 금지한다. |

---

## AI 4계층 아키텍처

```
[1] 접근제어 계층
    └─ requireOrganizationActionAccess() / requireAiAccess()
    └─ 역할: 누가 어떤 사건/의뢰인/문서에 접근 가능한지 먼저 결정
    └─ 규칙: AI 모델 호출보다 먼저 실행, RLS 범위 안에서만 데이터 조회

[2] 컨텍스트 빌더 계층
    └─ prepareAiContext(featureId, rawInput) in policy.ts
    └─ 역할: 기능별 정책에 따라 입력 원문 정리 (인증토큰 항상 제거, 주민번호·금융정보 조건부 제거)
    └─ 규칙: 문장 의미 보존, 불필요한 식별자만 제거

[3] AI 실행 계층
    └─ buildTaskPlan() / external LLM / rules fallback
    └─ 역할: 기능별 executionPath에 따라 rules_only / hybrid / trusted_llm / blocked 중 선택

[4] 출력 통제 계층
    └─ AiOutputMeta { visibility, clientVisible, internalOnly }
    └─ 역할: 결과를 누구에게 보여줄지, 의뢰인 노출 가능한지, 출처/requestId/감사로그 부여
```

---

## 기능별 정책표

| featureId | 그룹 | visibility | executionPath | 원문 허용 | 주민번호 제거 | 금융정보 제거 | 의뢰인 노출 |
|-----------|------|-----------|--------------|---------|------------|------------|-----------|
| `home_ai_assistant` | B | organization_internal | hybrid | ✅ | ✅ | ✅ | ❌ |
| `ai_summary_card` | B | organization_internal | hybrid | ✅ | ✅ | ✅ | ❌ |
| `next_action_recommendation` | B | organization_internal | hybrid | ✅ | ✅ | ✅ | ❌ |
| `draft_assist` | B | organization_internal | trusted_llm | ✅ | ✅ | ✅ | 변환본만 |
| `document_checklist` | B | organization_internal | trusted_llm | ✅ | ❌ (의도적) | ❌ (의도적) | ❌ |
| `schedule_briefing` | B | organization_internal | hybrid | ✅ | ✅ | ✅ | ❌ |
| `anomaly_alert` | A | organization_internal | rules_only | ❌ | ✅ | ✅ | ❌ |
| `portal_guide` | C | client_visible | rules_only | ❌ | ✅ | ✅ | ✅ |
| `admin_copilot` | D | platform_internal | blocked | ❌ | ✅ | ✅ | ❌ |
| `client_profile_comment` | A | organization_internal | trusted_llm | ✅ | ✅ | ✅ | **절대 금지** |
| `note_destination_recommender` | A | organization_internal | rules_only | ✅ | ✅ | ✅ | ❌ |
| `case_hub_conversation` | A | organization_internal | hybrid | ✅ | ✅ | ✅ | ❌ |

> **document_checklist redactNationalId/redactFinancial = false 이유**  
> 파산·회생 AI는 채권자 계좌번호, 채무자 주민번호가 문서 원문에 포함될 수 있으며, 이를 제거하면 추출 정확도가 크게 저하됨. 의도적으로 원문 보존 설정.

---

## 기능 그룹 정의

### 그룹 A — 조직 내부 운영 AI
대화/메모 분석, 의뢰인 성향 코멘트, 메모 분류, 위험 감지 등 **조직 운영 판단에 사용**.  
의뢰인 포털에 절대 노출 금지. `visibility = organization_internal` 필수.

| 기능 | 설명 |
|------|------|
| `client_profile_comment` | 의뢰인 성향/비용/대응전략 코멘트 — 조직 내부 메모에만 저장 |
| `note_destination_recommender` | 특이사항 저장 위치 추천 — rules-first, LLM 없이 키워드 분류 |
| `case_hub_conversation` | 대화/상담 메모 → 체크리스트 추출 |
| `anomaly_alert` | 비정상 패턴 감지 — 원문 입력 없이 집계 데이터만 사용 |

### 그룹 B — 사건 실행 AI
일정 추출, 체크리스트, 문서 준비 등 **사건 처리 보조**.  
조직 내부 기본이나 일부는 의뢰인용 변환 가능.

| 기능 | 설명 |
|------|------|
| `home_ai_assistant` | 홈 AI 미리보기 — 일정/할일 추출 |
| `ai_summary_card` | AI 요약 카드 |
| `next_action_recommendation` | 다음 액션 추천 |
| `draft_assist` | 문서 초안 보조 — 의뢰인용은 별도 변환 필요 |
| `document_checklist` | 문서 체크리스트/파산AI — 원문 전체 허용, 출처 필수 |
| `schedule_briefing` | 일정 브리핑 |

### 그룹 C — 의뢰인 공개 AI
준비서류 안내, 다음 단계, 포털용 쉬운 설명 등 **의뢰인이 직접 볼 수 있는** 결과.

| 기능 | 설명 |
|------|------|
| `portal_guide` | 의뢰인 포털 안내 — 공개 가능한 범위만 생성 |

> ⚠️ 그룹 A/B의 결과를 그대로 재사용 금지. 반드시 별도 생성 경로 사용.

### 그룹 D — 금지/제한 AI
플랫폼 운영 판단, 승인/삭제/권한 결정 등 **AI가 관여해서는 안 되는** 영역.

| 기능 | 설명 |
|------|------|
| `admin_copilot` | executionPath = blocked, 메뉴 안내만 반환 |

---

## 공개 범위 규칙

### 조직 내부 전용 (`visibility = organization_internal`)
- 의뢰인 포털 노출 **금지**
- 클라이언트-facing API 응답 **금지**
- 내부 화면에서만 렌더
- 저장 시 `internal_only = true` 권장

**해당 결과 유형:** 의뢰인 코멘트, 대응 전략, 비용 민감도, 내부 주의 메모, 사건 리스크 요약

### 의뢰인 공개 가능 (`visibility = client_visible`)
- 내부 전용 정보를 제거한 **별도 변환 레이어** 필수
- 조직 내부 AI 결과를 그대로 재사용 **금지**
- 안내/체크리스트/진행 요약 등 공개 가능한 범위로 제한

### 플랫폼 운영 금지 (`visibility = platform_internal`)
- AI 응답 차단 (`executionPath = blocked`)
- 메뉴 링크만 반환
- 조직 승인, 구독 조정, 감사로그 판정 등은 AI가 관여 금지

---

## 전처리 규칙 (prepareAiContext)

기능 불문 **항상 제거:**
- 인증 토큰 (`sk-...`, `ghp_...`, `AIza...`, `AKIA...` 등)
- API 키/엑세스 토큰 패턴 (`api_key=...`, `access_token=...`)
- 세션/베어러 토큰 패턴

**기능 정책에 따라 선택적 제거:**

| 조건 | 패턴 | 교체값 |
|------|------|--------|
| `redactNationalId = true` | `\d{6}-[1-4]\d{6}` | `[주민번호]` |
| `redactFinancial = true` | 카드번호 패턴 | `[카드번호]` |
| `redactFinancial = true` | 계좌번호 패턴 | `[계좌번호]` |

**문장 의미는 보존:** 주민번호/카드번호 외 나머지 문장 구조는 그대로 유지.

---

## AI 출력 필수 메타

모든 AI 결과에 아래 메타가 있어야 합니다:

```ts
type AiOutputMeta = {
  featureId: AiFeatureId;
  visibility: 'organization_internal' | 'client_visible' | 'platform_internal';
  clientVisible: boolean;
  internalOnly: boolean;
  source?: AiSourceMeta;
  requestId?: string;
  modelVersion?: string;
  estimated?: boolean;
};
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/ai/feature-catalog.ts` | 기능 정책 레지스트리 — AiFeaturePolicy 타입 + 12개 feature 정책 값 |
| `src/lib/ai/guardrails.ts` | 민감정보 탐지/처리 + AiOutputMeta 타입 |
| `src/lib/ai/policy.ts` | 접근 제어 + prepareAiContext 정책 엔진 |
| `src/lib/ai/task-planner.ts` | 실행 계층 — buildTaskPlan |
| `docs/AI_공통_필수_가드레일_및_출시승인_체크리스트.md` | AI 출시 체크리스트 |
