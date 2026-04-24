-- =============================================================================
-- Forward-only hotfix (2026-04-24)
--   rehabilitation_income_settings에 jsonb 컬럼 2개 추가.
--   - additional_living_costs: 추가생계비 항목별 상세 (카테고리/금액/사유)
--   - dispose_items: 처분재산 항목별 상세 (카테고리/금액/설명)
--   기존에는 합산값만 extra_living_cost/dispose_amount에 저장되어
--   개별 항목이 새로고침 시 유실되었음.
-- =============================================================================

ALTER TABLE public.rehabilitation_income_settings
  ADD COLUMN IF NOT EXISTS additional_living_costs jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.rehabilitation_income_settings
  ADD COLUMN IF NOT EXISTS dispose_items jsonb DEFAULT '[]'::jsonb;
