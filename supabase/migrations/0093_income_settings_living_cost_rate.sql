-- ============================================================
-- 0093 rehabilitation_income_settings.living_cost_rate 컬럼 추가 (PR-3 / 옵션 C)
-- ============================================================
-- 검사관 2026-04-08 보고서 B-3:
--   60%는 권장선이지 절대 하한이 아님. 사용자가 50/55/65 등 사건별 조정 가능해야 함.
-- 옵션 C: rate 1컬럼만 추가 (override는 living_cost가 이미 최종값이라 불필요).
-- ============================================================

alter table public.rehabilitation_income_settings
  add column if not exists living_cost_rate numeric(5,2) not null default 60;

comment on column public.rehabilitation_income_settings.living_cost_rate is
  '생계비 권장선 비율(%) — 기준중위소득 × rate/100. 기본 60(회생법원 권장).';
