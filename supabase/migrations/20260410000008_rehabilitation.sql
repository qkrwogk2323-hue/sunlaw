-- ═══════════════════════════════════════════════════════════════════════════
-- 008_rehabilitation.sql
-- Main rehabilitation (개인회생) auto-document generation system
-- ═══════════════════════════════════════════════════════════════════════════
-- 법원 양식 기준 (D5100 시리즈) + 법률 근거:
--   D5100 개시신청서     → rehabilitation_applications
--   D5101 재산목록       → rehabilitation_properties (+담보 연결)
--   D5103 수입지출목록   → rehabilitation_income_settings (합계 + D5110 필드 겸임)
--   D5106 채권자목록     → rehabilitation_creditors (+has_objection, remaining_unsecured)
--   D5110 변제계획안     → rehabilitation_income_settings (repayment_method, trustee 등 컬럼 추가)
--   D5111 변제계획 별지  → rehabilitation_creditors 캐시 (repay_ratio/monthly/total) + 앱 계산
--
-- 법률 근거:
--   채무자회생법 제579조(신청자격), 제589조(기재사항),
--   제610~614조(변제계획안 내용/인가요건)
--   개인회생사건 처리지침 제7조(생계비: 기준중위소득 60%)
--
-- Origin migrations (squashed):
--   0086~0097 + D5100 갭 보강 (2026-04-10)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1: Rehabilitation Application (0086 + 0087 law firm columns)
-- ───────────────────────────────────────────────────────────────────────────
-- NOTE: colaw_case_basic_seq는 003_core_tables의 cases CREATE TABLE에 포함.
--       ux_cases_colaw_case_basic_seq 인덱스는 011_indexes.sql에 포함.

create table if not exists public.rehabilitation_applications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id         uuid not null references public.cases(id) on delete cascade,

  -- 신청인 인적사항
  applicant_name         text,
  resident_number_front  text,
  resident_number_hash   text,
  registered_address     jsonb default '{}',
  current_address        jsonb default '{}',
  office_address         jsonb default '{}',
  service_address        jsonb default '{}',
  service_recipient      text,
  phone_home             text,
  phone_mobile           text,
  return_account         text,

  -- 소득 정보
  income_type            text check (income_type in ('salary', 'business')),
  employer_name          text,
  position               text,
  work_period            text,
  has_extra_income       boolean not null default false,
  extra_income_name      text,
  extra_income_source    text,

  -- 신청 관련
  application_date       date,
  court_name             text,
  court_detail           text,
  judge_division         text,
  case_year              int,
  case_number            text,
  repayment_start_date   date,
  repayment_start_uncertain boolean not null default false,
  repayment_start_day    int,

  -- 개인회생위원 계좌
  trustee_bank_name      text,
  trustee_bank_account   text,

  -- 기존 신청 여부
  prior_applications     jsonb default '[]',

  -- 대리인 (법무법인 컬럼은 0087)
  agent_type             text check (agent_type in ('법무사','변호사','기타')),
  agent_name             text,
  agent_phone            text,
  agent_email            text,
  agent_fax              text,
  agent_address          jsonb default '{}',
  agent_law_firm         text,                -- 법무법인명 (0087)
  representative_lawyer  text,                -- 대표변호사 (0087)

  -- 문서 옵션
  info_request_form      boolean not null default false,
  ecourt_agreement       boolean not null default false,
  delegation_form        boolean not null default false,
  concurrent_discharge   boolean not null default true,  -- D5100: 면책신청 동시 여부

  lifecycle_status       text not null default 'active',
  created_by             uuid references public.profiles(id) on delete set null,
  updated_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint uq_rehab_app_case unique (case_id)
);

comment on column public.rehabilitation_applications.agent_law_firm is
  '법무법인명 (대리인이 법무법인인 경우)';
comment on column public.rehabilitation_applications.representative_lawyer is
  '대표변호사 (법무법인인 경우)';

-- NOTE: indexes → 011_indexes.sql, RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3: Rehabilitation Creditor Settings (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_creditor_settings (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id) on delete cascade,

  list_date       date,
  bond_date       date,
  repay_type      text not null default 'sequential'
                  check (repay_type in ('sequential','combined')),
  summary_table   boolean not null default false,
  copy_with_evidence boolean not null default false,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint uq_rehab_cred_settings unique (case_id)
);

-- NOTE: RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4: Rehabilitation Secured Properties (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_secured_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  property_type    text not null default '부동산',
  description      text,
  market_value     bigint not null default 0,
  valuation_rate   numeric(5,2) not null default 70,
  note             text,

  sort_order       int not null default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- NOTE: indexes → 011_indexes.sql, RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5: Rehabilitation Creditors (0086 + 0088 secured + 0096 classify)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_creditors (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,

  bond_number      int not null,
  classify         text not null default '자연인'
                   check (classify in ('자연인','법인','국가','지방자치단체')),
  creditor_name    text not null default '',
  branch_name      text,
  postal_code      text,
  address          text,
  phone            text,
  fax              text,
  mobile           text,

  bond_cause       text,
  capital          bigint not null default 0,
  capital_compute  text,
  interest         bigint not null default 0,
  interest_compute text,
  delay_rate       numeric(6,4) not null default 0,
  bond_content     text,

  is_secured       boolean not null default false,
  secured_property_id uuid references public.rehabilitation_secured_properties(id) on delete set null,
  secured_collateral_value numeric(18,0) not null default 0,  -- 0088
  is_other_unconfirmed boolean not null default false,         -- 0088

  lien_priority    int not null default 0,
  lien_type        text,
  max_claim_amount bigint not null default 0,
  has_priority_repay boolean not null default false,
  is_unsettled     boolean not null default false,
  is_annuity_debt  boolean not null default false,
  apply_restructuring boolean not null default false,

  attachments      int[] not null default '{}',

  unsettled_reason  text,
  unsettled_amount  bigint not null default 0,
  unsettled_text    text,

  guarantor_name    text,
  guarantor_resident_hash text,
  guarantor_amount  bigint not null default 0,
  guarantor_text    text,

  -- D5106 추가 필드
  has_objection          boolean not null default false,  -- D5106: 이의 여부
  remaining_unsecured    bigint not null default 0,       -- D5106: 잔존 무담보 채권액

  -- 변제 스케줄 캐시
  repay_ratio       numeric(10,8) not null default 0,
  repay_monthly     bigint not null default 0,
  repay_total       bigint not null default 0,
  repay_capital     bigint not null default 0,
  repay_interest    bigint not null default 0,

  sort_order        int not null default 0,
  lifecycle_status  text not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.rehabilitation_creditors.classify is
  '인격구분: 자연인/법인/국가/지방자치단체. 콜로 인격구분 select와 1:1 대응 (0096)';

-- 0088 제약: 별제권부와 기타 미확정은 상호 배타
alter table public.rehabilitation_creditors
  add constraint if not exists creditors_secured_xor_unconfirmed
  check (not (is_secured and is_other_unconfirmed));

-- 0088 제약: 별제권부는 담보평가액 > 0 이어야 의미 있음
alter table public.rehabilitation_creditors
  add constraint if not exists creditors_secured_requires_collateral
  check (not is_secured or secured_collateral_value > 0);

-- NOTE: indexes → 011_indexes.sql, RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6: Rehabilitation Properties (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  category         text not null,  -- D5101: 부동산/동산/예금/보험/차량/임차보증금/퇴직금/기타
  detail           text,
  amount           bigint not null default 0,      -- D5101: 평가액 (현재가액)
  seizure          text not null default '무',
  repay_use        text not null default '무',
  is_protection    boolean not null default false,

  -- D5101 추가: 담보 연결 + 청산가치
  has_lien                boolean not null default false,  -- 담보권 설정 여부
  lien_holder             text,                            -- 담보권자명
  lien_amount             bigint not null default 0,       -- 피담보채무액
  secured_property_id     uuid references public.rehabilitation_secured_properties(id) on delete set null,
  liquidation_value       bigint not null default 0,       -- 청산가치 산정액

  sort_order       int not null default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- NOTE: indexes → 011_indexes.sql, RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7: Rehabilitation Property Deductions (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_property_deductions (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,
  category         text not null,
  deduction_amount bigint not null default 0,

  constraint uq_rehab_prop_deduction unique (case_id, category)
);

-- NOTE: RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 8: Rehabilitation Family Members (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_family_members (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  relation         text not null,
  member_name      text not null,
  age              text,
  cohabitation     text,
  occupation       text,
  monthly_income   bigint not null default 0,
  total_property   bigint not null default 0,
  is_dependent     boolean not null default false,

  sort_order       int not null default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- NOTE: indexes → 011_indexes.sql, RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 9: Rehabilitation Income Settings
-- ───────────────────────────────────────────────────────────────────────────
-- Final state after consolidation:
-- - 0086: base columns
-- - 0089: living_cost_rate added with default 100 (colaw semantics)
-- - 0090: period_setting added with default 6 (1-6 rule engine)
-- - 0091: repay_period_option default set to capital36 (from capital60)
-- - 0094: repay_months and repay_period_option made nullable
-- - 0095: living_cost_rate default confirmed as 100 (semantics: baseline60 × rate/100)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_income_settings (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  gross_salary         bigint not null default 0,
  net_salary           bigint not null default 0,
  extra_income         bigint not null default 0,

  median_income_year   int not null default 2026,
  living_cost          bigint not null default 0,
  living_cost_direct   boolean not null default false,
  living_cost_range    text not null default 'within'
                       check (living_cost_range in ('within','exceed')),
  extra_living_cost    bigint not null default 0,
  extra_living_percent numeric(5,2) not null default 0,

  trustee_comm_rate    numeric(5,2) not null default 0,
  child_support        bigint not null default 0,
  dispose_amount       bigint not null default 0,
  dispose_period       text,

  -- 변제기간 설정 (0090: period_setting, 0091: default capital36, 0094: nullable)
  repay_period_option  text default 'capital36',  -- nullable (0094)
  repay_months         integer default 60,        -- nullable (0094)
  repay_rate_display   text not null default '2',

  -- COLAW 필드 (0089: living_cost_rate, 0090: period_setting)
  living_cost_rate     numeric(5,2) not null default 100,  -- 0089/0095: default 100
  period_setting       smallint not null default 6         -- 0090: 1-6 rule
                       check (period_setting between 1 and 6),

  -- D5110 변제계획안 필드 (income_settings가 겸임)
  repayment_method     text not null default '매월'
                       check (repayment_method in ('매월','격월','분기')),
  liquidation_guaranteed boolean not null default false,  -- 청산가치 보장 충족
  trustee_account      text,                              -- 변제금 납부계좌
  trustee_name         text,                              -- 개인회생위원명

  -- 계산 결과 캐시
  monthly_available    bigint not null default 0,
  monthly_repay        bigint not null default 0,
  total_repay_amount   bigint not null default 0,
  repay_rate           numeric(10,4) not null default 0,
  total_debt           bigint not null default 0,
  total_capital        bigint not null default 0,
  total_interest       bigint not null default 0,
  secured_debt         bigint not null default 0,
  unsecured_debt       bigint not null default 0,
  liquidation_value    bigint not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_income_case unique (case_id)
);

comment on column public.rehabilitation_income_settings.living_cost_rate is
  'colaw lowestlivingmoneyrate (%) — baseline60(=기준중위소득×60%) × rate/100. default 100 = 60% 그대로 (회생법원 표준). 150 = 90% (가족 부양 등). 0089 origin, 0093/0095 의미론 명확화.';

comment on column public.rehabilitation_income_settings.period_setting is
  'colaw repaymentperiodsetting (1~6 변제기간 자동결정 규칙). 기본 6=원금만 변제';

comment on column public.rehabilitation_income_settings.repay_period_option is
  'nullable (0094): 변제기간 옵션 선택. capital36 | capital60 등. 미설정 가능 (NULL).';

comment on column public.rehabilitation_income_settings.repay_months is
  'nullable (0094): 변제기간 개월 수. 36 or 60. 미설정 가능 (NULL).';

-- NOTE: RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 10: Rehabilitation Affidavits (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_affidavits (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  debt_history     text,
  property_change  text,
  income_change    text,
  living_situation text,
  repay_feasibility text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_affidavit_case unique (case_id)
);

-- NOTE: RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 11: Rehabilitation Plan Sections (0086)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rehabilitation_plan_sections (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases(id) on delete cascade,

  section_number   int not null check (section_number between 1 and 10),
  content          text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_plan_section unique (case_id, section_number)
);

-- NOTE: RLS → 010_rls_policies.sql

-- ───────────────────────────────────────────────────────────────────────────
-- D5100 갭 보강 — 기존 테이블 컬럼 추가만 (신규 테이블 없음)
-- ───────────────────────────────────────────────────────────────────────────
-- D5110 변제계획안 → rehabilitation_income_settings에 이미 존재
--   (monthly_repay, total_repay_amount, repay_rate, liquidation_value 등)
--   빠진 필드만 아래에서 추가.
-- D5111 채권자별 변제 스케줄 → rehabilitation_creditors에 캐시 이미 존재
--   (repay_ratio, repay_monthly, repay_total, repay_capital, repay_interest)
--   회차별 상세는 앱 레이어에서 계산 (repay_months / creditor count로 생성).
-- D5103 수입/지출 항목별 → rehabilitation_income_settings 합계 + 앱에서 breakdown 관리.
-- ───────────────────────────────────────────────────────────────────────────
