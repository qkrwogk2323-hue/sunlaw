-- ═══════════════════════════════════════════════════
-- P1-8: 변제기간 6규칙 엔진 — colaw repaymentperiodsetting 매핑
-- ═══════════════════════════════════════════════════

alter table public.rehabilitation_income_settings
  add column if not exists period_setting smallint not null default 6
    check (period_setting between 1 and 6);

comment on column public.rehabilitation_income_settings.period_setting is
  'colaw repaymentperiodsetting (1~6 변제기간 자동결정 규칙). 기본 6=원금만 변제';
