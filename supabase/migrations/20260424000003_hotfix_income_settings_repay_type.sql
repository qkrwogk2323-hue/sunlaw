-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   rehabilitation_income_settings에 repay_type 컬럼 추가.
--   변제 방식(sequential/combined/tieredTaxPriority)을 저장하기 위함.
--   기존 행은 기본값 'sequential'로 채워짐.
-- =============================================================================

ALTER TABLE public.rehabilitation_income_settings
  ADD COLUMN IF NOT EXISTS repay_type text NOT NULL DEFAULT 'sequential';
