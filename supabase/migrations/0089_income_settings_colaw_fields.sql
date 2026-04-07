-- ═══════════════════════════════════════════════════
-- P1-7: 월가용소득 공식 확장 — colaw 필드 매핑
-- ═══════════════════════════════════════════════════
-- colaw `lowestlivingmoneyrate` (생계비 증액률 %, 100~200 관행)
-- 기존 컬럼 (extra_living_cost, child_support, trustee_comm_rate)는 0086에 존재.

alter table public.rehabilitation_income_settings
  add column if not exists living_cost_rate numeric(5,2) not null default 100;

comment on column public.rehabilitation_income_settings.living_cost_rate is
  'colaw lowestlivingmoneyrate (생계비 증액률 %, 100=기본, 100~200 관행)';

comment on column public.rehabilitation_income_settings.extra_living_cost is
  'colaw usingfamily_low_money (추가생계비, 기준범위 초과분)';

comment on column public.rehabilitation_income_settings.child_support is
  'colaw resurchildsupportmoney (양육비, 월 단위)';

comment on column public.rehabilitation_income_settings.trustee_comm_rate is
  'colaw outsideresuremember_rate (외부 회생위원 보수율 %)';
