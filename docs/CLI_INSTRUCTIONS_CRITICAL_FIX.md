# CLI 지시서 — Vein Spiral 실서비스 투입 차단 이슈 복구

> 대상: Claude Code CLI (로컬)
> 작성일: 2026-04-14
> 우선순위: **Critical — 모두 해결되기 전까지 배포 금지**
> 원칙: `CLAUDE.md`의 **12개 migration squash 구조**를 단일 원본으로 삼는다. 구 파일(0059~0070)은 모두 제거.

---

## 사전 컨텍스트 (반드시 먼저 읽을 것)

1. `CLAUDE.md` — 프로젝트 규칙, 특히 "🔴 Migration 규칙" 섹션
2. `docs/migration-catalog.md` — canonical migration 정의
3. `supabase/migrations/` 현재 상태: **25개 파일 공존** (0059~0070 구 체계 13개 + 20260410000001~12 신 체계 12개)

작업 중 어떤 항목이라도 **migration 파일을 새로 추가하지 말 것**. 기존 12개(`20260410*`) 안에서만 수정한다.

---

## 🔴 Task 1 — 구 마이그레이션 파일 정리

### 현상
`supabase/migrations/`에 구 체계와 신 체계가 공존. 빈 DB에서 `supabase db reset` 실행 시 테이블·enum·트리거가 중복 CREATE되어 초기화 실패.

### 지시
1. 다음 파일을 **모두 삭제**:
   ```
   0059_audit_triggers_complete.sql
   0060_fix_case_hub_bridge_multi_role.sql
   0061_switch_case_hub_read_path_to_bridge.sql
   0062_tighten_case_share_permissions.sql
   0063_add_insolvency_case_type_and_subtype.sql
   0063_add_insolvency_enums.sql
   0064_add_insolvency_columns_and_modules.sql
   0065_document_ingestion_jobs.sql
   0066_insolvency_creditors_and_addresses.sql
   0067_collateral_vehicle_registry.sql
   0068_priority_claims_and_rulesets.sql
   0069_repayment_plan_engine.sql
   0070_filing_bundles_and_client_packets.sql
   ```

2. 삭제 전, 각 구 파일의 내용이 신 체계(`20260410000001~12`)에 **이미 반영되어 있는지 diff로 검증**한다.
   - 누락된 정의가 있다면 해당 도메인 파일(`20260410000003_core_tables.sql` 등)의 **기존 CREATE TABLE 블록에 직접 추가**한다.
   - 새 migration 파일을 만들지 말 것.

3. 검증 명령:
   ```bash
   ls supabase/migrations/ | wc -l   # 기대값: 12
   ```

### 완료 기준
- `supabase/migrations/` 파일 수 = 12
- 각 파일명이 `20260410000001_`~`20260410000012_` 패턴에 정확히 일치

---

## 🔴 Task 2 — `check-migrations.mjs` 정규식 업데이트

### 현상
`scripts/check-migrations.mjs` 5번째 줄:
```js
const migrationPattern = /^(\d{4})_(.+)\.sql$/;
```
4자리 버전만 허용하므로 `20260410000001_*` (12자리)를 거부. CI의 `check:migrations`가 100% 실패.

### 지시
1. 정규식을 신 체계 파일명에 맞게 수정:
   ```js
   const migrationPattern = /^(\d{14})_(.+)\.sql$/;
   ```
2. `version` 파싱도 `Number.parseInt` 대신 **문자열 비교**로 변경 (14자리는 Number 안전범위 초과 가능):
   ```js
   return { fileName, version: match[1] };
   ```
3. `seenByVersion` 중복 체크 및 순차 검증 로직을 14자리 문자열 기반으로 재작성.
4. `allowedDuplicateFiles` 상수는 비워도 무방 (구 파일 전부 제거 후).
5. `package.json`의 `"check:migrations"` 스크립트가 이 파일을 호출하는지 확인.

### 완료 기준
```bash
node ./scripts/check-migrations.mjs
# 출력: "Migration validation passed for 12 files (12 unique versions)."
```

---

## 🔴 Task 3 — `rate_limit_buckets` 테이블 정의 추가

### 현상
`src/lib/rate-limit.ts`가 `rate_limit_buckets` 테이블을 쿼리하지만 `supabase/migrations/` 전체에 정의 없음. 로그인/초대/액션 제출 시 런타임 에러.

### 지시
1. `src/lib/rate-limit.ts`를 읽고 실제로 사용하는 컬럼을 확정한다 (최소 예상: `key`, `bucket_start`, `count`, `updated_at`).
2. **`20260410000004_platform_governance.sql`** (플랫폼 운영/레이트리밋 도메인)의 **끝에** 다음 블록을 추가:
   ```sql
   CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
     key         text PRIMARY KEY,
     bucket_start timestamptz NOT NULL,
     count       integer NOT NULL DEFAULT 0,
     updated_at  timestamptz NOT NULL DEFAULT now()
   );
   COMMENT ON TABLE public.rate_limit_buckets IS 'Rate limit token buckets keyed by action:identifier.';
   -- NOTE: indexes → 011, RLS → 010
   ```
3. **`20260410000010_rls_policies.sql`**에 RLS 정책 추가:
   ```sql
   ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
   CREATE POLICY rate_limit_buckets_service_only
     ON public.rate_limit_buckets
     FOR ALL TO service_role USING (true) WITH CHECK (true);
   ```
   (일반 유저는 직접 접근 금지, `service_role`만 허용)
4. **`20260410000011_indexes.sql`**에 인덱스 추가:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_bucket_start
     ON public.rate_limit_buckets (bucket_start);
   ```

### 완료 기준
- `supabase db reset` 후 `\d public.rate_limit_buckets` 성공
- `src/lib/rate-limit.ts` 함수 호출 시 런타임 에러 없음

---

## 🟠 Task 4 — `section_order` → `section_number` 통일

### 현상
`src/lib/queries/rehabilitation.ts:238`이 `.order('section_order')`를 호출하지만, 액션(`rehabilitation-actions.ts`)·탭(`rehab-plan-tab.tsx`)·문서생성(`document-generator.ts`)은 모두 `section_number` 사용. 변제계획 섹션 조회 쿼리가 "column does not exist" 에러로 실패.

### 지시
1. `src/lib/queries/rehabilitation.ts`의 `.order('section_order')`를 `.order('section_number')`로 수정.
2. 다른 곳에 `section_order` 참조가 남아 있는지 전역 grep:
   ```bash
   grep -rn "section_order" src/ supabase/
   ```
3. 발견되는 모든 참조를 `section_number`로 교체.
4. `rehab_plan_sections` 테이블 스키마(`20260410000008_rehabilitation.sql` 또는 해당 도메인) 컬럼명이 `section_number`인지 재확인. 아니라면 테이블 정의를 수정 (새 migration 금지, **기존 CREATE TABLE 문을 직접 수정**).

### 완료 기준
```bash
grep -rn "section_order" src/ supabase/    # 결과 없음
npm run typecheck                           # 통과
```

---

## 🟠 Task 5 — `cover/page.tsx` 조직/사건 스코프 가드 추가

### 현상
`src/app/(app)/cases/[caseId]/cover/page.tsx`의 `getCaseCoverData()`가 `requireAuthenticatedUser()`만 호출하고 조직/사건 범위 권한 체크 없음. RLS에만 의존하는 방어심층 위반.

### 지시
1. 기존 `requireCaseAccess(caseId)` 또는 유사 헬퍼가 `src/lib/auth.ts`나 `src/lib/permissions/`에 있는지 확인.
2. 없으면 다음을 호출하도록 수정 (이미 다른 case 페이지에서 쓰는 패턴 따라가기):
   ```ts
   const { user, orgId } = await requireCaseAccess(caseId);
   ```
3. 쿼리의 `.eq('id', caseId)`에 `.eq('organization_id', orgId)`도 추가.
4. 동일 패턴 위반이 `src/app/(app)/cases/[caseId]/*/page.tsx` 전체에 있는지 grep:
   ```bash
   grep -rL "requireCaseAccess\|requireOrgAccess" src/app/\(app\)/cases/\[caseId\]/
   ```
   누락된 페이지 전부 동일 방식으로 보강.

### 완료 기준
- `cases/[caseId]/` 하위 모든 page.tsx가 서버 레이어에서 조직/사건 스코프를 명시적으로 검증
- typecheck 통과

---

## 🟡 Task 6 — 사건 생성 원자성 보장

### 현상
`createCaseAction`이 `cases` 테이블 insert와 `case_handlers` insert를 별도 쿼리로 처리. 두 번째 insert 실패 시 고아 `cases` 레코드 발생.

### 지시
1. `src/lib/actions/`에서 `createCaseAction` (또는 `createCase`) 정의를 찾는다.
2. `supabase.rpc('create_case_atomic', { ... })` 형태로 **단일 RPC 호출**로 재작성.
3. 해당 RPC는 `20260410000009_functions_and_triggers.sql`에 `CREATE OR REPLACE FUNCTION public.create_case_atomic(...)`로 추가. 함수 본문은 단일 트랜잭션 안에서 `cases` + `case_handlers` + 관련 기본 레코드를 모두 insert.
4. `SECURITY DEFINER` + `SET search_path = public` 적용.
5. 해당 함수에 대한 GRANT를 `20260410000010_rls_policies.sql` 끝에 추가.

### 완료 기준
- 서버 액션이 단일 RPC 호출로 완결
- 중간 실패 시 전체 롤백되는지 수동 테스트 (일부러 invalid handler 넣어서 실패 유도)

---

## 🟡 Task 7 — 감사 리포트 나머지 항목 추가 검증

다음 항목은 위 6개 Task 완료 후 확인:

1. `organizations.source_signup_request_id` FK 존재 여부
2. `case_clients.last_linked_hub_id` FK / 인덱스
3. rehab/bankruptcy 서브페이지의 `assigned_cases_only` 정책 우회 경로
4. 전체 페이지에서 `select('*')` 남용 지점 (→ 필요한 컬럼만 지정)
5. N+1 쿼리 지점 (특히 사건 목록 + 관련 데이터 로드)

각 항목은 발견 시 개별 PR로 분리.

---

## 공통 작업 규칙

- **절대 하지 말 것**:
  - 새 migration 파일 추가 (0098_xxx.sql 같은 증분 파일 금지)
  - `main`에 직푸시 (schema 변경은 반드시 PR)
  - 본인이 하지 않은 staged 변경 건드리기
  - `--no-verify`, `--no-gpg-sign` 같은 훅 우회 플래그 사용

- **각 Task 완료 시 실행**:
  ```bash
  npm run typecheck
  npm run lint
  npm run test
  npm run build
  node ./scripts/check-migrations.mjs
  ```
  전부 통과해야 커밋.

- **커밋 단위**:
  - Task 1 + Task 2: 한 커밋 ("chore(db): remove legacy migrations & update validator regex")
  - Task 3: 한 커밋 ("feat(db): add rate_limit_buckets table with RLS & index")
  - Task 4: 한 커밋 ("fix(rehab): align section_order references to section_number")
  - Task 5: 한 커밋 ("fix(security): enforce org/case scope guard on cover page")
  - Task 6: 한 커밋 ("refactor(cases): make case creation atomic via RPC")

- **브랜치 전략**:
  - `fix/migration-squash-recovery` 브랜치 생성
  - Task 1~3까지 한 PR로 묶어 먼저 머지 (CI가 이 상태로 다시 통과해야 나머지 진행 가능)
  - Task 4~6은 각각 별도 PR

- **에러 발생 시**:
  - `supabase db reset` 실패 로그를 그대로 기록하고 즉시 중단
  - 사용자에게 현재 상태 보고 후 진행 여부 확인

---

## 최종 검증 (모든 Task 완료 후)

```bash
# 1. 파일 수 확인
ls supabase/migrations/ | wc -l           # = 12

# 2. CI 풀체인
npm run typecheck && \
npm run lint && \
npm run test && \
npm run build && \
node ./scripts/check-migrations.mjs

# 3. DB 초기화
supabase db reset
# 에러 없이 12개 migration 순차 적용 성공

# 4. 런타임 smoke test
npm run dev
# /cases/[임의 caseId]/cover 접근 시 타 조직 caseId는 차단되는지 확인
# 로그인 rate limit 동작 확인
```

4단계 모두 통과해야 "실서비스 투입 가능" 판정.

---

## 보고 포맷

각 Task 완료 시 다음 형식으로 보고:

```
## Task N 완료
- 변경 파일: [...]
- 커밋 해시: [...]
- 검증 결과: typecheck ✅ / lint ✅ / test ✅ / build ✅ / check:migrations ✅
- 이슈: (있으면)
```

모든 Task 완료 후 한 번에 사용자에게 보고 금지 — **각 Task 완료 시점마다 중간 보고**하되, "다음 지시 주세요"라고 묻지 말고 다음 Task를 즉시 시작한다 (CLAUDE.md 작업 방식 원칙).
