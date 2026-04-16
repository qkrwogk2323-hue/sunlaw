# 배포 차단 보고서 — Fresh DB Replay 결함

> ⚠️ **CLOSED 2026-04-15** — 이 차단 보고는 해소됐다.
> 해소 경로: branch replay 포기 → `veinspiral-staging` 별도 프로젝트 신설 + preprocessor 기반 migration 적용 + schema parity 확인.
> 최종 승인 문서: `docs/RELEASE_APPROVAL_2026-04-15.md` (판정: 실서비스 투입 가능, 근거 커밋 `8187712`).
> 해소 커밋: `a56733e` (staging 분리), `01aa39e` (잔여 CI 수정), `96435e3` (승인 문서).
>
> ---
>
> 작성: 2026-04-14 (2회 갱신)
> 상태(당시): **실서비스 투입 불가 판정의 근거**
> 분류: 배포 재현성 (Deployment Reproducibility)
> 판정(당시): **Iterative patch 전략 폐기 — 근본 재정비 필수**

## 1. 결론

`supabase/migrations/20260410000001~012` squash 파일은 **빈 DB에서 replay가 불가능한 상태**다.
운영 DB는 squash 이전 historical 경로로 적용돼 정상 작동하지만, fresh DB(branch/staging/dev)에서
동일 migration을 재생하면 migration 간 또는 파일 내부에 산재한 forward-reference 때문에 실패한다.

**Branch 6회 iteration에서 5개 결함 클래스 식별. iterative patch는 분명히 실패 전략.**

## 2. 실행 증적 — Branch 시도 6회

| Branch | project_ref | 결과 | 실패 지점 | 발견된 결함 클래스 |
|---|---|---|---|---|
| v1 | chxvceylurookduwagbx | MIGRATIONS_FAILED | 001 | hotfix placeholder (선결) |
| v2 | cvkimgttfyzaylxcxjvg | MIGRATIONS_FAILED | 001 | **#1: SQL 함수 forward-ref (sql → plpgsql)** |
| v3 | vzbetcqtiksoqkpcueic | MIGRATIONS_FAILED | 003 | **#2: 타입명 오타** |
| v4 | bxdwklrcdpzescipfpjn | MIGRATIONS_FAILED | 004 | **#3: canonicalization raise exception** |
| v5 | yebyuvdfewjmxsgydpih | MIGRATIONS_FAILED | 005 | **#4: Agent 전수조사 ordering 정리 결함 다수 (008/009/011/012)** |
| v6 | bhphymosyfptrxdodcww | MIGRATIONS_FAILED | **005 내부** | **#5: 같은 파일 내 RLS 정책이 함수 정의보다 먼저 실행** |

## 3. 이 세션에서 수정한 결함 5종 (8 migration 파일)

### 3.1 001 — SQL 함수 forward-ref
- `app.is_platform_admin` / `is_org_member` / `is_org_manager` / `is_org_staff` 전부 `language sql` → `plpgsql`
- 로컬 + 원격 schema_migrations statements UPDATE

### 3.2 003 — 타입명 오타
- `public.case_billing_party_kind` → `public.billing_party_kind` (실제 enum은 002에서 후자로 정의)

### 3.3 004 — Canonicalization 예외
- Platform org 조직이 없을 때 raise exception → raise notice + skip

### 3.4 008 — SQL 문법 오류
- `ADD CONSTRAINT IF NOT EXISTS ...` (Postgres 미지원) → `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`

### 3.5 009 — Public wrapper + 자체 forward-ref
- `public.approve_organization_signup_request_atomic` / `public.cancel_organization_signup_request_atomic` 두 wrapper `language sql` → `plpgsql`
- `app.can_view_case` / `app.can_view_case_billing` 두 함수 `language sql` → `plpgsql` (내부에서 미래 line의 `is_case_client` 등 참조)

### 3.6 011 — Phantom column 인덱스
- `idx_case_hubs_primary_case_client_id` — `primary_case_client_id` 컬럼은 실제로 존재하지 않음 (005에서 `primary_client_id`만 정의). 인덱스 제거.

### 3.7 012 — Phantom 컬럼 INSERT + pg_cron 미지원
- `insolvency_ruleset_constants` INSERT가 존재하지 않는 컬럼(`category`, `value_number`, `unit`, `maintenance_mode`) 사용 → 007의 실제 컬럼(`display_name`, `legal_basis`, `value_amount`, `value_pct`, `notes`)으로 정렬
- `pg_cron` / `pg_net` 확장 설치가 branch/free-tier에서 실패 → graceful skip (`DO $$ EXCEPTION WHEN others THEN raise notice`)
- 연결된 cron.schedule 호출 섹션(statements 13~20) 전부 graceful skip

## 4. 미해결 — v6에서 드러난 5번째 결함 클래스

**결함**: 005_collaboration.sql 파일 내부에서 RLS 정책 생성이 함수 정의보다 **먼저** 실행됨.

구체적으로: `case_hub_organizations_select` 정책이 `app.is_case_hub_org_member()`를 참조하는데,
같은 파일 내에서 정책 생성 후 line 380에 함수 정의가 있음. 생성 시점 함수 미존재로 실패.

이건 Agent 전수조사에서 찾아내지 못한 **클래스 5 결함** — 파일 **내부** forward-ref. 이전 4개
결함 클래스는 migration 간 ordering이었으나, 이건 한 파일 내에서도 ordering이 깨져 있음.

## 5. Iterative patch 전략 폐기 근거

- Branch 6회, 8개 migration 파일 수정, 5개 결함 클래스 식별. 여전히 다음 결함이 있음.
- squash 파일 작성 시점에 **객체 의존 순서가 체계적으로 정리되지 않았음**이 확정.
- 개별 결함 수정으로는 끝이 없음. 어느 시점에 모두 고쳐도 다음 브랜치에서 새 클래스가 나올 가능성 높음.
- 시간과 비용 측면에서 비합리적.

## 6. 권장 복구 방식 — B (근본 재정비)

### 6.1 pg_dump 기반 전면 재작성
현재 운영 DB에서 `pg_dump --schema-only --no-owner --no-privileges` 추출 후, 객체 종류별로
엄격하게 정렬된 새 squash 파일 세트 작성.

정렬 순서:
```
1. Extensions (pgcrypto, citext, pg_trgm, uuid-ossp)
2. Schemas (app, audit)
3. Types / Enums
4. Tables (의존 그래프에 따라 참조 없는 것부터)
5. Indexes
6. Functions (전부 plpgsql 또는 self-contained sql)
7. Triggers
8. Row Level Security Policies
9. Seed Data (idempotent, fresh DB 호환)
```

### 6.2 Tooling 권장
- `pg_dump` 직접 사용
- 또는 `supabase db dump --schema-only`
- 생성된 단일 파일을 의존 순서에 따라 분할 (12개 유지 or 1 파일)

### 6.3 검증
- 빈 DB에 새 파일 적용 → 성공 확인
- 운영 DB의 현재 상태와 diff — 차이 0
- CI gate에 `pnpm check:migrations` + `fresh apply` 추가

### 6.4 대안 — 단일 파일 squash
복잡도 때문에 12개 파일 유지가 어려우면, 단일 `20260415000000_full_schema.sql`로 전체 dump.
파일명만 새 timestamp로 하고 기존 12개는 archive로 이동.

## 7. 본 세션 산출물

**로컬 수정**:
- `supabase/migrations/20260410000001_extensions_and_schemas.sql`
- `supabase/migrations/20260410000003_core_tables.sql`
- `supabase/migrations/20260410000004_platform_governance.sql`
- `supabase/migrations/20260410000008_rehabilitation.sql`
- `supabase/migrations/20260410000009_functions_and_triggers.sql`
- `supabase/migrations/20260410000011_indexes.sql`
- `supabase/migrations/20260410000012_seed_data.sql`

**원격 schema_migrations statements UPDATE**:
- 8개 migration 엔트리의 statements 배열 (fresh apply 호환 버전으로 교체)

**Branch 전부 삭제**:
- 비용 정지

**로컬 테스트**:
- check-migrations 20 files pass
- vitest 263 passed + 5 skipped (변동 없음)

## 8. 종료 기준 유지

1. **fresh DB apply 통과** — ❌ (근본 재정비 필요)
2. upgrade apply 통과 — ⬜
3. branch/staging 생성 성공 — ⬜
4. live auth · 보안 E2E · UI 구조개선 — ⬜

## 9. 다음 라운드 인계

### 9.1 수행자가 받을 것
- 이 문서
- 8개 로컬 migration 파일의 부분 수정본 (그대로 사용 가능하거나 참고용)
- 6번의 branch 시도 로그 (Supabase postgres logs에서 확인 가능)

### 9.2 첫 작업
- 운영 DB에서 `supabase db dump --schema-only > current_schema.sql` 실행
- 객체 종류별 정렬 후 새 squash 파일 세트 작성
- 빈 로컬 DB(`docker run -d postgres:17`)에 apply하여 검증

### 9.3 완료 기준
- `pnpm supabase db reset` 또는 빈 DB에 전체 migration 경로 apply 성공
- MCP `create_branch`로 staging 생성 성공
- 그 이후에야 UI 구조개선 / live auth / 보안 E2E 착수

---

**한 줄 결론**: Iterative patch는 끝이 안 남. 현재 squash 파일은 폐기·재생성이 유일한 경로다.
