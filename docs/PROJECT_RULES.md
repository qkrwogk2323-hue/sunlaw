# Vein Spiral — 프로젝트 통합 규칙 (PROJECT_RULES.md)

> 이 파일은 Vein Spiral 저장소의 최상위 단일 원본(Single Source of Truth)이다.
> 기능 구현, 버그 수정, UI 변경, DB 마이그레이션, 권한 변경, 릴리즈 전 검토는 모두 이 문서를 기준으로 판단한다.
> 규칙이 바뀌면 같은 PR에서 `docs/UX_RULES.md`, `CLAUDE.md`, `.github/copilot-instructions.md`를 함께 동기화한다.

문서 버전: 2.1.0  
문서 상태: Production  
적용 범위: `src/`, `supabase/`, `docs/`, `.github/`  
동기화 책임: Product Owner + Tech Lead  
규범 해석 기준: MUST = 반드시, SHOULD = 권장, MAY = 선택 가능

---

## 0-1. Rule-First 강제 준수 규칙 (Absolute Enforcement Rule) ★★★ 최우선 ★★★

이 파일(`PROJECT_RULES.md`)이 Single Source of Truth이다.

모든 AI(Claude, GPT, Copilot 등)와 모든 개발자는 아래를 철저히 준수해야 한다.

1. 어떤 기능을 추가·수정·삭제하려고 할 때 반드시 먼저 `PROJECT_RULES.md` 전체를 읽는다.
2. 변경 사항이 어떤 규칙이라도 위반하면 다음을 따른다.
   1. 절대 코드에 손대지 않는다.
   2. 즉시 작업을 중단한다.
   3. 사용자에게 정확히 아래 문구로 답변한다.  
      `❌ 이 변경은 PROJECT_RULES.md의 [위반 규칙 번호]를 위반합니다. 법을 어길 수 없습니다. 규칙을 먼저 수정하거나 다른 방법을 제안해주세요.`
3. 위반을 발견하면 수정 계획까지 제시하지 않는다. 위반 사실만 보고하고 멈춘다.
4. 이 Rule 0-1은 다른 모든 규칙보다 우선한다. 예외는 없다.
5. 단, 사용자가 명시적으로 `PROJECT_RULES.md` 자체의 개정을 지시한 경우에는 이 문서를 개정할 수 있다. 이때 개정본이 승인되는 즉시 새로운 Single Source of Truth가 된다.

## 0-2. 섹션 구조 강제 규칙 (Section Structure Enforcement Rule) ★★★ 최우선 ★★★

`PROJECT_RULES.md`의 최상위 섹션 구조는 고정한다. 이 구조를 벗어나는 행위는 Rule 0-1 위반으로 간주한다.

고정 구조는 아래와 같다.

1. 0번 규칙 섹션
2. 스택 & 기술 제약
3. 카테고리 1: 권한 & 인증 규칙
4. 카테고리 2: DB & 마이그레이션 규칙
5. 카테고리 3: UX & 컴포넌트 규칙
6. 카테고리 4: 메시지 체계 규칙
7. 카테고리 5: 아키텍처 규칙
8. 카테고리 6: 절대 금지 목록
9. 핵심 파일 위치
10. 새 기능 구현 전 체크리스트

금지 사항은 아래와 같다.

1. 기존 최상위 섹션의 번호·순서·이름을 임의로 바꾸거나 삭제하지 않는다.
2. 새로운 최상위 섹션을 임의로 추가하지 않는다.
3. 새 규칙은 반드시 기존 섹션 안에 하위 번호로 추가한다.
4. 하위 번호는 기존 카테고리 범위 안에서만 부여한다.
5. 카테고리 6은 한 번만 존재한다. 용어 정의는 카테고리 6의 하위 규칙으로만 둔다.

0번 섹션의 하위 규칙(0-4, 0-5, …)은 필요에 따라 추가할 수 있다. 단 최상위 섹션 구조(카테고리 1~6)는 고정한다.

허용되는 유일한 예외는 사용자가 명시적으로 이 파일의 구조 개편을 지시한 경우뿐이다.

이 규칙을 위반하면 정확히 아래 문구로만 답변하고 작업을 중단한다.  
`❌ 섹션 구조를 어겼습니다. Rule 0-2 위반입니다.`

## 0-3. 섹션 관련 언급·권유 절대 금지 규칙 (No Section Suggestion Rule) ★★★ 최우선 ★★★

AI는 기능 구현 또는 버그 수정 과정에서 `PROJECT_RULES.md`의 섹션 구조를 불변으로 취급한다.

엄격 금지 사항은 아래와 같다.

1. 섹션이 난잡하다고 언급하지 않는다.
2. “섹션을 정리하자”, “새 섹션을 만들자”와 같은 제안을 하지 않는다.
3. 섹션 구조 관련 질문을 사용자에게 먼저 던지지 않는다.

단, 사용자가 이 파일 자체의 개정을 직접 지시한 경우에는 이 규칙이 적용되지 않는다.

이 규칙을 위반하면 정확히 아래 문구로만 답변하고 작업을 중단한다.  
`❌ Rule 0-3 위반입니다. 섹션 관련 언급·권유는 절대 금지입니다.`

## 0-4. 규범 해석 우선순위 규칙

규칙 충돌을 방지하기 위해 아래 순서로 해석한다.

1. `0-1`, `0-2`, `0-3`
2. 카테고리 1의 보안·권한 규칙
3. 카테고리 2의 데이터 무결성 규칙
4. 카테고리 3과 4의 UX·메시지 규칙
5. 카테고리 5의 아키텍처 규칙
6. 카테고리 6의 절대 금지 목록과 용어 정의
7. `PROJECT_RULES.md` 본문이 명시적으로 채택한 부속서
8. companion docs (`docs/UX_RULES.md`, `CLAUDE.md`, `.github/copilot-instructions.md`)

같은 수준의 규칙이 충돌하면 더 보수적인 해석을 택한다.
`PROJECT_RULES.md` 본문은 최상위 규범이며, 부속서와 companion docs가 충돌하면 본문이 우선한다.

## 0-5. 규범과 현황의 분리 규칙

이 문서는 영구 규칙만 담는다. 아래 항목은 이 문서에 두지 않는다.

1. “현재 위반 중”, “수정 필요”, “이번 스프린트 우선순위”와 같은 상태표
2. 특정 PR, 특정 브랜치, 특정 담당자에 종속되는 작업 메모
3. 시간이 지나면 곧바로 낡아지는 체크 현황

운영 현황, 미준수 항목, 우선순위는 이슈 트래커나 PR 설명에서 관리한다. `PROJECT_RULES.md`에는 규칙만 남긴다.

## 0-6. 변경 통제 규칙

이 파일을 수정하는 PR은 반드시 아래 요건을 충족해야 한다.

1. PR 제목 또는 본문에 변경된 규칙 번호를 명시한다.
2. 변경 이유와 기대 효과를 한 문단으로 요약한다.
3. 동기화 대상 문서(`docs/UX_RULES.md`, `CLAUDE.md`, `.github/copilot-instructions.md`)를 같은 PR에서 함께 수정한다.
4. 규칙 변경으로 인해 기존 코드가 위반 상태가 되면, 같은 PR에서 수정하거나 병행 이행 계획을 PR 본문에 명시한다.
5. schema-affecting change는 `main` 직푸시를 금지하고 PR로만 반영한다.
6. 서로 다른 semantic migration 축은 별도 PR로 분리한다.

## 0-7. CI 강제 규칙

머지 전 필수 검사는 아래와 같다.

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm build`
4. `pnpm test`
5. `pnpm check:migrations`

위 5개 중 하나라도 실패하면 머지하지 않는다.

## 0-8. 이행 원칙 규칙 (Incremental Enforcement Rule)

이 문서의 모든 규칙은 아래 이행 원칙을 따른다.

1. **신규 구현**: MUST. 모든 규칙을 즉시 적용한다.
2. **기존 구현**: 단계적 이행 대상. 현재 위반 상태라도 즉시 강제하지 않는다.
3. **기존 코드 수정 시**: 수정하는 파일과 관련된 규칙을 이 문서 기준으로 끌어올린다. 부분적으로 수정한 파일은 수정 범위 안에서 규칙을 준수한다.

이 원칙의 목표는 코드베이스가 자연스럽게 규칙으로 수렴하게 하는 것이다. 기존 위반을 이슈 트래커에서 관리하고, 매 PR마다 한 걸음씩 규칙 기준으로 당긴다.

## 0-9. 규범 부속서 채택 규칙

아래 파일은 저장소 내 규범 부속서로 채택한다.

1. `docs/platform-rules-package+solution/vein_spiral_rules_package/01_PROJECT_RULES_PLATFORM_EXPANSION_ADDENDUM.md`
2. `docs/platform-rules-package+solution/vein_spiral_rules_package/02_FORMULAS_AND_THRESHOLDS.md`
3. `docs/platform-rules-package+solution/vein_spiral_rules_package/03_ROLLOUT_AND_LEGACY_TRANSITION.md`
4. `docs/platform-rules-package+solution/vein_spiral_rules_package/04_platform_log_sink_matrix.csv`
5. `docs/platform-rules-package+solution/vein_spiral_rules_package/05_organization_restore_package_matrix.csv`
6. `docs/platform-rules-package+solution/vein_spiral_rules_package/06_menu_search_matrix.csv`
7. `docs/platform-rules-package+solution/vein_spiral_rules_package/07_subscription_lock_matrix.csv`

세부 규칙은 아래와 같다.

1. 위 파일들은 `PROJECT_RULES.md`가 명시적으로 편입한 하위 규범이다.
2. 본문과 부속서가 충돌하면 `PROJECT_RULES.md` 본문이 우선한다.
3. 부속서와 companion docs가 충돌하면 본문과 부속서를 우선하고 companion docs를 수정한다.
4. 수식, 임계치, 로그 라우팅, 복구 순서, 검색 범위, 구독 잠금 상태머신은 부속서 원문을 기준으로 구현한다.
5. 부속서 원문은 임의로 요약본으로 대체하지 않는다.

---

## 📦 스택 & 기술 제약

| 항목 | 기준 |
|------|------|
| Framework | Next.js 16 App Router + React 19 + TypeScript strict |
| 스타일 | Tailwind v4 (CSS variables 기반), 커스텀 UI 컴포넌트 |
| DB/Auth | Supabase (Auth + PostgreSQL + RLS) |
| 금지 라이브러리 | `shadcn/ui`, `@radix-ui/*` primitives, `sonner` 신규 직접 사용 금지 |
| 허용 예외 | 기존 `button.tsx` 등 저장소 내 표준 컴포넌트 확장은 허용 |
| `cn()` 경로 | `@/lib/cn` |
| Server Components | 기본값. Client Components는 인터랙션이 필요한 최소 범위만 허용 |
| `button.tsx` | `'use client'` 추가 금지. 서버 컴포넌트는 `buttonStyles()`를 직접 호출한다 |
| 데이터 변경 경로 | 모든 쓰기 작업은 Server Action 또는 Route Handler에서만 수행한다 |

추가 제약은 아래와 같다.

1. 브라우저 번들에 `service_role` 키를 절대 포함하지 않는다.
2. 클라이언트는 권한 판단의 보조 수단일 뿐이며, 최종 권한 판정은 서버에서만 한다.
3. 새 라이브러리 도입은 기존 규칙과 충돌하지 않을 때만 허용한다.

---

## 🔐 카테고리 1: 권한 & 인증 규칙

### 1-1. 권한 가드 함수 (서버 액션 & 페이지)

모든 서버 액션과 보호 페이지는 반드시 아래 함수 중 하나로 시작한다.

```ts
// 페이지 보호 — 미인증 시 /login으로 redirect
const auth = await requireAuthenticatedUser();

// 조직 액션 보호 — 조직 미소속 시 throw
const { auth, membership } = await requireOrganizationActionAccess(organizationId, {
  permission: 'case_create',
  requireManager: true,
  errorMessage: '권한이 없습니다.'
});

// 조직 구성원 관리 보호
const { auth } = await requireOrganizationUserManagementAccess(
  organizationId,
  '권한이 없습니다.'
);

// 플랫폼 관리자 전용 페이지
const auth = await requirePlatformAdmin(organizationId?);

// 플랫폼 관리자 전용 액션
const auth = await requirePlatformAdminAction('권한이 없습니다.', organizationId?);
```

세부 규칙은 아래와 같다.

1. 모든 쓰기 액션은 UI 숨김만으로 끝내지 않는다. 서버에서 반드시 재검증한다.
2. 페이지는 `redirect()`, 액션은 `throw new Error()` 또는 표준 액션 에러 계약으로 차단한다.
3. `organizationId`, `caseId`, `clientId` 등 클라이언트 입력값을 신뢰하지 않는다. 서버에서 소속과 권한을 다시 계산한다.
4. 권한 검사는 화면 진입 시점과 실제 실행 시점에 모두 적용한다.
5. 권한 없는 시도는 가능하면 감사 로그에 남긴다.

### 1-2. 플랫폼 조직 모델

플랫폼 조직과 플랫폼 관리자는 아래 정의를 따른다.

```txt
플랫폼 조직 = control plane registry가 지정하는 단일 platform organization
플랫폼 관리자 = app.is_platform_admin()이 참으로 판정하는 관리 주체
```

세부 규칙은 아래와 같다.

1. 플랫폼 관리자 여부는 `app.is_platform_admin()`과 그에 종속된 공용 권한 함수로만 계산한다.
2. 플랫폼 관리자 판별에 `slug`, `name`, `display label` 같은 변경 가능한 문자열을 직접 사용하지 않는다.
3. 플랫폼 조직의 구현 상세는 forward-only migration으로 진화할 수 있으나, 권한 판별의 canonical owner는 항상 단일 함수여야 한다.
4. UI, 서버 액션, 정책 함수는 플랫폼 관리자 여부를 문자열 비교로 재구현하지 않는다.

### 1-3. 권한 키 목록 (`src/lib/permissions.ts`)

권한 키의 단일 원본은 `src/lib/permissions.ts`이다.

| 그룹 | 키 |
|------|----|
| organization | `team_invite`, `team_permission_manage`, `organization_settings_manage`, `user_manage` |
| cases | `case_create`, `case_edit`, `case_delete`, `case_assign`, `case_stage_manage` |
| documents | `document_create`, `document_edit`, `document_approve`, `document_share`, `document_export` |
| requests | `request_create`, `request_manage`, `request_close` |
| schedules | `schedule_create`, `schedule_edit`, `schedule_confirm`, `schedule_manage`, `calendar_export` |
| billing | `billing_view`, `billing_issue`, `billing_payment_confirm`, `billing_export`, `billing_manage` |
| collection | `collection_view`, `collection_contact_manage`, `collection_payment_plan_manage`, `collection_payment_confirm`, `collection_metrics_view`, `collection_manage` |
| reports | `report_view`, `report_export`, `case_board_export` |
| compensation | `collection_compensation_view_self`, `collection_compensation_view_team` 등 |
| settlement | `settlement_view`, `settlement_manage`, `settlement_export` |

세부 규칙은 아래와 같다.

1. 권한 키는 문자열 리터럴로 여기저기 흩어 쓰지 않는다.
2. 새 권한 키를 추가할 때는 `permissions.ts`, 권한 체크 로직, UI 가드, 테스트를 같은 PR에서 갱신한다.
3. 권한 키 삭제 또는 이름 변경은 DB, 서버 액션, UI, 테스트, 시드 데이터 영향 범위를 모두 확인한 후에만 수행한다.

### 1-4. 역할 계층

역할 계층은 아래 정의를 따른다.

```txt
org_owner > org_manager > org_staff > client
isManagementRole(role) = org_owner || org_manager
```

세부 규칙은 아래와 같다.

1. 역할 계층을 우회하는 예외 분기를 금지한다.
2. 관리 기능은 `isManagementRole()` 또는 동등한 중앙 함수로만 판정한다.
3. UI 레이블과 코드 용어를 혼용하지 않는다. 예를 들어 한국어 UI에서는 “관리자”, 코드에서는 `org_manager`를 사용한다.

### 1-5. 플랫폼 감사 로그 분류 규칙 (Platform Audit Log Categorization)

플랫폼 관리자(`isPlatformOperator`)가 조회하는 감사 로그(`/admin/audit`)는 반드시 아래 4개 카테고리로 구분한다.

| 탭/섹션 | 내용 |
|---------|------|
| 일반 작업 | 사건 생성·수정, 설정 변경 등 정상 액션 |
| 삭제 기록 | `DELETE`, `SOFT_DELETE`, `ARCHIVE` |
| 위반 기록 | `VIOLATION_ATTEMPT`, 권한 초과 시도, 금지 액션 시도 |
| 복구 기록 | `RESTORE`, `UNARCHIVE`, `lifecycle_status`가 `active`로 복귀한 경우 |

위반 기록은 최소 아래 필드를 포함해야 한다.

```ts
{
  violator_email: string;
  violator_profile_id: string;
  attempted_at: string;       // ISO 8601
  attempted_action: string;
  blocked_reason: string;
  request_id?: string;
  ip_address?: string;
  user_agent?: string;
}
```

감사 로그 공통 최소 필드는 아래와 같다.

```ts
{
  action: string;
  category: 'general' | 'delete' | 'violation' | 'restore';
  actor_profile_id: string | null;
  actor_email: string | null;
  organization_id: string | null;
  target_table: string | null;
  target_id: string | null;
  before_json?: unknown;
  after_json?: unknown;
  reason?: string | null;
  request_id?: string | null;
  created_at: string;
}
```

추가 규칙은 아래와 같다.

1. 모든 감사 로그는 `audit.change_log`에 기록한다.
2. 조회 권한은 플랫폼 관리자에게만 부여한다.
3. 권한 거부, 규칙 위반, 금지 액션 시도도 로그에 남긴다.
4. 관리자 화면은 카테고리 탭 기준으로 필터할 수 있어야 한다.
5. 감사 로그는 사용자 UI 오류 메시지의 대체물이 아니다. 사용자에게는 적절한 UI 메시지를 별도로 보여준다.

### 1-6. 기본 거부(Default Deny)와 이중 집행 규칙

보안 기본값은 항상 `deny by default`다.

1. 권한이 명시되지 않은 기능은 허용하지 않는다.
2. UI는 숨김 또는 비활성화를 통해 사용 가능 범위를 안내한다.
3. 서버는 실제 실행 권한을 최종 판정한다.
4. 권한이 없는 버튼을 비활성화할 때는 가능한 경우 `disabledReason`을 제공한다.
5. 읽기 권한과 쓰기 권한을 분리한다. 읽기 가능이 곧 쓰기 가능을 뜻하지 않는다.

### 1-7. 비밀정보·민감정보 처리 규칙

1. `service_role`, JWT secret, DB 비밀번호, 서드파티 API key는 클라이언트 번들, 로그, 에러 메시지에 노출하지 않는다.
2. 로그에는 주민번호, 계좌번호, 카드번호, 전체 토큰 값을 남기지 않는다.
3. 이메일 주소, 전화번호 등 PII가 꼭 필요한 경우 최소 범위로만 기록한다.
4. 디버그 로그를 프로덕션에 남길 때는 민감정보를 마스킹한다.

### 1-8. 플랫폼 관리자 세부 권한 분리 규칙

1. 플랫폼 관리자 판정은 `app.is_platform_admin()` 또는 동등한 canonical 함수로만 수행한다.
2. 플랫폼 관리자 권한은 최소 아래 세부 권한으로 분리한다.
   1. `platform_org_approve`
   2. `platform_org_suspend`
   3. `platform_org_expel`
   4. `platform_org_delete_prepare`
   5. `platform_org_delete_execute`
   6. `platform_org_restore`
   7. `platform_support_manage`
   8. `platform_billing_override`
   9. `platform_security_view`
   10. `platform_csv_restore_execute`
3. 플랫폼 조직 소속 관리자라 하더라도 세부 권한이 없으면 해당 기능을 실행할 수 없다.
4. `platform_org_delete_execute`는 `platform_org_delete_prepare` 이후 `24시간` 이내에만 허용한다.
5. 삭제 실행 전 `reason_code`, `reason_text`, `snapshot_export_id`, `actor_profile_id`, `executed_at` 기록이 없으면 실행할 수 없다.

### 1-9. 조직 생성 승인 및 고객센터 SLA 규칙

1. 조직 생성 승인은 `organization_signup_requests` 기반으로만 처리한다.
2. 승인 가능 주체는 `platform_org_approve = true` 인 플랫폼 관리자만 허용한다.
3. 승인 결과는 `approve`, `reject`, `request_changes`, `cancelled` 중 하나로 표준화한다.
4. 고객센터 우선순위는 `security`, `billing_lock`, `org_blocker`, `data_restore`, `general` 로 고정한다.
5. `PriorityScore = 100*security + 60*billing_lock + 40*org_blocker + 25*data_restore + 10*general` 공식을 따른다.
6. `security=1` 이면 최초 응답 SLA는 `2h`, `billing_lock=1` 이면 `4h`, 나머지는 `24h`를 기본값으로 한다.

### 1-10. 조직 추방·삭제·복구 거버넌스 규칙

1. 추방은 즉시 hard delete가 아니라 `organizations.lifecycle_status = 'soft_deleted'` 와 접근 정지로 처리한다.
2. 추방 시 조직 상태 변경, 활성 멤버십 `suspended`, 새 로그인 차단, 허브 쓰기 차단, CSV 복구 스냅샷 생성, 감사 로그 기록을 같은 작업 체인으로 보장한다.
3. 삭제 준비는 snapshot export 완료 전 허용하지 않는다.
4. 물리 삭제는 `legal_hold = 0`, `snapshot_export_exists = 1`, `audit_export_exists = 1`, `open_incident_count = 0` 을 모두 만족할 때만 허용한다.
5. 물리 삭제 후에도 감사 로그와 복구 CSV 메타데이터는 보존한다.

### 1-11. 조직 역할 계층 및 Deny 우선 규칙

1. 역할 우선순위는 `org_owner > org_manager > org_staff > client` 로 고정한다.
2. `org_owner`만 조직 삭제, 결제 플랜 변경, 연동 해제 최종 승인 권한을 가진다.
3. `org_manager`는 운영 권한을 가지되 조직 삭제와 결제 플랜 변경은 할 수 없다.
4. `EffectivePermission = TemplatePermission + Grants - Denies` 공식을 따른다.
5. `Deny`는 항상 `Grant`보다 우선한다.
6. 멤버십 상태가 `active`가 아니면 쓰기 액션은 모두 차단한다.

### 1-12. 플랫폼 지원과 운영 분리 규칙

1. `platform_support_manage` 와 `platform_org_delete_execute`는 기본적으로 같은 사용자에게 동시에 부여하지 않는다.
2. 예외적으로 같은 사용자에게 부여할 때는 `dual_role_justification` 기록이 있어야 한다.
3. 보안 사고, 결제 잠금, 데이터 복구, 조직 추방은 서로 다른 감사 이벤트 타입으로 기록한다.

### 1-13. 플랫폼 청구 유예 조정 규칙

1. 플랫폼 관리자는 조직별 유료 전환 유예 일수 `override_days`를 조정할 수 있다.
2. 허용 범위는 `0 <= override_days <= 365` 이다.
3. 실제 유예 만료일은 `trial_start_at + 7일 + override_days` 로 계산한다.
4. 변경 시 `changed_by`, `changed_at`, `previous_override_days`, `new_override_days`, `reason_code` 를 반드시 남긴다.

---

## 🗄 카테고리 2: DB & 마이그레이션 규칙

### 2-1. 마이그레이션 파일 규칙

마이그레이션 파일은 아래 형식을 따른다.

```txt
NNNN_설명.sql
```

세부 규칙은 아래와 같다.

1. 번호는 4자리 연속 증가 형식만 사용한다.
2. 다음 번호는 저장소 HEAD 기준 최신 번호 + 1로 결정한다.
3. `pnpm check:migrations`를 통과하지 못하면 머지하지 않는다.
4. 이 문서에 “현재 최신 번호”를 고정값으로 적지 않는다. 최신 번호는 저장소가 단일 원본이다.
5. 마이그레이션 제목은 실행 의도를 드러내는 명사구 또는 동사구로 쓴다.

### 2-2. `lifecycle_status` 타입 (DB 전역 enum)

전역 enum은 아래 값만 사용한다.

```sql
'active' | 'soft_deleted' | 'archived' | 'legal_hold'
```

세부 규칙은 아래와 같다.

1. `cases`, `organizations` 등 라이프사이클이 있는 엔터티는 이 enum을 우선 사용한다.
2. 같은 의미의 상태를 `deleted`, `inactive`, `removed` 같은 별도 문자열로 중복 정의하지 않는다.
3. `legal_hold`는 삭제 우회 수단이 아니다. 별도 정책과 감사 대상이다.

### 2-3. Soft Delete 규칙

즉시 hard delete는 기본적으로 금지한다.

```ts
// ❌ 금지
await supabase.from('table').delete().eq('id', id);

// ✅ lifecycle_status가 있는 테이블
await supabase
  .from('table')
  .update({
    lifecycle_status: 'soft_deleted',
    updated_by: auth.user.id,
  })
  .eq('id', id);

// ✅ lifecycle_status가 없는 테이블
await supabase
  .from('table')
  .update({
    deleted_at: new Date().toISOString(),
  })
  .eq('id', id);
```

세부 규칙은 아래와 같다.

1. 삭제 UI는 “삭제”가 아니라 “보관함으로 이동”을 기본 동작으로 설계한다.
2. soft delete가 가능한 테이블에 `delete()`를 직접 호출하지 않는다.
3. 삭제 후 복구 경로와 감사 로그를 함께 제공한다.
4. `updated_by`, `deleted_at`, `deleted_by` 등 추적 필드를 가능한 범위에서 함께 남긴다.

### 2-4. 목록 쿼리와 보관함 쿼리 규칙

목록 기본 쿼리는 soft-deleted 데이터를 숨겨야 한다.

```ts
// lifecycle_status 기반
.neq('lifecycle_status', 'soft_deleted')

// deleted_at 기반
.is('deleted_at', null)
```

세부 규칙은 아래와 같다.

1. 일반 목록은 삭제된 데이터를 기본적으로 제외한다.
2. 보관함 화면은 삭제된 데이터만 조회한다.
3. soft delete가 있는 엔터티는 “기본 목록”과 “보관함 목록”의 쿼리를 명시적으로 분리한다.
4. 복구 액션은 `active`로 되돌리고 일반 목록이 즉시 갱신되어야 한다.

### 2-5. Hard Delete 예외 규칙

hard delete는 아래 조건을 모두 만족할 때만 허용한다.

1. 대상이 이미 `soft_deleted` 상태이거나 `deleted_at`이 존재한다.
2. 보관함 화면 또는 관리자 전용 화면에서만 실행한다.
3. 권한 가드를 통과한다.
4. 감사 로그를 남긴다.
5. 사용자에게 되돌릴 수 없음을 명확히 고지한다.
6. 아래 보상 삭제(compensating delete) 예외는 별도로 허용한다.

### 2-5-1. 보상 삭제(Compensating Delete) 예외 규칙

아래 조건을 모두 만족하는 경우에만 `delete()`를 보상 삭제로 허용한다.

1. 같은 Server Action 또는 같은 요청 흐름 안에서 방금 생성한 row를 실패 복구 목적으로 제거한다.
2. 대상 테이블에 `lifecycle_status` 또는 `deleted_at` 같은 soft delete 추적 컬럼이 없다.
3. row의 “부재” 자체가 정상 상태이며, soft delete로 남기면 고유 제약 또는 재시도 흐름을 깨뜨린다.
4. 사용자 기능으로 노출되는 삭제가 아니라, 원자성 복구 또는 롤백 처리다.
5. 코드에 보상 삭제 의도를 주석 또는 함수 이름으로 명시한다.

### 2-6. `revalidatePath()` 규칙

모든 Server Action 성공 후에는 반드시 `revalidatePath()`를 호출한다.

세부 규칙은 아래와 같다.

1. 변경이 반영되는 모든 주요 경로를 재검증한다.
2. 낙관적 UI만으로 캐시 무효화를 대체하지 않는다.
3. 태그 캐시를 쓰는 경우 `revalidateTag()`를 병행할 수 있으나 `revalidatePath()`를 생략하는 근거로 쓰지 않는다.

### 2-7. Enum 확장 규칙

enum 확장은 스키마 호환성 검토 없이 진행하지 않는다.

필수 작업은 아래와 같다.

1. DB enum migration 생성
2. 기존 데이터 backfill 또는 기본값 검토
3. `src/lib/validators.ts` 갱신
4. `src/lib/status-labels.ts` 갱신
5. 폼 드롭다운 옵션 갱신
6. CSV import 또는 export 매핑 갱신
7. 테스트 갱신

### 2-8. 트랜잭션·백필·락 관리 규칙

1. 둘 이상의 테이블을 함께 변경하는 쓰기 작업은 트랜잭션 또는 원자적 RPC로 처리한다.
2. 대용량 backfill은 재실행 가능한 형태로 작성한다.
3. 운영 DB에 장시간 락을 유발하는 `ALTER TABLE` 또는 대량 `UPDATE`는 단계적으로 수행한다.
4. 파괴적 변경은 실행 전 백업 전략과 롤백 절차를 검토한다.
5. 마이그레이션 안에서 애플리케이션 코드에 의존하는 동적 로직을 넣지 않는다.

### 2-9. RLS 및 테넌트 격리 규칙

1. 조직 데이터가 저장되는 모든 테이블은 RLS를 활성화한다.
2. `SELECT`, `INSERT`, `UPDATE`, `DELETE` 정책은 조직 범위를 명시적으로 제한한다.
3. 플랫폼 관리자 예외 접근은 정책 또는 서버 계층에서만 허용하고, 모두 감사 대상에 포함한다.
4. 새 테이블 추가 시 RLS 없는 상태로 머지하지 않는다.

### 2-10. 인덱스와 조회 성능 검토 규칙

1. 새 필터, 정렬, 조인 키를 도입하면 인덱스 필요성을 함께 검토한다.
2. 무제한 목록 쿼리를 기본값으로 두지 않는다.
3. `select('*')`는 상세 화면이 아닌 이상 지양한다.
4. 대시보드와 목록은 필요한 컬럼만 선택한다.

### 2-11. 마이그레이션 거버넌스 규칙

1. `0001~현재` 마이그레이션 체인은 immutable ledger로 취급한다.
2. 이미 적용되었을 가능성이 있는 과거 migration 파일은 수정하지 않는다.
3. 모든 정리는 새 sequential forward-only migration으로만 수행한다.
4. 기존 테이블을 후속 migration에서 `create table if not exists`로 재선언하지 않는다.
5. 예외는 원격 히스토리 정합용 placeholder인 경우뿐이며, 문서에 반드시 `history-sync only / non-canonical` 로 표시한다.
6. 권한 판별 함수는 `slug`, `name`, `display label`을 기준으로 만들지 않는다.
7. 핵심 함수는 한 시점에 하나의 canonical owner만 가진다.

### 2-12. Canonical / Retired / History-Sync 분류 규칙

1. migration은 `canonical origin`, `historical sync`, `retired lineage`, `meaning regression`, `active but pending canonicalization` 중 하나로 분류해 문서화한다.
2. `0040`, `0041`은 조직 협업 허브의 canonical origin으로 유지한다.
3. `0044`, `0045`는 `history-sync only / non-canonical` 로 문서화한다.
4. `0042`는 플랫폼 관리자 의미의 canonical origin으로 채택한다.
5. `0050`은 immutable history로 보존하되 `meaning regression`으로 분류하고 새 migration으로 supersede 한다.
6. `0033`은 virtual/scenario 모델의 retired cutoff point로 문서화한다.

### 2-13. Bootstrap Drift 검사 규칙

1. `fresh bootstrap` 경로와 `upgrade from production-like schema` 경로를 모두 통과해야 한다.
2. CI는 빈 DB 기준 `0001~최신` 적용 결과와 운영 유사 스키마 덤프를 비교할 수 있어야 한다.
3. `bootstrap drift`가 검출되면 새 기능 migration을 머지하지 않는다.

### 2-14. 상태변경 액션 중복 방지 규칙

1. `D = duplicated_persisted_rows / unique_client_request_id_count` 허용값은 `0`이다.
2. 생성, 전송, 제출, 승인, 초대, 채팅, 알림, 해결 처리 액션은 `client_request_id` 또는 `client_message_id` 를 포함해야 한다.
3. 서버는 동일 키를 한 번만 처리해야 한다.
4. 채팅 전송은 최소 `channel_id + client_message_id` 조합의 유일성 제약을 가져야 한다.
5. 실시간 구독과 낙관적 업데이트는 서버 `id` 기준으로 중복 제거해야 한다.

### 2-15. 연결고리 무결성 및 복구 규칙

1. `FKIntegrity = valid_required_edges / total_required_edges` 허용값은 `1`이다.
2. 연결고리 위반 상태는 `valid`, `soft_violation`, `hard_violation`, `quarantined` 로 구분한다.
3. `soft_violation` 은 읽기는 허용하되 신규 쓰기를 제한하고 자동 복구 작업을 생성한다.
4. `hard_violation` 은 해당 객체의 핵심 액션을 차단하고 플랫폼 관리자에게 알린다.
5. `quarantined` 는 일반 사용자와 조직 사용자에게 숨기고 플랫폼 관리자만 볼 수 있게 한다.
6. `RepairSuccess = repaired_edges / detected_violations` 목표값은 `0.95` 이상이다.

### 2-16. 감사 로그·CSV 복구·개인정보 보호 규칙

1. 개인정보 등급은 `P0`, `P1`, `P2`, `P3` 로 구분한다.
2. `P3` 필드는 암호문 컬럼으로 저장하고, 검색이 필요한 경우 결정적 토큰을 별도 저장한다.
3. `PlaintextLeakCount` 는 반드시 `0` 이어야 한다.
4. 조직 복구는 `organization_restore_package_matrix.csv` 의 순서와 파일 체계를 따른다.
5. `RestoreCompleteness = restored_rows / exported_rows` 허용값은 `1`이다.
6. 로그 라우팅은 `platform_log_sink_matrix.csv` 를 기준으로 한다.
7. 대형 migration, 조직 삭제, 허브 구조 변경, 구독 잠금 로직 변경, 키 회전은 snapshot export와 rollback plan 없이 배포하지 않는다.

---

## 🎨 카테고리 3: UX & 컴포넌트 규칙

> 원본 동기화 문서: `docs/UX_RULES.md`

### 3-1. UX 체크리스트 4단계 (모든 액션에 적용)

모든 액션은 아래 4단계를 충족해야 한다.

| Phase | 항목 | 핵심 |
|-------|------|------|
| 0 | 행동 유발 + 사전 안내 | 버튼 레이블은 결과 중심으로 쓴다. 영향 범위를 미리 보여준다 |
| 1 | 권한 검증 + 중간 확인 | UI와 서버를 모두 거친다. 위험 액션은 ConfirmModal을 거친다 |
| 2 | 처리 상태 + 결과 피드백 | 로딩 표시, 버튼 비활성화, 성공/실패 피드백을 제공한다 |
| 3 | 취소/복구 + 일관성 + 메시지 체계 | undo, soft delete, 일관된 컴포넌트, 같은 메시지 형식을 사용한다 |

### 3-2. 핵심 컴포넌트 사용 규칙

폼 제출, 파괴적 액션, 버튼, 토스트, 로딩, 에러는 반드시 저장소 표준 컴포넌트를 사용한다.

```tsx
// ❌ 금지
<form action={serverAction}>
  <button type="submit">저장</button>
</form>

// ✅ 필수
<ClientActionForm
  action={serverAction}
  successTitle="저장 완료"
  successMessage="변경사항이 저장되었습니다."
>
  <SubmitButton>저장</SubmitButton>
</ClientActionForm>
```

```tsx
// ❌ 금지
window.confirm('삭제?');
alert('완료');

// ✅ 필수
<DangerActionButton
  action={softDeleteAction}
  fields={{ id: item.id, organizationId }}
  title="사건 삭제"
  description="삭제하면 보관함으로 이동되며, 언제든 복구할 수 있습니다."
  highlightedInfo={`사건명: ${item.title}`}
  confirmLabel="보관함으로 이동"
  successTitle="보관함으로 이동 완료"
/>
```

```tsx
// 서버 컴포넌트
import { Button } from '@/components/ui/button';

// 클라이언트 컴포넌트
import { EnhancedButton } from '@/components/ui/enhanced-button';

<EnhancedButton
  disabled={!hasPermission}
  disabledReason="관리자만 가능합니다."
>
  수정
</EnhancedButton>
```

```tsx
const { success, error, warning, undo } = useToast();

success('저장 완료', { message: '변경사항이 저장되었습니다.' });
error('저장 실패 — 네트워크 오류', {
  message: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
});
undo('보관함으로 이동됨 — 8초 내 취소 가능', {
  message: '지금 취소하면 즉시 복구됩니다.',
  onUndo: handleUndo,
});
```

```tsx
<InlineError
  title="업로드 실패"
  cause="파일 크기가 10MB를 초과했습니다."
  resolution="10MB 이하 파일을 선택해 주세요."
  onRetry={retry}
/>

<LoadingOverlay message="저장 중..." />
<InlineLoadingSpinner size="sm" />
```

### 3-3. 폼 필드 규칙

모든 필수 입력 필드는 아래 패턴을 따른다.

```tsx
<p className="mb-4 text-xs text-slate-500">
  <span className="text-red-500">*</span> 필수 입력 항목입니다
</p>

<div className="space-y-1">
  <label htmlFor="name" className="text-sm font-medium text-slate-700">
    이름 <span className="text-red-500" aria-hidden="true">*</span>
  </label>
  <Input
    id="name"
    name="name"
    required
    aria-required="true"
    placeholder="홍길동"
  />
  {fieldError.name && (
    <p className="text-xs text-red-500">{fieldError.name}</p>
  )}
</div>
```

세부 규칙은 아래와 같다.

1. `required` 필드에는 빨간 `*`를 반드시 표시한다.
2. `label htmlFor`와 `input id`는 반드시 연결한다.
3. `placeholder`는 label의 대체물이 아니다.
4. 빈 필수 필드는 클라이언트에서 먼저 차단한다.
5. 에러 문구는 `[필드명]은(는) 필수입니다.` 형식으로 쓴다.
6. 서버 검증 실패 시 필드 단위 에러와 폼 단위 에러를 구분해 보여준다.
7. **필수/선택 구분은 폼 화면에서 반드시 명시한다.** 폼 상단에 "* 필수 입력 항목" 안내 배너를 표시하고, 선택 항목은 레이블 옆에 "(선택)" 또는 `(optional)`을 붙인다.
8. **Validator가 엄격한 필드(URL, 사업자번호, 전화번호, 주민번호 등)는 입력 형식 힌트를 폼에 반드시 함께 표시한다.** 예: `https://` 포함, 숫자 10자리, 하이픈 없이 등. 힌트 없이 제출해서 오류 받는 구조는 금지한다.
9. **검증 실패(ZodError 포함) 메시지는 raw 에러 JSON 또는 영문 에러 코드를 사용자에게 그대로 노출하면 안 된다.** 반드시 사람이 읽을 수 있는 한국어 문장으로 변환해서 표시한다. (`normalizeGuardFeedback()` 활용)

### 3-4. 새 페이지/메뉴 신설 체크리스트

새 라우트 또는 메뉴를 추가할 때는 아래 8개를 모두 충족한다.

1. `mode-aware-nav.tsx`에 메뉴를 등록한다.
2. `sectionAccent` 색상을 등록한다.
3. 서버 권한 체크를 구현한다.
4. 빈 상태 화면을 제공한다.
5. 페이지 헤더(`<h1>` + 설명 문장)를 제공한다.
6. 모바일 반응형을 적용한다.
7. 로딩 상태와 에러 상태를 제공한다.
8. `metadata`의 제목과 설명을 설정한다.

**메뉴-라우트 정합성 원칙 (★ 절대 준수):**
- **네비게이션에 노출된 핵심 기능은 실제로 동작하는 라우트와 1:1로 연결돼야 한다.** 메뉴는 있는데 라우트가 없거나, 라우트는 있는데 메뉴가 없는 상태는 금지한다.
- 미구현 기능은 메뉴에 노출하지 않는다. 준비 중이면 `Coming Soon` 상태로 비활성화하거나 아예 숨긴다.
- 허브 상태, 비용관리, 계약관리, 승인관리처럼 문맥 의존 기능은 현재 문맥에서 바로 이어지는 메뉴·탭·세션을 제공해야 한다. 핵심 흐름이 다른 메뉴로 끊기면 구조 위반이다.

빈 상태 패턴은 아래를 따른다.

```tsx
{items.length === 0 && (
  <div className="py-12 text-center text-slate-400">
    <SomeIcon className="mx-auto mb-3 h-8 w-8 opacity-40" />
    <p className="font-medium">아직 사건이 없습니다</p>
    <p className="mt-1 text-sm">새 사건을 등록해 업무를 시작해 주세요.</p>
  </div>
)}
```

### 3-5. ARIA & 접근성 규칙

1. 모든 인터랙티브 요소에 `aria-label` 또는 `aria-describedby`를 제공한다.
2. 모달과 드롭다운은 ESC 닫기와 Tab 포커스 트랩을 지원한다.
3. 이미지는 `alt`를 제공한다. 장식용 이미지는 `alt=""`를 사용한다.
4. 로딩 중인 섹션에는 `aria-busy="true"`를 적용한다.
5. 키보드만으로 주요 작업을 수행할 수 있어야 한다.
6. 색상만으로 상태를 구분하지 않는다.

### 3-6. Trash Bin / 보관함 패턴

모든 soft delete는 반드시 보관함 UI와 함께 제공한다.

```ts
// 1. lifecycle_status = 'soft_deleted' 업데이트
// 2. 성공 토스트 노출
// 3. undo 토스트 8초 노출
// 4. 복구 경로 제공
```

세부 규칙은 아래와 같다.

1. 삭제 성공 토스트는 `보관함으로 이동 완료` 또는 동등한 메시지로 표준화한다.
2. undo 토스트는 8초 기준으로 통일한다.
3. 복구 액션은 `restoreXxxAction` 명명 규칙을 따른다.
4. 영구 삭제는 보관함에서만 허용한다.
5. 영구 삭제 버튼은 관리자 권한이 있어야 한다.

### 3-7. 목록 성능 및 페이지네이션 규칙

1. 항목이 8개 이상이면 기본적으로 접기 또는 “더 보기”를 제공한다.
2. 항목이 50개 이상이면 서버 사이드 페이지네이션 또는 커서 기반 페이지네이션을 사용한다.
3. 무한 길이 목록을 한 번에 전부 렌더링하지 않는다.
4. 검색과 정렬은 URL 쿼리 파라미터와 동기화할 수 있어야 한다.
5. 긴 목록 페이지는 검색창을 상단에 고정할 수 있어야 한다.

### 3-8. 로딩·에러·중복 제출 방지 규칙

1. 네트워크 요청 중에는 중복 제출을 막기 위해 버튼을 비활성화한다.
2. 낙관적 UI를 쓰더라도 서버 실패 시 롤백 경로를 제공한다.
3. 복구 가능한 오류는 인라인 에러로 보여준다.
4. 복구 불가능한 오류는 에러 경계 또는 전역 에러 화면으로 처리한다.
5. hydration mismatch를 유발하는 조건부 렌더링을 피한다.

### 3-9. 전역 UI 품질 규칙

전 화면에 공통으로 적용되는 레이아웃·컴포넌트 품질 기준이다.

#### 섹션 헤더

1. 한 섹션 헤더에는 제목, 설명(선택), 우측 액션(선택) 3요소 이내만 허용한다. 4개 이상이면 구조 위반이다.

#### KPI / 요약 카드

1. KPI 카드는 반드시 3계층으로 구성한다: 1행 라벨, 2행 핵심 수치, 3행 보조 설명 또는 상태. 이 순서를 어기면 위반이다.
2. 같은 grid row 안의 KPI 카드들은 `min-height`를 동일하게 맞춘다.
3. 같은 row의 핵심 수치 텍스트는 `font-size`, `font-weight`, `line-height`를 동일하게 사용한다.
4. KPI 카드 제목은 16자를 초과할 수 없다. 16자가 넘으면 문구를 재작성한다.
5. KPI 카드 한 개는 집계 대상을 하나만 표현한다. 시간축·우선순위·객체 등 의미가 둘 이상 섞이면 위반이다.

#### 버튼 그룹

1. 한 버튼 그룹에는 최대 3개까지 허용한다. 4개 이상이면 주·보조·더 보기 구조로 재구성한다.
2. destructive 버튼은 그룹의 마지막 위치에 배치한다.

#### 섹션 간격

1. 같은 페이지의 1차 섹션 간 vertical gap은 `24px` 또는 `32px` 중 하나만 사용한다. 혼용은 금지한다.

#### 빈 상태 문구

1. empty state 문구는 2문장으로 고정한다: 1문장은 현재 상태, 2문장은 다음 행동. 3문장 이상은 금지한다.

#### UI 용어 단일성

1. 한 카드 안에서 지칭하는 객체는 하나여야 한다. 사건·알림·요청·조직 중 하나만 사용한다. 둘 이상 혼용하면 위반이다.

#### Actionable Card / KPI Card 클릭 가능성 규칙 (★ 절대 준수)

1. **카드처럼 생긴 UI 요소(KPI 카드, 요약 카드, 알림 카드 등)가 수치·상태·목록 항목을 표시하면, 해당 카드는 반드시 클릭 가능해야 한다.** `<div>` 로만 렌더하고 클릭 이벤트가 없는 카드형 UI는 금지한다.
2. KPI 카드 클릭 시 연결 목적지는 반드시 실제 관련 화면(필터 적용 목록, 처리 화면 등)이어야 한다. `/dashboard` 같은 제자리 이동은 금지한다.
3. `<Link>` 또는 `onClick`이 없는 카드는 인터랙션 없는 정보 표시 전용임을 배경색·커서·ARIA role로 명시적으로 구분해야 한다.

#### 표시 개수 정합성 규칙

1. **화면에 표시되는 개수(배지·숫자)와 실제 노출되는 항목 수는 반드시 같아야 한다.** 다르면 더 보기 버튼을 명시하거나 전체 개수를 표시하고 일부 노출임을 안내해야 한다.
2. 섹션 내 항목을 임의 개수로 잘라서 노출하는 `slice(0, N)` 패턴은 더 보기 또는 전체 보기 UI 없이 단독으로 사용하면 금지한다.
3. **알림, 승인 요청, 후속 처리, 보관 대기 등 화면에 표시되는 개수는 실제 존재하는 항목 수와 정확히 일치해야 하며, 사용자는 그 항목을 목록 또는 상세 화면에서 바로 확인할 수 있어야 한다.**
4. **표지판성 안내를 제외하고, 의미 없는 숫자와 의미 없는 문구를 둘 수 없다.** 숫자는 항상 실제 대상을 가리켜야 하고, 문구는 항상 다음 행동 또는 현재 상태를 설명해야 한다.
5. **대기/상태 화면은 다음 행동을 반드시 명시해야 한다.** 승인 대기, 반려, 연결 대기, 재승인 대기, 검토 대기 화면은 사용자가 지금 무엇을 기다리고 있으며 다음에 어디로 가야 하는지 버튼 또는 링크로 즉시 보여줘야 한다.

#### 전역 디자인 일관성 규칙 (★ 절대 준수)

1. **디자인 일관성은 선택이 아니라 규칙이다.** 버튼 크기·톤·카드 정렬·배지 위계는 전 페이지에서 통일해야 한다.
2. 같은 역할의 버튼(Primary CTA, Secondary, Ghost, Destructive)은 전 페이지에서 동일한 크기·색상·높이를 사용한다.
3. 한 페이지 안에서 `dark button`, `light button`, `ghost button`이 같은 위계로 혼용되면 위반이다.
4. 숫자 표시(`text-3xl font-bold tabular-nums`)·상태 배지·카드 헤더 스타일은 프리미티브 기준을 따른다 (5-12 참조).
5. **디자인 검토는 항상 최신 디자인 규칙과의 차이를 기준으로 수행한다.** 활성 화면이 현재 규칙과 어디서 어긋나는지 식별하고, 그 차이를 수정 대상으로 분류해야 한다.

### 3-10. 메뉴 공통 상단 구조 규칙 (Menu Hero Rule)

모든 주요 메뉴는 첫 화면 5초 안에 무엇을 보는지, 지금 가장 중요한 수치가 무엇인지, 다음 행동이 무엇인지 이해시켜야 한다.

1. 메뉴의 상단 Hero는 제목, 설명, 핵심 요약, 주요 행동을 한 구조로 묶는다.
2. `Hub Coupling Score`, `Frequency Score`, `Time Sensitivity Score`를 기준으로 상단 요약 밀도를 조정한다.
3. 허브 결합도가 높은 메뉴는 첫 뷰포트 안에 사건허브 요약 블록을 노출한다.
4. 상단 Hero의 기본 액션 수는 `Primary CTA 1개 + Secondary CTA 최대 2개`다.
5. 필터가 4개 이상이면 나머지는 고급 필터로 접는다.

### 3-11. 사건허브 연동 인터랙션 규칙 (Hub Affordance Rule)

사건 관련 메뉴는 사용자가 현재 사건허브 상태를 잃지 않도록 설계해야 한다.

1. 사건 관련 메뉴는 `사건목록`, `사건허브`, `의뢰인`, `문서`, `일정`, `알림`, `청구`, `추심`, `보고`를 포함한다.
2. 위 메뉴는 첫 뷰포트 안에 아래 3종 중 최소 1개를 반드시 제공한다.
   1. 허브 입장 버튼
   2. 허브 상태 요약 블록
   3. 허브 기준 필터 또는 탭
3. 허브 진입 깊이는 아래 기준을 따른다.
   1. 사건목록 → 사건허브 진입 `1클릭 이하`
   2. 사건허브 메뉴 → 사건허브 진입 `0~1클릭`
   3. 의뢰인/문서/일정/알림/청구/추심/보고 → 사건허브 진입 `2클릭 이하`
4. 허브 미연동 상태의 기본 CTA는 반드시 `허브 연동`을 사용한다.
5. 허브 지표 배지는 모든 메뉴에서 아래 순서와 용어를 고정한다.

```txt
협업 x/y → 열람 x/y → 미읽음 n → 최근 활동 t
```

### 3-12. 사건허브 로비 레이아웃 규칙 (Premium Lobby Rule)

사건허브 로비는 제품의 대표 장면이므로 일반 목록과 다른 플래그십 레이아웃을 사용한다.

1. 데스크톱 로비는 `3 : 6 : 3` 비율을 기본으로 한다.
   1. 좌측 `3/12` = 참여자 패널
   2. 중앙 `6/12` = 사건 엠블럼, 슬롯 링, 주 CTA
   3. 우측 `3/12` = 최근 활동 피드
2. 중앙 로비 패널 최소 높이는 `Desktop 360px`, `Tablet 280px`, `Mobile 220px`를 따른다.
3. 협업 슬롯은 시각적 대칭을 위해 기본 표시 개수를 `6, 8, 10, 12` 중 하나로 정규화한다.
4. `collaborator_limit > 12`인 경우 링에는 12개까지만 그리고 초과분은 `+N` 배지로 분리한다.
5. 협업률은 링으로, 열람률은 보조 바 또는 집계 바로 표시한다. 열람률을 협업 슬롯과 같은 강도로 표현하지 않는다.
6. 허브 준비도는 `대표 의뢰인`, `공개 범위`, `초기 참여 구성`, `정책 검증`, `협업 좌석 점유율`을 기반으로 계산한다.
7. 최근 활동 피드는 기본 7개만 노출하고, 8개 이상은 더 보기 또는 Accordion을 제공한다.

### 3-13. 허브 연결 무결성 규칙

1. `HubLinkIntegrity = valid_hub_links / total_hub_links` 허용값은 `1`이다.
2. `case_hubs.case_id` 는 사건당 `1개`만 허용한다.
3. `primary_client` 계열 연결은 최소 `organization -> case -> case_client -> profile -> case_hub` 검증 체인을 통과해야 한다.
4. 연결 생성, 변경, 해제는 모두 감사 로그에 기록해야 한다.
5. 허브 좌석 상한은 `collaborator_limit`, `viewer_limit` 을 초과할 수 없다.

### 3-14. 의뢰인 해제·붕 뜬 상태 처리 규칙

1. 해제 상태는 `linked`, `detaching`, `orphaned_pending_assignment`, `archived` 로 구분한다.
2. 의뢰인 연결 해제는 물리 삭제가 아니라 상태 전이와 참조 재배치로 우선 처리한다.
3. `orphaned_pending_assignment` 상태는 일반 목록에서 숨기지 않고 복구 큐에 표시한다.
4. `OrphanRecoveryHours` 의 `p95` 목표는 `72h` 이하이다.
5. `orphaned_pending_assignment` 가 `7일`을 초과하면 플랫폼 알림을 발생시킨다.

### 3-15. 의뢰인 케어감 계산 규칙

1. `ClientCareScore = 100 * (0.25*R + 0.20*N + 0.15*S + 0.15*D + 0.10*M + 0.10*H + 0.05*P)` 공식을 따른다.
2. 변수 정의와 임계치는 `02_FORMULAS_AND_THRESHOLDS.md` 를 기준으로 구현한다.
3. `ClientCareScore < 60` 이면 케어 경고를 발생시켜야 한다.
4. 허브, 포털, 내부 담당자 목록은 동일 공식을 사용해야 한다.

### 3-16. 메뉴 검색 규칙

1. `SearchCoverage = searchable_menus / total_primary_menus` 허용값은 `1`이다.
2. 각 메뉴 검색 범위, 필드, debounce, 성능 목표, 인덱스 전략은 `06_menu_search_matrix.csv` 를 기준으로 한다.
3. 로컬 검색 debounce는 `150ms`, 서버 검색 debounce는 `250ms` 를 기본값으로 한다.
4. 서버 검색 `p95 <= 400ms`, 로컬 검색 `p95 <= 150ms` 를 목표로 한다.
5. 검색 0건일 때는 원인과 다음 행동을 함께 제시해야 한다.

### 3-17. 유료화 및 결제 잠금 UX 규칙

1. 구독 상태는 `trialing`, `active`, `past_due`, `locked_soft`, `locked_hard`, `cancelled` 로 구분한다.
2. 잠금 허용 경로와 차단 경로는 `07_subscription_lock_matrix.csv` 를 기준으로 한다.
3. `locked_soft` 상태에서는 로그인, 결제, 고객센터, 데이터 내보내기만 허용한다.
4. `locked_hard` 상태에서는 로그인, 결제, 고객센터만 허용한다.
5. 잠금 화면은 이유, 결제 CTA, 지원 CTA를 반드시 제공해야 한다.

### 3-18. 시스템 최적화 규칙

1. 모바일 `LCP <= 2.5s`, `INP <= 200ms`, `CLS <= 0.10` 을 목표로 한다.
2. 주요 목록 쿼리 `p95 <= 250ms`, 상세 조회 `p95 <= 300ms` 를 목표로 한다.
3. 메뉴 오픈 `p95` 는 PC `180ms`, 모바일 `240ms` 이하를 목표로 한다.
4. `PerfRegression = (new_p95 - baseline_p95) / baseline_p95` 가 `0.10` 을 초과하면 배포 차단 사유로 본다.

### 3-19. 마케팅 홈 프리미엄화 규칙

1. `PremiumHomeScore` 계산과 임계치는 `02_FORMULAS_AND_THRESHOLDS.md` 를 기준으로 한다.
2. Above-the-fold 블록 수는 `5개` 이하여야 한다.
3. Primary CTA 수는 정확히 `1개`, Secondary CTA는 최대 `1개` 로 제한한다.
4. 가격표는 `2 scroll` 이내에 도달 가능해야 한다.

### 3-20. AI 도입 규칙

1. AI는 `read_assist`, `draft_assist`, `triage_assist`, `summary_assist`, `search_assist` 로 구분한다.
2. AI는 irreversible action을 직접 실행해서는 안 된다.
3. `AIPILeak = ai_outputs_with_plaintext_p3 / total_ai_outputs` 허용값은 `0`이다.
4. AI latency budget 목표는 `p95 <= 2000ms` 이다.
5. 공통 가드레일 적용 대상은 `첫 화면 AI 업무 도우미`, `AI 요약 카드`, `다음 액션 추천`, `작성 보조`, `이상 징후 알림`, `관리자 운영 코파일럿` 이다.
6. 주민등록번호, 계좌번호, 카드번호, 전화번호, 이메일, 주소, 인증 토큰, 세션 ID, API Key 는 입력/출력/로그 전 구간에서 마스킹해야 한다.
7. 모델 프롬프트에는 원문 민감정보를 직접 전달하지 않는다.
8. 로그/분석 저장소에는 민감정보 원문 대신 해시 또는 부분 마스킹 값만 저장한다.
9. 첨부파일/자유입력 텍스트의 민감정보도 동일 정책으로 탐지/차단한다.
10. 사용자/조직/역할 기반 접근제어는 모델 호출 전에 서버에서 강제 검증한다.
11. 권한 없는 데이터는 조회 자체를 차단하고 응답은 `권한 없음`으로 통일한다.
12. 모델 컨텍스트는 권한 범위 최소 데이터만 포함해야 하며, 타 조직/타 허브 데이터 추론을 유도하는 컨텍스트를 금지한다.
13. 관리자 기능도 최소권한 원칙을 적용하고 예외 권한은 사유와 만료일을 기록한다.
14. 모든 AI 응답은 근거 출처를 포함해야 하며, 출처는 데이터 종류/생성 시각/조회 범위/필터 조건을 포함한다.
15. 사용자는 출처에서 원문 화면(허브/목록/상세)으로 이동 가능해야 한다.
16. 근거 불충분 응답은 `추정`으로 명시하고 자동 실행 액션을 금지한다.
17. 모든 AI 카드/응답 컴포넌트는 오답 신고 버튼을 제공해야 한다.
18. 오답 신고는 `사용자 역할, 화면, 질문, 답변, 근거, 모델 버전, 요청 ID, 시간, 신고 사유`를 구조화 저장해야 한다.
19. 오답 신고 상태는 `접수/분석중/조치완료`로 추적 관리해야 한다.
20. 반복 오답 유형은 규칙/프롬프트/권한 필터 개선 백로그에 자동 등록해야 한다.
21. 운영 기본 정책은 `Default Deny`이며, 허용된 범위만 응답한다.
22. AI 제안 액션은 사용자 최종 확인 없이 실행할 수 없다.
23. 민감정보 포함 가능 기능은 테스트 계정/테스트 데이터로만 검증해야 한다.
24. 응답 품질 지표(정확도, 재현율, 신고율, 수정 리드타임)는 주 단위로 점검한다.
25. 출시 승인은 `마스킹 테스트`, `권한 우회 테스트`, `출처 표시 링크`, `오답 신고 저장/대시보드`, `감사로그 누락`, `롤백 절차 문서화`를 모두 통과해야 한다.
26. 세부 기준은 `docs/AI_공통_필수_가드레일_및_출시승인_체크리스트.md` 를 단일 원본으로 참조한다.

### 3-21. 일괄 초대 및 생성 플로우 규칙

공통 규칙:

1. 사용자 생성, 조직원 초대, 의뢰인 초대는 `목록 → 입력 → 완료` 또는 `문맥 → 입력 → 연결 → 완료` 구조를 사용해야 한다.
2. 기본 입력 행 수는 `3`, 한 화면 최대 직접 입력 행 수는 `5`로 제한한다.
3. `5`개를 초과하는 대상은 CSV 업로드 플로우로 전환해야 한다.
4. 데스크톱 한 행의 핵심 입력 필드 수는 `4`개를 초과할 수 없다.
5. 모바일에서는 한 줄 한 필드 구조를 사용해야 한다.
6. 한 화면의 Primary CTA는 `1개`만 둘 수 있다.
7. 완료 화면은 생성 여부, 연결 여부, 발송 여부, 실패 사유를 모두 표시해야 한다.
8. `CompletionClarityScore = created + linked + delivered + failed_reason` 허용값은 `4/4`다.
9. 오류 메시지는 문제 필드에서 `80px` 이내에 노출해야 한다.

조직원 초대 규칙:

1. 조직원 초대는 `목록 → 입력 → 완료` 3단 구조를 기본으로 사용한다.
2. 신원 입력 단계와 권한 설정 단계는 분리해야 한다.
3. 초기 입력 열은 `이름, 성, 업무 이메일, 보조 이메일` 또는 동등한 4열 구조를 기준으로 설계한다.
4. `TimeToFirstInvite <= 90s`, `TimeToThreeInvites <= 180s` 를 목표로 한다.
5. 임시 비밀번호 직접 노출은 최대 `1회`만 허용한다.
6. 비밀번호 재노출은 금지하며, 복사와 노출 사실은 로그로 기록해야 한다.

의뢰인 초대 규칙:

1. 의뢰인 초대는 `문맥 → 입력 → 연결 → 완료` 4단 구조를 기본으로 사용한다.
2. 첫 단계에서 반드시 `조직, 사건, 허브` 문맥 중 필요한 연결 대상을 먼저 고정한다.
3. 표준 초대 플로우에서는 미연결 의뢰인을 남겨서는 안 된다. `PendingUnboundInviteCount` 허용값은 `0`이다.
4. 의뢰인 초대 입력 단계는 `이름, 연락 이메일 또는 휴대폰, 초대 방식, 보조 연락처` 또는 동등한 4열 구조를 기준으로 설계한다.
5. 연결 단계에서는 사건 연결, 허브 접근 범위, 공개 문서 접근, 공개 일정 접근 같은 연결 의미를 분리해 설정한다.
6. 의뢰인 초대 기본 인증은 매직링크, OTP, 또는 동등한 일회성 인증을 사용해야 한다.
7. 의뢰인 초대에서 평문 비밀번호를 직접 노출해서는 안 된다.

---

## 💬 카테고리 4: 메시지 체계 규칙

### 4-1. 토스트 문구 형식

토스트 문구는 아래 형식을 따른다.

```txt
성공:  "[대상] [동작] 완료"
실패:  "[동작] 실패 — [원인]"
경고:  "[조건] 확인 필요"
안내:  "[다음 단계/상태]"
Undo:  "[동작]됨 — [N]초 내 취소 가능"
```

예시는 아래와 같다.

```txt
사건 저장 완료
저장 실패 — 네트워크 오류
저장되지 않은 변경사항 확인 필요
초대 이메일이 발송되었습니다
보관함으로 이동됨 — 8초 내 취소 가능
```

### 4-2. 에러 메시지 금지 문구

아래 표현은 금지한다.

| 금지 | 대체 |
|------|------|
| 에러가 발생했습니다 | 저장 실패 — 네트워크 연결을 확인해 주세요 |
| 오류가 발생했습니다 | 원인과 해결 방법을 함께 제시 |
| 알 수 없는 오류 | 가능한 원인과 다음 행동을 함께 제시 |

추가 규칙은 아래와 같다.

1. 사용자 메시지에는 스택 트레이스를 노출하지 않는다.
2. 운영 로그에는 상세 에러를 남기되, UI에는 해결 가능한 언어로 번역한다.
3. 같은 실패 원인은 같은 문구로 보여준다.

### 4-3. 메시지 타입별 노출 위치

| 타입 | 위치 | 컴포넌트 |
|------|------|---------|
| 즉각 피드백 | 화면 우하단 | `useToast()` |
| 페이지/섹션 에러 | 해당 섹션 상단 인라인 | `InlineError` |
| 빈 상태 | 콘텐츠 영역 중앙 | 빈 상태 패턴 |
| 전역 경고/공지 | 헤더 하단 배너 | Banner 컴포넌트 |

### 4-4. 목록 접기 + 통합 검색 규칙 (Collapsible List + Unified Search)

목록 페이지는 반드시 `UnifiedListSearch`를 단일 원본으로 사용한다.

```tsx
import { UnifiedListSearch } from '@/components/ui/unified-list-search';

<UnifiedListSearch
  placeholder="사건명, 의뢰인, 사건번호 검색..."
  onSearch={(query) => setSearchQuery(query)}
  aria-label="목록 검색"
/>
```

```tsx
{items.length > 7 ? (
  <CollapsibleList items={items} defaultShowCount={7} label="사건" />
) : (
  items.map((item) => <ListRow key={item.id} {...item} />)
)}
```

세부 규칙은 아래와 같다.

1. 페이지별로 별도 검색 컴포넌트를 중복 구현하지 않는다.
2. 기본 표시 개수는 7개다.
3. 8개 이상이면 접기 또는 더 보기 동작을 반드시 제공한다.
4. 검색어는 가능하면 URL 쿼리 파라미터(`q`)와 동기화한다.
5. 사건, 의뢰인, 조직, 알림 목록은 같은 검색 경험을 유지한다.

### 4-5. 메시지 단일 원본 규칙

1. 반복 사용되는 사용자 메시지는 중앙 상수 또는 메시지 팩토리에서 관리한다.
2. UI는 한국어 용어를 기준으로 통일한다.
3. 감사 로그, 액션 코드, 에러 코드는 영어 식별자를 사용할 수 있다.
4. 같은 의미의 메시지를 여러 문장으로 분산 정의하지 않는다.

### 4-6. 액션 결과 계약 규칙

Server Action은 아래 원칙을 따른다.

1. 성공과 실패를 코드상에서 구분 가능한 형태로 반환하거나 일관되게 throw 한다.
2. 사용자 표시용 메시지와 로깅용 상세 원인을 분리한다.
3. 가능한 경우 `request_id` 또는 `logRef`를 포함해 운영 추적이 가능해야 한다.

예시 계약은 아래와 같다.

```ts
type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; userMessage: string; logRef?: string };
```

### 4-7. 수치 표기 및 상태 배지 규칙 (Numeric Label Rule)

프리미엄 UI는 숫자 표현이 메뉴마다 달라지지 않아야 한다.

1. 인원 수 표기는 아래 형식을 고정한다.

```txt
협업 3/5
열람 9/20
미읽음 12
```

2. 시간 표기는 아래 기준을 따른다.
   1. `0~59분` → `Xm 전`
   2. `1~23시간` → `X시간 전`
   3. `1~6일` → `X일 전`
   4. `7일 이상` → `YYYY.MM.DD`
3. `1,000` 이상 수치는 쉼표를 사용한다. `1.2k`, `3.4m` 같은 축약 표기를 금지한다.
4. 상태는 반드시 `텍스트 + 색 + 아이콘` 중 2개 이상으로 전달한다. 색만으로 상태를 전달하지 않는다.

### 4-8. 오류 메시지 현지화 및 설명 가능 규칙

1. 오류 설명 완전성 점수 `E = title + cause + next_action + single_language` 는 반드시 `4`여야 한다.
2. 한국어 UI에서는 오류 메시지를 한국어만 사용한다.
3. raw database error, stack trace, internal code, 영문 예외 객체 문구를 직접 노출하지 않는다.
4. 권한 오류는 필요한 권한 또는 조직 문맥을 명시한다.
5. 인증 오류는 재로그인 또는 세션 갱신 경로를 제시한다.

### 4-9. 알림 의미 및 행동 연결 규칙

1. 알림은 요약, 문맥, 이유, 행동 필요 여부, deep link 를 포함해야 한다.
2. 행동 필요 여부는 `지금 처리 필요`, `참조용`, `나중에 처리 가능` 중 하나로 명시한다.
3. 행동이 필요한 알림은 deep link 또는 즉시 실행 가능한 Primary CTA를 가져야 한다.
4. `읽음 처리` 와 `조치 완료` 를 같은 의미로 합치지 않는다.
5. **알림 생성 시 `destination_url` 없이 INSERT하는 것은 금지한다.** 사건 연결이 있으면 `/cases/{caseId}`, 없으면 해당 도메인 관련 화면으로 명확히 지정해야 한다.
6. **알림 클릭 fallback은 `/dashboard` 같은 generic 경로로 보내면 안 된다.** 목적지를 특정할 수 없는 경우 `/notifications`(알림센터)로 보내고, 미구현 화면이면 사용자에게 "이 알림은 아직 전용 화면이 없습니다" 메시지를 보여줘야 한다.
7. 알림 목적지가 구현 안 된 라우트를 가리키면 사용자에게 이유를 명시적으로 알려야 한다. 무음으로 대시보드·메인으로 튕기는 것은 금지한다.
8. 알림 개수, 배지, KPI 카운트는 실제 열람 가능한 알림 수와 정확히 일치해야 한다.
9. 알림을 눌렀을 때 사용자는 **어디로 가야 하는지, 왜 그리로 가는지, 거기서 무엇을 해야 하는지**를 즉시 이해할 수 있어야 한다.
10. 목적지 화면이 없거나 접근 불가라면, 그 이유와 대체 경로를 알림센터 또는 목적지 전환 화면에서 반드시 설명해야 한다.

### 4-10. 플랫폼 로그 라우팅 규칙

1. 로그 싱크는 `04_platform_log_sink_matrix.csv` 를 기준으로 한다.
2. `row_change`, `platform_decision`, `security_event`, `support_event`, `billing_event`, `notification_delivery`, `ai_action`, `performance_rum` 을 각 지정 sink로 보낸다.
3. `LogDeliveryFailure = failed_events / total_events` 목표는 `<= 0.001` 이다.

### 4-11. 모바일 알림 카드 규칙

1. 모바일 알림 카드는 `무슨 일`, `관련 조직/사건`, `받은 이유`, `행동 필요 여부`, `어디로 갈지` 를 모두 보여야 한다.
2. 중요도와 행동 필요 여부를 단순 배지 하나로 대체하지 않는다.
3. Primary CTA 높이는 `40px` 이상이어야 한다.

---

## 🏗 카테고리 5: 아키텍처 규칙

### 5-1. 사건(Case) 모델

사건은 다중 조직 참여형 협업 객체다.

1. 사건 참여 관계는 `case_organizations`를 기준으로 모델링한다.
2. 공통 탭은 `Overview`, `Communication`, `Documents`, `Schedule`, `Participants`, `Billing`, `Timeline`을 유지한다.
3. 선택 모듈은 `Collection`, `Insolvency`, `Settlement`를 사용한다.
4. `caseType` enum은 저장소 단일 원본에서 관리한다.
5. 사건 타입 확장은 카테고리 2의 enum 확장 규칙을 따른다.

### 5-2. 의뢰인 포털 권한 원칙

의뢰인 포털은 아래 범위만 허용한다.

```txt
허용: 공개 문서 보기, 공개 일정 보기, 메시지 보내기, 요청 생성, 자료 제출, 청구/입금 확인
차단: 내부 메모, 타 사건, 결재 수정, 조직 정보
```

세부 규칙은 아래와 같다.

1. 포털 사용자는 자기 사건 범위를 넘는 데이터에 접근할 수 없다.
2. 공개 여부 판단은 서버에서 수행한다.
3. 내부 메모와 내부 첨부파일은 포털에 노출하지 않는다.

### 5-3. 플랫폼 조직 메뉴 원칙

플랫폼 조직(`kind='platform_management'`) 소속 사용자는 아래 메뉴만 본다.

1. 조직 신청 관리 (`/admin/organization-requests`)
2. 조직 관리 (`/admin/organizations`)
3. 고객센터 (`/admin/support`)
4. 플랫폼 설정 (`/admin/modules`)
5. 감사 로그 (`/admin/audit`)

추가 규칙은 아래와 같다.

1. 일반 법무 메뉴는 플랫폼 관리자에게 숨긴다.
2. 플랫폼 관리 진입점은 항상 목록 또는 대시보드여야 한다.
3. 생성 폼을 기본 랜딩 화면으로 두지 않는다.

### 5-4. 플랫폼 관리자 기능 거버넌스 (Platform Admin Governance)

`isPlatformOperator(auth)`가 `true`인 사용자만 접근하는 기능은 반드시 이 섹션에 명시한다.

플랫폼 관리자 전용 기능 목록은 아래와 같다.

| 기능 | 라우트 | 설명 |
|------|--------|------|
| 조직 신청 심사 | `/admin/organization-requests` | 신규 조직 가입 승인 또는 거절 |
| 조직 관리 대시보드 | `/admin/organizations` | 전체 조직 목록 조회 및 관리 |
| 고객센터 | `/admin/support` | 사용자 문의 처리 |
| 플랫폼 설정 | `/admin/modules` | 기능 모듈 on/off |
| 감사 로그 | `/admin/audit` | 전체 액션 이력 조회 |

세부 규칙은 아래와 같다.

1. “조직검색” 버튼은 플랫폼 관리자에게만 노출한다.
2. 해당 버튼은 반드시 `/admin/organizations`로 이동한다.
3. 플랫폼 관리자 화면의 기본 진입점은 대시보드 또는 목록이어야 한다.
4. 새 플랫폼 관리자 기능을 추가하면 이 표를 먼저 갱신한다.

### 5-5. Server/Client 경계 규칙

1. Server Components를 기본값으로 사용한다.
2. Client Components는 인터랙션, 로컬 상태, 브라우저 API가 필요한 최소 범위로 제한한다.
3. `button.tsx`에는 `'use client'`를 추가하지 않는다.
4. DB 쓰기 작업을 클라이언트 컴포넌트에 직접 두지 않는다.
5. 클라이언트 컴포넌트는 서버 권한 검사의 보조 수단일 뿐이다.

### 5-6. 검증(Validation) 경계 규칙

1. 모든 외부 입력은 서버 경계에서 검증한다.
2. 폼 검증 스키마가 클라이언트와 서버에 함께 존재하더라도 서버 검증이 최종 원본이다.
3. CSV import, URL query, multipart form, JSON body는 모두 검증 대상이다.
4. 검증 실패는 사용자 메시지와 운영 로그를 분리해 처리한다.

### 5-7. 테스트 및 릴리즈 게이트 규칙

**기본 게이트 (모든 PR 필수):**
1. 머지 전 `typecheck`, `lint`, `test`, `build`, `check:migrations`, `check:test-coverage`를 모두 통과한다.
2. TODO 또는 FIXME는 이슈 번호와 제거 조건 없이 머지하지 않는다.

**기능 변경 시 테스트 동시 작성 강제 (Test-With-Feature Rule):**
3. `src/lib/actions/` 하위 파일을 신규 생성하거나 수정할 때 반드시 해당 액션을 import하는 테스트 파일을 `tests/` 하위에 함께 커밋해야 한다.
4. 신규 Server Action은 최소 한 개 이상의 성공 경로(happy path)와 실패 경로(error path) 테스트를 갖는다.
5. 권한 가드(`requireXxxAccess`)가 포함된 액션은 반드시 **권한 없는 사용자 차단** 테스트를 포함한다.
6. 신규 페이지(`src/app/**/page.tsx`)를 추가할 때 해당 라우트를 커버하는 E2E 테스트(`tests/e2e/`)를 함께 작성한다. E2E 환경이 없으면 최소한 인증 보호(미인증 → 로그인 리디렉션) 테스트 1개를 추가한다.
7. 권한, RLS, soft delete, 결제, 관리자 기능 변경은 회귀 테스트를 추가한다.

**검사 자동화:**
8. `pnpm check:test-coverage` 스크립트(`scripts/check-test-coverage.mjs`)가 위 규칙 준수 여부를 자동으로 검사한다. CI에서 반드시 실행한다.
9. 스크립트가 커버되지 않은 액션 파일을 발견하면 즉시 빌드 실패로 처리한다.

### 5-8. 관측성(Observability) 규칙

1. 모든 주요 변경 작업은 누가, 무엇을, 언제, 어떤 결과로 수행했는지 추적 가능해야 한다.
2. 예상하지 못한 실패는 요청 식별자와 함께 로그에 남긴다.
3. 운영에서 재현이 어려운 오류는 사용자 메시지에 참조 식별자를 노출할 수 있다.
4. 로그는 디버깅에 충분해야 하지만 민감정보를 과도하게 담아서는 안 된다.

### 5-9. 성능 규칙

1. 목록 화면과 대시보드에서 N+1 쿼리를 허용하지 않는다.
2. 무제한 데이터 렌더링을 금지한다.
3. 상세 화면이 아닌 곳에서는 필요한 컬럼만 선택한다.
4. 고비용 연산이 필요한 경우 캐시 또는 사전 계산 전략을 검토한다.

### 5-10. 메뉴-허브 결합 구조 규칙 (Menu-Hub Coupling Architecture Rule)

사건허브는 별도 기능이 아니라 사건 관련 메뉴를 묶는 중심축으로 설계해야 한다.

1. 메뉴 결합 티어는 아래와 같이 고정한다.
   1. `S (Flagship)` = 사건허브
   2. `A (Core)` = 사건목록, 의뢰인, 문서, 일정
   3. `B (Adjacent)` = 알림, 청구, 추심, 보고
   4. `C (External)` = 조직, 설정, 관리자 메뉴
2. 각 티어는 아래 의무를 따른다.
   1. `S` = 사건 엠블럼, 협업률, 열람률, 최근 활동, Primary CTA
   2. `A` = 허브 입장 또는 허브 상태 요약
   3. `B` = 허브 기준 필터 또는 허브 딥링크
   4. `C` = 허브 강제 없음
3. 사건 관련 메뉴에서 허브를 부를 때는 반드시 `사건허브`라는 용어를 사용한다.

### 5-11. 메뉴별 정량 설계 매트릭스 (Menu Matrix)

각 메뉴는 아래 비율과 진입 깊이 기준을 따른다.

1. 사건허브 = 데스크톱 `3:6:3`, 허브 진입 깊이 `0~1`
2. 사건목록 = 데스크톱 `8:4`, 허브 진입 깊이 `1`
3. 의뢰인/문서/일정 = 데스크톱 `7:5`, 허브 진입 깊이 `2`
4. 알림/청구/추심/보고 = 데스크톱 `7:5` 또는 `8:4`, 허브 진입 깊이 `2`
5. 조직/관리자 메뉴 = 데스크톱 `9:3`, 허브 강제 없음
6. 사건목록 행 기본 비율은 `5 : 2 : 2 : 3`을 사용한다.
7. 허브 목록 카드 기본 비율은 `4 : 4 : 4`를 사용한다.

### 5-12. 공통 디자인 프리미티브 규칙 (Shared Primitive Rule)

아래 UI 프리미티브는 사건허브 중심 디자인의 단일 원본으로 취급한다. 메뉴별 유사 컴포넌트를 중복 구현하지 않는다.

```txt
PremiumPageHeader
HubContextStrip
HubMetricBadge
HubReadinessRing
ParticipantSlotRing
PremiumCaseCard
PremiumInfoPanel
ActivityFeedPanel
```

### 5-13. Control Plane / Tenant Plane 분리 규칙

1. 플랫폼 운영 정책, 청구, 로그 라우팅, 복구 정책은 control plane 규칙으로 다룬다.
2. 조직·사건·의뢰인·허브의 개별 업무 데이터는 tenant plane 규칙으로 다룬다.
3. control plane 규칙은 tenant plane의 표시값(`slug`, `name`, UI label)에 의존하지 않는다.
4. control plane 변경은 migration, 문서, 운영 매트릭스가 함께 갱신되어야 한다.

### 5-14. 조직 복구 패키지 아키텍처 규칙

1. 조직 삭제·추방 후 복구는 CSV 패키지 기준으로 수행한다.
2. 복구 순서, PK, FK, 의존관계, 파일 순서는 `05_organization_restore_package_matrix.csv`를 단일 원본으로 사용한다.
3. 복구는 정의된 restore sequence를 따라 단계적으로 수행한다.
4. 복구 가능한 데이터와 영구 삭제 데이터는 문서와 로그에서 구분되어야 한다.

### 5-15. 구독·결제 잠금 상태머신 규칙

1. 무료 체험, 경고, 부분 잠금, 완전 잠금, 재개 상태는 단일 상태머신으로 관리한다.
2. 허용 경로와 차단 경로는 `07_subscription_lock_matrix.csv`를 기준으로 판정한다.
3. 결제 잠금 중에도 결제 재개, 청구 확인, 지원 요청 경로는 유지되어야 한다.
4. 잠금 해제는 상태 전이로만 처리하며 우회 플래그를 임시 코드로 남기지 않는다.

### 5-16. 메뉴 검색 아키텍처 규칙

1. 메뉴별 검색 범위, 필드, debounce, 성능 목표, 인덱스 전략은 `06_menu_search_matrix.csv`를 단일 원본으로 사용한다.
2. 검색 구현은 메뉴별 의미를 따르며, 동일 메뉴 안에서 별도 기준을 새로 만들지 않는다.
3. 검색 성능 목표와 인덱스 전략은 쿼리 구현과 함께 검증되어야 한다.
4. 검색은 결과 품질, debounce, 인덱스, latency를 함께 다루는 아키텍처 항목이다.

### 5-17. 로그 싱크 및 AI/운영 보조 아키텍처 규칙

1. 어떤 이벤트를 어디에 남기고 얼마 동안 보존하는지는 `04_platform_log_sink_matrix.csv`를 단일 원본으로 사용한다.
2. 사용자 알림, 감사 로그, 운영 로그, 보안 로그는 sink를 섞지 않는다.
3. AI 보조 기능은 업무 결정을 대체하지 않으며, 설명 가능성·민감정보 보호·로그 분리가 전제되어야 한다.
4. 운영 매트릭스와 실제 구현이 충돌하면 구현이 아니라 canonical matrix를 먼저 갱신한다.

### 5-18. 기능 완결성 규칙 (Functional Completeness Rule) ★★

**기능은 "존재"가 아니라 "완료 상태"로 판정한다.**

모든 기능은 아래 7단계가 끊김 없이 이어져야 완결로 간주한다.

```
생성 → 승인/연결 → 알림 발송 → 목적지 이동 → 처리(완료/보관) → 삭제/복구 → 로그
```

1. 생성 후 어디로 가야 하는지, 승인 대기인지, 관리자가 무엇을 해야 하는지가 UI와 알림으로 명확히 안내돼야 한다.
2. 알림은 생성되고, 목록에 보이고, 클릭하면 정확한 처리 화면으로 이동해야 한다.
3. 처리 완료 후 결과는 보관함 또는 해당 도메인 아카이브에 기록돼야 한다.
4. 보관함 항목은 강제 삭제 또는 복구가 가능해야 하고, 누가 언제 처리했는지 로그가 남아야 한다.
5. 어느 단계라도 중간에 끊기면 해당 기능은 미완성으로 분류한다. "버튼이 있으면 구현됐다"는 틀린 판단이다.
6. 사용자는 각 단계에서 **지금 어디 있어야 하는지, 다음엔 어디로 가야 하는지, 왜 그리로 가야 하는지, 못 가면 왜 못 가는지, 대신 어디로 가야 하는지**를 UI로 이해할 수 있어야 한다.
7. 기능 검토는 반드시 `가야 할 곳 → 도착 여부 → 처리 가능 여부 → 완료 후 다음 단계 → 보관/삭제/복구/로그` 순서로 수행한다.

---

## 🚫 카테고리 6: 절대 금지 목록

| 금지 | 대체 | 근거 |
|------|------|------|
| `window.confirm()` | `DangerActionButton` 또는 `ConfirmationModal` | 카테고리 3 |
| `alert()` | `useToast()` | 카테고리 4 |
| `<form action={fn}>` 날것 사용 | `<ClientActionForm>` | 카테고리 3 |
| `<button type="submit">` 날것 사용 | `<SubmitButton>` | 카테고리 3 |
| `.delete()` hard delete 직접 호출 | `soft_delete` 패턴 + 보관함 UI | 카테고리 2 |
| 삭제 후 복구 UI 또는 undo 없음 | `undo()` + Trash UI | 카테고리 3 |
| “에러가 발생했습니다” 같은 포괄 문구 | 원인 + 해결 방법 명시 | 카테고리 4 |
| 로딩 중 버튼 활성화 | `disabled`, `isLoading`, `useTransition` | 카테고리 3 |
| `required` 필드에 빨간 `*` 없음 | 필수 표시 추가 | 카테고리 3 |
| `placeholder`만 있고 `label` 없음 | `htmlFor`가 연결된 `<label>` | 접근성 |
| 빈 상태 화면 없음 | empty state 패턴 | 카테고리 3 |
| 메뉴 추가 후 nav 미등록 | `mode-aware-nav.tsx` 등록 | 카테고리 3 |
| 새 페이지에 서버 권한 체크 없음 | `requireXxxAccess()` 호출 | 카테고리 1 |
| `button.tsx`에 `'use client'` 추가 | 서버 호환 유지 | 스택 제약 |
| 클라이언트에 `service_role` 노출 | 서버 전용 비밀정보 관리 | 카테고리 1 |
| RLS 없는 조직 데이터 테이블 머지 | RLS 정책 작성 후 머지 | 카테고리 2 |
| 무제한 목록 전체 렌더링 | 페이지네이션 또는 접기 | 카테고리 3 |
| `select('*')` 남용 | 필요한 컬럼만 선택 | 카테고리 2/5 |
| 민감정보를 로그에 평문 저장 | 마스킹 또는 기록 금지 | 카테고리 1 |
| 이슈 번호 없는 TODO/FIXME 머지 | 이슈 링크와 제거 조건 명시 | 카테고리 5 |
| 권한 판별에 `slug`, `name`, `label` 직접 사용 | canonical function 또는 불변 식별자 기반 모델 | 카테고리 1/2 |
| 후속 migration에서 기존 테이블 `create table if not exists` 재선언 | `ALTER / DROP / ADD / INDEX / POLICY` | 카테고리 2 |
| multi-org 도메인 위에 단일 조직 권한 모델 강제 | bridge table 또는 canonical multi-org 관계 | 카테고리 5 |
| link 해제를 물리 삭제로 처리 | link state transition + lifecycle 필드 | 카테고리 2/5 |
| 알림 `destination_url` 없이 INSERT | 도메인 화면 또는 `/notifications` 명시 | 카테고리 4 (4-9) |
| 알림 fallback으로 `/dashboard` 사용 | `/notifications` + 미구현 안내 | 카테고리 4 (4-9) |
| 검증 실패 에러를 raw JSON·영문 코드로 노출 | `normalizeGuardFeedback()` + 한국어 문장 | 카테고리 3 (3-3) |
| 카드형 UI를 클릭 불가 `<div>`로만 렌더 | `<Link>` 또는 `onClick` 연결 | 카테고리 3 (3-9) |
| 배지 숫자와 실제 노출 항목 수 불일치 | 전체 노출 또는 더 보기 UI 명시 | 카테고리 3 (3-9) |
| 메뉴는 있는데 라우트가 없거나, 라우트는 있는데 메뉴가 없는 상태 | 라우트와 메뉴 동시 등록 | 카테고리 3 (3-4) |

### 6-1. 핵심 용어 정의 규칙 (Terminology)

모든 코드, 문서, UI 레이블은 아래 용어를 정확히 이 정의대로 사용한다.

| 용어 (한국어) | 용어 (영어) | 정의 | 테이블/필드 |
|-------------|------------|------|------------|
| 조직 | Organization | 플랫폼의 독립 테넌트 단위. 법무법인, 기업, 그룹 등을 포함한다. 표시용 식별자와 보안·거버넌스 식별자는 분리될 수 있다. | `organizations.id`, `organizations.slug`, `organizations.name`, `organizations.kind` |
| 의뢰인 | Client | 사건의 당사자 또는 의뢰인. 조직과 별개로 관리되며 사건 생성 시 연결된다. | `clients`, `case_clients` |
| 허브 | Hub | 사건 공유, 읽음 추적, 협업의 중앙 공간 | 관련 migration 및 공유 테이블 |
| 플랫폼 관리자 | Platform Operator | control plane registry와 `app.is_platform_admin()`가 판정하는 관리 주체 | `app.is_platform_admin()`, `organizations`, `organization_memberships` |
| 사건 | Case | 플랫폼의 핵심 업무 단위. 여러 조직이 참여하는 협업 객체 | `cases`, `case_organizations` |
| 멤버십 | Membership | 사용자와 조직 간의 소속 관계. 역할과 권한 세트를 포함한다 | `organization_memberships` |
| 스테이지 | Stage | 사건의 진행 단계 | `cases.stage_key`, `src/lib/case-stage.ts` |

### 6-2. 용어 사용 규칙

1. 한국어 UI에서는 “조직”, “의뢰인”, “허브”를 그대로 쓴다.
2. 코드 변수명과 함수명은 영어 용어를 기준으로 쓴다. 예를 들어 `organizationId`, `clientId`, `hubId`를 사용한다.
3. `slug`는 표시용·라우팅용 식별자로 사용할 수 있으나 보안 predicate나 권한 판별의 canonical key로 사용하지 않는다.
3. 새 도메인 개념을 도입할 때는 이 표에 먼저 정의한 후 구현한다.
4. 같은 개념을 다른 용어로 혼용하지 않는다.

---

## 📁 핵심 파일 위치

### UI 컴포넌트

```txt
src/components/ui/
├── button.tsx
├── enhanced-button.tsx
├── submit-button.tsx
├── client-action-form.tsx
├── danger-action-button.tsx
├── confirmation-modal.tsx
├── toast-provider.tsx
├── loading.tsx
└── inline-error.tsx
```

### 권한/인증

```txt
src/lib/auth.ts
src/lib/permissions.ts
src/lib/types.ts
```

### 주요 Actions

```txt
src/lib/actions/
├── case-actions.ts
├── organization-actions.ts
├── settings-actions.ts
├── notification-actions.ts
└── case-cover-action.ts
```

### 네비게이션

```txt
src/components/mode-aware-nav.tsx
src/components/mode-switcher.tsx
```

---

## ✅ 새 기능 구현 전 체크리스트

아래 항목을 순서대로 확인한다.

1. `PROJECT_RULES.md` 전체를 읽었는가.
2. 서버 권한 가드(`requireXxxAccess`)를 적용했는가.
3. 클라이언트 입력값을 서버에서 다시 검증하는가.
4. soft delete 대상에 `.delete()`를 직접 호출하지 않았는가.
5. 목록 기본 쿼리에서 삭제 데이터를 제외했는가.
6. 폼에 `ClientActionForm`과 `SubmitButton`을 사용했는가.
7. 파괴적 액션에 `DangerActionButton`을 사용했는가.
8. 삭제 후 `undo()` 토스트와 보관함 복구 경로를 제공했는가.
9. 필수 필드에 빨간 `*`를 표시했는가.
10. `label htmlFor`와 `input id`를 연결했는가.
11. 빈 상태 화면을 제공했는가.
12. 새 메뉴를 `mode-aware-nav.tsx`에 등록했는가.
13. 액션 성공 후 `revalidatePath()`를 호출했는가.
14. ARIA 속성을 적용했는가.
15. 타입 에러, 린트, 테스트, 빌드, 마이그레이션 검사를 통과했는가.
16. 8개 이상 목록에 접기 또는 더 보기를 제공했는가.
17. 50개 이상 목록에 서버 페이지네이션 또는 커서를 적용했는가.
18. 플랫폼 관리자 전용 기능이면 카테고리 5-4 목록에 등록했는가.
19. 플랫폼 관리자 메뉴의 기본 진입점이 목록 또는 대시보드인가.
20. 용어를 카테고리 6-1 정의와 일치하게 사용했는가.
21. 로그와 사용자 메시지에 민감정보가 노출되지 않는가.
22. 권한, RLS, soft delete 변경이면 회귀 테스트를 추가했는가.
23. 권한 판별에 `slug`, `name`, `label` 직접 비교를 사용하지 않았는가.
24. 기존 테이블을 후속 migration에서 `create table if not exists`로 재선언하지 않았는가.
25. 운영 로그, 감사 로그, 보안 로그, 사용자 알림 sink가 `04_platform_log_sink_matrix.csv`와 일치하는가.
26. 조직 삭제·복구 흐름이 `05_organization_restore_package_matrix.csv`의 순서와 의존관계를 따르는가.
27. 메뉴 검색 구현이 `06_menu_search_matrix.csv`의 범위·debounce·인덱스 전략과 일치하는가.
28. 결제 잠금/재개 흐름이 `07_subscription_lock_matrix.csv`의 허용 경로와 상태 전이를 따르는가.
