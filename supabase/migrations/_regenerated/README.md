# 재생성 squash 경로 (Regenerated squash path)

## 배경

`docs/DEPLOYMENT_BLOCKER_FRESH_DB_REPLAY.md` 판정에 따라, 기존 `20260410000001~012` squash + 14자리 hotfix 파일들이 fresh DB에서 replay 불가한 상태(5종 결함 클래스 확인). iterative patch 전략은 폐기되었고, 운영 DB를 ground truth로 한 재작성이 유일한 경로로 확정됨.

## 추출 방법

pg_dump 직접 실행이 환경상 차단(IPv6 no route + pooler auth 실패 + Docker 미가동)되어 MCP `execute_sql`을 통한 pg_catalog introspection으로 추출함. 기능상 `pg_dump --schema-only` 등가.

추출 대상 스키마: `public`, `app`, `audit` + `auth.users` 트리거 + `storage.buckets` 시드.

## 파일 구조 (엄격한 의존 순서)

| 파일 | 내용 | 라인 수 |
|------|------|---------|
| 001_extensions_schemas_types.sql | 4 extensions + 2 schemas (`app`, `audit`) + 64 enums | 284 |
| 002_sequences_and_tables.sql | 1 sequence + 91 tables + PK/UNIQUE/CHECK | 1895 |
| 003_foreign_keys.sql | 299 FK (ALTER TABLE ADD CONSTRAINT) | 304 |
| 004_functions.sql | 46 functions (30 plpgsql → 16 sql) | 1750 |
| 005_triggers.sql | 149 application triggers + 1 auth trigger | 459 |
| 006_rls_policies.sql | 91 RLS enable + 192 policies | 782 |
| 007_indexes.sql | 132 non-PK/non-UNIQUE indexes | 138 |
| 008_seed_data.sql | 184 seed rows (11 tables) | 212 |

## 의존 순서 보장

- **extensions → schemas → types**: enum 타입은 `public` 스키마에만 있음 (앱/audit에는 없음)
- **types → tables**: 91개 테이블의 enum 컬럼은 모두 001에서 정의된 타입 참조
- **tables → FK**: FK 제약은 별도 배치(003)로 분리하여 순환 의존 회피
- **tables → functions**: 모든 function body가 참조하는 테이블은 이미 존재
- **functions → triggers**: trigger의 EXECUTE FUNCTION 대상은 이미 존재
- **tables + functions → RLS policies**: policy의 `app.*` 함수와 테이블 모두 존재
- **tables → indexes**: 인덱스 대상 테이블 존재
- **tables → seed**: seed 대상 테이블 존재 + 트리거 동작 가능

## 적용 방식 (수동 검증 필수)

### 옵션 A — 로컬 Docker Postgres 검증 (권장)

```bash
docker run --name veinspiral-test -e POSTGRES_PASSWORD=test -p 54329:5432 -d postgres:17
# auth schema + auth.users 테이블 수동 생성 필요 (Supabase가 보통 제공)
for f in supabase/migrations/_regenerated/*.sql; do
  psql "postgresql://postgres:test@localhost:54329/postgres" -f "$f"
done
```

### 옵션 B — Supabase branch 생성

```bash
# MCP create_branch 또는 dashboard에서 branch 생성
# Supabase가 auth/storage/realtime 스키마를 자동 프로비전
# 001~008 파일을 각각 apply_migration으로 순서대로 적용
```

## 이후 단계

1. **fresh DB apply 통과** ← 본 재생성 파일로 달성 목표
2. upgrade apply 통과 — 기존 운영 DB에 재적용 시 ON CONFLICT/IF EXISTS 멱등성으로 no-op 되어야 함
3. branch/staging 생성 성공
4. 이후 live auth / 보안 E2E / UI 구조개선 착수

## 알려진 차이점 (원본 squash 대비)

- enum 생성은 `do $$ ... exception when duplicate_object then null; end $$;` 래핑으로 idempotent
- tables는 `create table if not exists`
- triggers는 `drop trigger if exists` 선행
- policies는 `drop policy if exists` 선행
- indexes는 `create index if not exists`
- 시드는 `on conflict ... do nothing`
- 모든 audit sequence는 `create sequence if not exists`로 별도 생성 (테이블 default 참조 전)

## 폐기 대상

- `supabase/migrations/20260410000001~012_*.sql` (기존 squash)
- `supabase/migrations/20260414000001~008_hotfix_*.sql` (누적 hotfix)

폐기 시점: 본 재생성 파일로 fresh DB apply + staging branch 생성 검증 통과 **후에만**.
