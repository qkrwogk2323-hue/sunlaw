-- ═══════════════════════════════════════════════════
-- 개인회생 자동작성 모듈 테이블
-- ═══════════════════════════════════════════════════

-- 1. 신청서 (1 사건 : 1 신청서)
create table public.rehabilitation_applications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  case_id         uuid not null references cases(id) on delete cascade,

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

  -- 대리인
  agent_type             text check (agent_type in ('법무사','변호사','기타')),
  agent_name             text,
  agent_phone            text,
  agent_email            text,
  agent_fax              text,
  agent_address          jsonb default '{}',

  -- 문서 옵션
  info_request_form      boolean not null default false,
  ecourt_agreement       boolean not null default false,
  delegation_form        boolean not null default false,

  lifecycle_status       text not null default 'active',
  created_by             uuid references profiles(id) on delete set null,
  updated_by             uuid references profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint uq_rehab_app_case unique (case_id)
);

create index idx_rehab_app_org on rehabilitation_applications(organization_id);
create index idx_rehab_app_case on rehabilitation_applications(case_id);

-- 2. 채권자 설정 (1 사건 : 1)
create table public.rehabilitation_creditor_settings (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references cases(id) on delete cascade,

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

-- 3. 별제권 담보물건 (1 사건 : N)
create table public.rehabilitation_secured_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

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

create index idx_rehab_secured_case on rehabilitation_secured_properties(case_id);

-- 4. 채권자 목록 (1 사건 : N)
create table public.rehabilitation_creditors (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,

  bond_number      int not null,
  classify         text not null default '자연인' check (classify in ('자연인','법인')),
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
  secured_property_id uuid references rehabilitation_secured_properties(id) on delete set null,
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

create index idx_rehab_creditors_case on rehabilitation_creditors(case_id, bond_number);
create index idx_rehab_creditors_org on rehabilitation_creditors(organization_id);

-- 5. 재산 목록 (14 카테고리 × N 항목)
create table public.rehabilitation_properties (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  category         text not null,
  detail           text,
  amount           bigint not null default 0,
  seizure          text not null default '무',
  repay_use        text not null default '무',
  is_protection    boolean not null default false,

  sort_order       int not null default 0,
  lifecycle_status text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_rehab_properties_case on rehabilitation_properties(case_id, category);

-- 6. 재산 카테고리별 공제금액
create table public.rehabilitation_property_deductions (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,
  category         text not null,
  deduction_amount bigint not null default 0,

  constraint uq_rehab_prop_deduction unique (case_id, category)
);

-- 7. 가족관계 (1 사건 : N)
create table public.rehabilitation_family_members (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

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

create index idx_rehab_family_case on rehabilitation_family_members(case_id);

-- 8. 수입지출 / 변제기간 설정 (1:1)
create table public.rehabilitation_income_settings (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

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

  repay_period_option  text not null default 'capital60',
  repay_months         int not null default 60,
  repay_rate_display   text not null default '2',

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

-- 9. 진술서 (1:1)
create table public.rehabilitation_affidavits (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  debt_history     text,
  property_change  text,
  income_change    text,
  living_situation text,
  repay_feasibility text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_affidavit_case unique (case_id)
);

-- 10. 변제계획안 10항
create table public.rehabilitation_plan_sections (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references cases(id) on delete cascade,

  section_number   int not null check (section_number between 1 and 10),
  content          text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint uq_rehab_plan_section unique (case_id, section_number)
);

-- ═══════════════════════════════════════════════════
-- RLS 정책
-- ═══════════════════════════════════════════════════

alter table public.rehabilitation_applications enable row level security;
alter table public.rehabilitation_creditor_settings enable row level security;
alter table public.rehabilitation_secured_properties enable row level security;
alter table public.rehabilitation_creditors enable row level security;
alter table public.rehabilitation_properties enable row level security;
alter table public.rehabilitation_property_deductions enable row level security;
alter table public.rehabilitation_family_members enable row level security;
alter table public.rehabilitation_income_settings enable row level security;
alter table public.rehabilitation_affidavits enable row level security;
alter table public.rehabilitation_plan_sections enable row level security;

-- 조직 소속원 접근 정책 (rehabilitation_applications — organization_id 직접)
create policy "rehab_app_org_member" on rehabilitation_applications
  for all using (
    organization_id in (
      select organization_id from organization_memberships
      where profile_id = auth.uid()
    )
  );

-- 채권자 설정 — case_id 기반
create policy "rehab_cred_settings_org_member" on rehabilitation_creditor_settings
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 담보물건 — case_id 기반
create policy "rehab_secured_org_member" on rehabilitation_secured_properties
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 채권자 — organization_id 직접
create policy "rehab_creditors_org_member" on rehabilitation_creditors
  for all using (
    organization_id in (
      select organization_id from organization_memberships
      where profile_id = auth.uid()
    )
  );

-- 재산 — case_id 기반
create policy "rehab_properties_org_member" on rehabilitation_properties
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 재산 공제 — case_id 기반
create policy "rehab_prop_deductions_org_member" on rehabilitation_property_deductions
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 가족 — case_id 기반
create policy "rehab_family_org_member" on rehabilitation_family_members
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 수입지출 — case_id 기반
create policy "rehab_income_org_member" on rehabilitation_income_settings
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 진술서 — case_id 기반
create policy "rehab_affidavit_org_member" on rehabilitation_affidavits
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );

-- 변제계획안 — case_id 기반
create policy "rehab_plan_org_member" on rehabilitation_plan_sections
  for all using (
    case_id in (
      select c.id from cases c
      join organization_memberships om on om.organization_id = c.organization_id
      where om.profile_id = auth.uid()
    )
  );
