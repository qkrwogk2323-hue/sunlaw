# Migration Squash 가이드

> 97개 migration → 12개 통합 migration으로 교체하는 절차

## 현재 상태
- **기존**: `supabase/migrations/` — 97개 파일 (0001~0097)
- **신규**: `supabase/migrations-squashed/` — 12개 파일
- **프로덕션 DB**: 이미 97개가 전부 적용된 상태 (schema_migrations에 97개 기록)

## 파일 구조

| 파일 | 내용 | 크기 |
|------|------|------|
| 001_extensions_and_schemas | 확장, 스키마(app/audit), 기본 함수 | 6KB |
| 002_enums | 64개 enum 타입 전체 | 12KB |
| 003_core_tables | 프로필, 조직, 사건, 문서, 일정 등 핵심 테이블 | 42KB |
| 004_platform_governance | 설정, 구독, 권한, 가입신청 등 플랫폼 관리 | 43KB |
| 005_collaboration | 허브, 초대, 협업, 알림 | 40KB |
| 006_billing | 수임료, 청구서, 결제, 보상 | 39KB |
| 007_insolvency_shared | 공유 AI 추출 + 도산 프레임워크 | 45KB |
| 008_rehabilitation | 개인회생 자동작성 모듈 (메인) | 26KB |
| 009_functions_and_triggers | 함수 38개 + 트리거 140개 | 68KB |
| 010_rls_policies | RLS 정책 178개 | 112KB |
| 011_indexes | 인덱스 136개 | 22KB |
| 012_seed_data | 시드 데이터, cron, COLAW backfill | 18KB |

## 교체 절차

### 1단계: 로컬 파일 교체 (터미널에서)

```bash
cd /path/to/vein-spiral-source-integrated-v1

# 기존 migrations 백업
mv supabase/migrations supabase/migrations_old_97

# 새 migrations로 교체
mv supabase/migrations-squashed supabase/migrations
```

### 2단계: Supabase schema_migrations 히스토리 업데이트

프로덕션 DB에는 이미 스키마가 적용되어 있으므로, migration 파일만 실행하면 안 됩니다.
대신 **schema_migrations 테이블의 히스토리만** 교체해야 합니다.

Supabase SQL Editor에서 실행:

```sql
-- ⚠️ 주의: 이 SQL은 migration 히스토리만 교체합니다.
-- 실제 DB 스키마는 변경하지 않습니다.

BEGIN;

-- 기존 97개 히스토리 삭제
DELETE FROM supabase_migrations.schema_migrations;

-- 새 12개 히스토리 등록
INSERT INTO supabase_migrations.schema_migrations (version, name, statements_applied_at) VALUES
  ('20260410000001', 'extensions_and_schemas', now()),
  ('20260410000002', 'enums', now()),
  ('20260410000003', 'core_tables', now()),
  ('20260410000004', 'platform_governance', now()),
  ('20260410000005', 'collaboration', now()),
  ('20260410000006', 'billing', now()),
  ('20260410000007', 'insolvency_shared', now()),
  ('20260410000008', 'rehabilitation', now()),
  ('20260410000009', 'functions_and_triggers', now()),
  ('20260410000010', 'rls_policies', now()),
  ('20260410000011', 'indexes', now()),
  ('20260410000012', 'seed_data', now());

COMMIT;

-- 확인
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

### 3단계: 검증

```bash
# Supabase CLI로 migration 상태 확인
npx supabase migration list --project-ref hyfdebinoirtluwpfmqx

# TypeScript 빌드 확인
npm run typecheck
npm run build
```

## 아키텍처 메모

### 도산모듈 구조
```
[007 공유 AI 추출 도구] ← 부채증명서 → 원금/이자/보증인 자동 파싱
     ↓                         ↓
[008 개인회생 모듈]      [개인파산 모듈 (예정)]
(rehabilitation)         (bankruptcy)
```

- **007**: AI 문서 추출, 채권자 스테이징 테이블 — 개인회생 + 개인파산 **공유**
- **008**: 개인회생 서류 자동작성 — COLAW 공식 기반 계산 엔진

### 정리된 데이터
- `insolvency_creditors`: 잘못 삽입된 875건 삭제 완료 (이전 AI 세션 사고)
- `_backup_0092_rehab_income_settings`: 백업 테이블 삭제 완료

## 롤백

문제 발생 시:
```bash
# 로컬 파일 롤백
mv supabase/migrations supabase/migrations_squashed_12
mv supabase/migrations_old_97 supabase/migrations
```

schema_migrations 롤백은 기존 97개를 다시 INSERT 해야 합니다.
