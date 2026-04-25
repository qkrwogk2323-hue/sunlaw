-- =============================================================================
-- Forward-only hotfix (2026-04-25)
--   rehabilitation_income_settings에 section10_manual_addendum 컬럼 추가.
--   변제계획안 10항의 사용자 수동 추가사항만 저장.
--   제1~9항은 buildPlanCoreSections()에서 자동 생성.
-- =============================================================================

ALTER TABLE public.rehabilitation_income_settings
  ADD COLUMN IF NOT EXISTS section10_manual_addendum text;
