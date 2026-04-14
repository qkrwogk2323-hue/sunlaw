# 규칙 executable화 로드맵

> 작성: 2026-04-14
> 배경: 1·2차 수정(04d9470, a05825f, 6e49399, 88cca57)으로 4개 축이 고정됐고,
> 남은 2축을 install해야 "총체적 난국"이 재발하지 않는다.

## 전제 — 이미 고정된 규칙 4축

| 축 | 상태 | 집행 위치 |
|---|---|---|
| Migration forward-only | ✅ 고정 | `scripts/check-migrations.mjs` (14자리 timestamp + strictly increasing) + CLAUDE.md 규칙 개정 + hotfix 네이밍(`YYYYMMDDHHMMSS_*.sql`) |
| 사건 접근 규칙 통일 (rehabilitation 한정) | ✅ 고정 | 페이지 `requireCaseAccess` (`src/lib/case-access.ts`) / 액션 `checkCaseActionAccess` / DB `app.can_access_case` (20260414000002) |
| 사건 생성 원자성 | ✅ 고정 | `create_case_atomic` RPC 18파라미터 (20260414000001) + `createCaseCoreWrite` 단일 호출 |
| 인증 진입 경로 복구 | ✅ 고정 | `rate_limit_buckets` 테이블 + RLS + 인덱스 + HTTP 계약 unit test 17건 |

## 남은 2축 — 현재 공백

### 축 5. 스키마 계약 자동 고정

**현상**: `case_clients.client_id`, `section_order` 같은 존재하지 않는 컬럼 참조가
typecheck를 통과하고 런타임에서야 터진다. Supabase 클라이언트가 `.select(...)` 문자열을
타입과 연결하지 못하기 때문.

**처방**: `supabase gen types typescript` 파이프라인 도입.

**단계**:
1. `pnpm supabase:gen-types` 스크립트 추가 → `src/types/supabase.ts` 생성
2. `createSupabaseServerClient<Database>`, `createSupabaseAdminClient<Database>`로
   모든 클라이언트 생성부 타입화
3. 쿼리 사이트의 `select`/`eq`/`order` 문자열이 타입 체크되도록 전환
   (일부는 overload로, 일부는 쿼리 빌더 유틸로)
4. `pnpm typecheck`에 `supabase:gen-types --dry-run` 선행 — 원격 스키마와 타입이
   어긋나면 CI 실패
5. `scripts/check-schema-contract.mjs` 신설 — `SELECT column_name FROM
   information_schema.columns` 결과와 `src/types/supabase.ts`의 `Database['public']
   ['Tables'][...]['Row']` 키셋이 일치하는지 검증

**완료 기준**: 앞으로 `section_order` 같은 오타는 `pnpm check` 단계에서 실패로 보고됨.

### 축 6. 문서 생성 영속화

**현상**: 개인회생/파산 문서 탭은 HTML Blob을 즉시 브라우저에서 다운로드하고 끝. DB에
흔적 없음 → 재생성 불가, 감사 추적 불가, 의뢰인 포털 공유 불가.

**처방**: 생성 → 스토리지 저장 → `case_documents` 행 기록의 3-step 파이프라인.

**단계**:
1. Supabase Storage 버킷 `case-documents` (있으면 재사용) + RLS 정책
2. `src/lib/documents/persistence.ts` 신규 — 공통 저장 어댑터
3. `generateRehabDocument` / `generateBankruptcyDoc` 서버 액션이 HTML 반환 대신
   스토리지에 쓰고 `case_documents` 행을 생성 → 클라이언트는 storage URL 수신
4. 문서 이력 UI: 사건 문서함에서 생성 시각, 버전, 입력 데이터 스냅샷 확인
5. `case_documents` RLS도 `app.can_access_case` 기준으로 정렬

**완료 기준**: 문서 탭에서 생성한 개인회생 신청서가 사건 문서함에 자동 등재되고,
의뢰인 포털에서 공유 가능하며, 재다운로드가 가능.

## 범위 확장 — 이미 고정된 규칙을 남은 도메인에 적용

### 확장 A. `app.can_access_case` 적용 범위

현재 rehabilitation_* 11개 테이블만. 다음 테이블도 같은 기준으로 RLS 재작성 필요:

- `bankruptcy_*` (현재 `bankruptcy` prefix 테이블이 있다면)
- `insolvency_creditors`, `insolvency_repayment_plans`, `insolvency_collaterals`,
  `insolvency_client_action_packets`, `insolvency_client_action_items`,
  `insolvency_ruleset_constants`
- `case_documents`, `case_document_reviews`
- `case_requests`, `case_request_attachments`
- `case_schedules`, `case_recovery_activities`
- `case_messages`
- `case_parties`, `case_party_private_profiles`

각 테이블별로 기존 RLS를 읽고 `case_id` 기반 접근인지 확인한 뒤, 새 hotfix migration
에서 `USING (app.can_access_case(case_id))`로 일괄 교체.

### 확장 B. `checkCaseActionAccess` 적용 범위

현재 rehabilitation-actions(16), bankruptcy-document-actions(2),
insolvency-actions(7)만 적용. 추가 대상:

- `case-actions.ts` (이미 `requireOrganizationActionAccess` 사용 중이지만 case-level
  scope 체크 없음)
- `case-hub-actions.ts`
- `client-management-actions.ts`
- `case-document-*` 관련 액션

### 확장 C. 복합 FK `(case_id, organization_id)` 적용 범위

현재 `rehabilitation_applications`, `rehabilitation_creditors`만. 다음도 같은
쌍 컬럼을 가졌다면 FK 추가:

- `rehabilitation_creditor_settings`, `rehabilitation_properties`,
  `rehabilitation_property_deductions`, `rehabilitation_family_members`,
  `rehabilitation_income_settings`, `rehabilitation_affidavits`,
  `rehabilitation_plan_sections`, `rehabilitation_secured_properties`
  → 단, `organization_id` 컬럼이 없는 테이블은 FK 불가(RLS만으로 정합성 보장)
- `insolvency_creditors`, `insolvency_repayment_plans` 등

## 부수 정리 과제

### P1. `rehabilitation_prohibition_orders` 원격 드리프트

로컬 migration 008에는 정의돼 있으나 원격 DB에 존재하지 않음. 앱 액션
`upsertProhibitionOrder`는 원격에서 호출 시 실패. Hotfix migration으로
`CREATE TABLE IF NOT EXISTS` + RLS + 인덱스 복구 필요.

### P2. 단일 출처(Single Source of Truth) 강화

현재:
- Management roles: TS `isManagementRole` + DB 함수 각각
- `case_scope_policy` 기본값: DB enum + TS 폴백 리터럴 각각
- Handler role: 한때 `'담당'` vs `'case_manager'` 공존 → 88cca57에서 통일됨

처방: SSOT 후보 3곳을 CLAUDE.md에 명시하고, 변경 시 PR 체크리스트에 포함.

### P3. 구버전 문서 정리

squash 이후 상태와 맞지 않는 문서:
- `supabase/MIGRATION_SQUASH_GUIDE.md`
- `docs/migration-catalog.md`
- `docs/마이그레이션_스키마_설명서_0001_0070.md`
- `docs/사용자필수_운영변경_가이드.md`

→ `docs/archive/`로 이동하거나, 현재 상태 기준으로 전면 개정.

## 실행 순서 제안

1. **축 5 (supabase gen types)** — 가장 낮은 리스크 + 모든 이후 작업의 안전망
2. **확장 A (`app.can_access_case` 전체 적용)** — 보안 경계 완결
3. **P1 (prohibition_orders 드리프트)** — 단발성 복구, 쉬움
4. **축 6 (문서 영속화)** — 범위가 큰 설계 작업, 축 5 타입 안전망이 있을 때 안전
5. **확장 B / C** — 축 5, 6이 끝난 후 정리 작업
6. **P2 / P3** — 지속 유지보수, 언제든 가능

## 원칙 (재확인)

- 이 로드맵 완료 전까지 **새 기능 추가 금지**
- 모든 DB 변경은 **forward-only hotfix migration**
- 테스트는 항상 **현재 구현 계약**에 맞춰 작성 (미래 계약 금지)
- 규칙은 반드시 **실행 가능한 코드/정책**으로 내려와야 함 (문서만으로는 안 됨)
