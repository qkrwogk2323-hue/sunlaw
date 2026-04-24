-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   rehabilitation_applications에 누락 컬럼 2개 추가.
--   - employer_phone: 직장 전화번호 (UI에 입력 필드 있으나 DB 컬럼 없었음)
--   - filing_purpose: 변제 방식 선택 (원금균등변제/원리금균등변제)
-- =============================================================================

ALTER TABLE public.rehabilitation_applications
  ADD COLUMN IF NOT EXISTS employer_phone text;

ALTER TABLE public.rehabilitation_applications
  ADD COLUMN IF NOT EXISTS filing_purpose text DEFAULT '원금균등변제';
