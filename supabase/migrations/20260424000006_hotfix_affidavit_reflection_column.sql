-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   rehabilitation_affidavits에 reflection 컬럼 추가.
--   기존에 future_plan과 reflection이 repay_feasibility 1개 컬럼에
--   \n\n 구분자로 합쳐져 저장되어, 새로고침 시 분리 불가했음.
-- =============================================================================

ALTER TABLE public.rehabilitation_affidavits
  ADD COLUMN IF NOT EXISTS reflection text;
