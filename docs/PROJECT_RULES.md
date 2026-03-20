# Vein Spiral — 프로젝트 통합 규칙 (PROJECT_RULES.md)

> 이 파일은 Vein Spiral 저장소의 최상위 단일 원본(Single Source of Truth)이다.
> 기능 구현, 버그 수정, UI 변경, DB 마이그레이션, 권한 변경, 릴리즈 전 검토는 모두 이 문서를 기준으로 판단한다.
> 규칙이 바뀌면 같은 PR에서 `docs/UX_RULES.md`, `CLAUDE.md`, `.github/copilot-instructions.md`를 함께 동기화한다.

문서 버전: 2.0.0  
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

같은 수준의 규칙이 충돌하면 더 보수적인 해석을 택한다.

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
플랫폼 조직 = organizations 테이블에서 is_platform_root=true 이고 kind='platform_management'인 단일 조직
플랫폼 관리자 = 플랫폼 조직 소속 org_owner 또는 org_manager 멤버
```

세부 규칙은 아래와 같다.

1. `isPlatformOperator(auth)`는 플랫폼 조직 소속 관리자인지 확인한다.
2. `hasPlatformManagementMembership(auth)`는 같은 의미로만 사용한다.
3. `PLATFORM_ORGANIZATION_SLUG`는 저장소 상수 한 곳에서만 관리한다.
4. 플랫폼 관리자 여부를 UI 문자열이나 슬러그 비교로 직접 판정하지 않는다. 반드시 공용 함수로 계산한다.

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

1. 머지 전 `typecheck`, `lint`, `test`, `build`, `check:migrations`를 모두 통과한다.
2. 권한, RLS, soft delete, 결제, 관리자 기능 변경은 회귀 테스트를 추가한다.
3. 신규 Server Action은 최소 한 개 이상의 성공 경로와 실패 경로 테스트를 갖는다.
4. TODO 또는 FIXME는 이슈 번호와 제거 조건 없이 머지하지 않는다.

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

### 6-1. 핵심 용어 정의 규칙 (Terminology)

모든 코드, 문서, UI 레이블은 아래 용어를 정확히 이 정의대로 사용한다.

| 용어 (한국어) | 용어 (영어) | 정의 | 테이블/필드 |
|-------------|------------|------|------------|
| 조직 | Organization | 플랫폼의 독립 테넌트 단위. 법무법인, 기업, 그룹 등을 포함한다. `slug`가 고유 식별자다. | `organizations.slug`, `organizations.name`, `organizations.kind`, `organizations.is_platform_root` |
| 의뢰인 | Client | 사건의 당사자 또는 의뢰인. 조직과 별개로 관리되며 사건 생성 시 연결된다. | `clients`, `case_clients` |
| 허브 | Hub | 사건 공유, 읽음 추적, 협업의 중앙 공간 | 관련 migration 및 공유 테이블 |
| 플랫폼 관리자 | Platform Operator | `is_platform_root=true` 이고 `kind='platform_management'`인 조직 소속 관리 멤버 | `organizations`, `organization_memberships` |
| 사건 | Case | 플랫폼의 핵심 업무 단위. 여러 조직이 참여하는 협업 객체 | `cases`, `case_organizations` |
| 멤버십 | Membership | 사용자와 조직 간의 소속 관계. 역할과 권한 세트를 포함한다 | `organization_memberships` |
| 스테이지 | Stage | 사건의 진행 단계 | `cases.stage_key`, `src/lib/case-stage.ts` |

### 6-2. 용어 사용 규칙

1. 한국어 UI에서는 “조직”, “의뢰인”, “허브”를 그대로 쓴다.
2. 코드 변수명과 함수명은 영어 용어를 기준으로 쓴다. 예를 들어 `organizationId`, `clientId`, `hubId`를 사용한다.
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
