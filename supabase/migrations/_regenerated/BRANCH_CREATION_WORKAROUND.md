# Branch/Staging Creation Workaround

## 배경

Supabase의 내부 branch migration runner는 복잡한 `CREATE OR REPLACE FUNCTION ... AS $$ body $$` 정의를 prepared statement로 파싱 시 `cannot insert multiple commands into a prepared statement` 오류를 발생시킴. 단순 함수(본문 짧음)는 통과하지만, 1600자 이상의 다문 plpgsql 본문에서 실패 확인됨.

검증 결과:
- 단일 `SELECT 1` 함수: 통과
- `SECURITY DEFINER` + 단순 본문(~100자): 통과
- 다중 문장 본문(~1645자): 통과
- 실 `add_case_party_atomic`(2571자, INSERT RETURNING + nested IF): 실패

동일 SQL이 psql direct apply(pooler 경유)에서는 전부 통과. Supabase 자체 runner의 dollar-quote 경계 파싱 버그로 결론.

## Workaround 절차

### Step 1 — prod schema_migrations 조정

Branch 생성 전에 schema_migrations에서 **004~008을 일시적으로 제거**:

```sql
delete from supabase_migrations.schema_migrations
where version in (
  '20260415000004','20260415000005','20260415000006',
  '20260415000007','20260415000008'
);
```

### Step 2 — Branch 생성

```bash
# MCP create_branch 또는 Supabase dashboard
# 001~003만 replay됨 → 성공 (tables + FK)
```

### Step 3 — 004~008 직접 apply

브랜치 DB URL 확보 후:

```bash
export PGHOST=aws-1-ap-northeast-2.pooler.supabase.com
export PGPORT=5432
export PGUSER=postgres.{branch_project_ref}
export PGPASSWORD={branch_db_password}
export PGDATABASE=postgres

cd supabase/migrations/_regenerated
for f in 004_*.sql 005_*.sql 007_*.sql 008_*.sql; do
  psql -v ON_ERROR_STOP=1 -q -f "$f"
done

# 006은 storage.objects ownership 에러 예상 → 비중단 실행
psql -v ON_ERROR_STOP=0 -q -f 006_rls_policies.sql
```

### Step 4 — prod schema_migrations 복원

이후 다른 branch 생성을 위해 004~008을 다시 채움:

```bash
node scripts/rebuild-schema-migrations-full.mjs
```

## 검증된 결과 (2026-04-15)

| 단계 | 수치 |
|------|------|
| tables | 91 |
| functions | 46 |
| triggers | 155 |
| policies | 192 |
| indexes | 264 |
| setting_catalog seed | 15 |

prod와 동일 구조 복제 완료.

## 알려진 제약

- `storage.objects`에 대한 RLS 정책 4개는 branch DB 소유권 차이로 직접 apply 불가. Supabase가 storage 레이어에서 자체 관리하므로 branch에서는 스킵 가능.
- 매 branch 생성 시 Step 1~4 반복 필요 (자동화 스크립트 권장).

## 대안 (추후 고려)

- Supabase CLI + Docker Desktop 환경 구축 후 `supabase db push`로 프록시 (Docker 필요)
- 별도 Supabase 프로젝트를 staging으로 운영 (월 단위 비용 발생)
- Supabase support에 branch runner dollar-quote 파싱 버그 티켓
