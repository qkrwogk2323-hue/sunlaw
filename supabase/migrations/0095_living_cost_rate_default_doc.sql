-- ============================================================
-- 0095 living_cost_rate 의미론 명확화 + default 100 명시 (Y-prime hotfix)
-- ============================================================
-- 배경:
--   - 0089가 living_cost_rate numeric(5,2) NOT NULL default 100 으로 컬럼 추가 (colaw 의미론)
--   - 0093이 default 60 으로 add column if not exists 시도 → no-op (이미 존재) → 의미론 충돌
--   - PR-3 새 UI가 minimumLivingCost(size, year, rate)로 median × rate/100 계산 → rate=100 = 100%로 잘못 표시
--   - 검사관 2026-04-09 검증: document-generator/계산 경로는 회귀 0, UI 라벨/권장선 표시만 회귀
--
-- 의미론 단일화 (colaw 채택):
--   living_cost_rate 100 = 기준중위소득 60% 그대로 (baseline60 × 100/100)
--   living_cost_rate 150 = 기준중위소득 90% (baseline60 × 150/100)
--   default 100 = 회생법원 표준
--
-- 본 migration은 schema 변경 없음. default 명시 + comment 갱신만.
-- 91건 row 백필 안 함 (이미 100, 의미론적으로 정합).
-- ============================================================

-- 0093이 default 60을 명시했으나 prod는 0089의 default 100 유지 중.
-- 명시적으로 100으로 재설정하여 향후 혼란 차단.
alter table public.rehabilitation_income_settings
  alter column living_cost_rate set default 100;

comment on column public.rehabilitation_income_settings.living_cost_rate is
  'colaw lowestlivingmoneyrate (%) — baseline60(=기준중위소득×60%) × rate/100. default 100 = 60% 그대로 (회생법원 표준). 150 = 90% (가족 부양 등). 0089 origin, 0093/0095 의미론 명확화.';
