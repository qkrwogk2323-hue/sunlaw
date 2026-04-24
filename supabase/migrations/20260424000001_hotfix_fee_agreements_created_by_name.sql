-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   fee_agreements 테이블에 created_by_name 컬럼 추가.
--   앱 코드 10+곳(case-actions, portal queries, hub-projection 등)이
--   fee_agreements.created_by_name을 참조하지만 DDL에 누락되어
--   "column fee_agreements.created_by_name does not exist" 에러 발생.
--
-- 영향: 기존 데이터 변경 없음 (NULL 기본값).
--       IF NOT EXISTS로 멱등성 보장.
-- =============================================================================

ALTER TABLE public.fee_agreements
  ADD COLUMN IF NOT EXISTS created_by_name text;
