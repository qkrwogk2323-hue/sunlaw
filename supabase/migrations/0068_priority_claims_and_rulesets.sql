-- 0068: priority_claims_and_rulesets — 우선변제채권 엔진 + 법적 ruleset
-- 목적:
-- claim_class='priority' 채권의 세부 분류(세금·임금·임차보증금)와
-- 우선변제 한도 계산 근거(ruleset)를 저장.
-- 개인회생: 우선변제채권은 변제계획안 기간 전체에 걸쳐 전액 변제 필요.

do $$ begin
  create type public.priority_claim_subtype as enum (
    'national_tax',           -- 국세 (종합소득세, 부가가치세 등)
    'local_tax',              -- 지방세
    'social_insurance',       -- 4대보험 (건보·국민연금·고용·산재)
    'wage_arrears',           -- 미지급 임금 (근로기준법 우선특권)
    'lease_deposit',          -- 임차 보증금 (주택임대차 소액 보증금)
    'child_support',          -- 양육비·부양료
    'other_priority'
  );
exception when duplicate_object then null; end $$;

-- 우선변제채권 상세 분류
create table if not exists public.insolvency_priority_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,

  priority_subtype public.priority_claim_subtype not null,

  -- 세금/보험료 기준
  tax_period_from date,
  tax_period_to date,
  tax_notice_number text,

  -- 임금 기준
  employment_period_from date,
  employment_period_to date,

  -- 법적 우선 한도 정보
  statutory_priority_cap numeric(18,0),  -- 법적 한도 (예: 소액 임차보증금 한도)
  priority_basis_text text,              -- 근거 법령 (예: 주택임대차보호법 제8조)

  confirmed_priority_amount numeric(18,0) not null default 0,  -- 확정 우선변제액

  notes text,
  lifecycle_status public.lifecycle_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_priority_claims is '우선변제채권 상세 분류. 개인회생에서는 변제계획 전기간 전액변제 필요. insolvency_creditors.claim_class=priority인 row와 연결.';

-- 법적 ruleset (연도별 한도 상수 테이블)
-- 예: 소액임차보증금 한도는 지역·연도에 따라 다름
create table if not exists public.insolvency_ruleset_constants (
  id uuid primary key default gen_random_uuid(),
  ruleset_key text not null,   -- 예: 'small_lease_cap_seoul_2024'
  display_name text not null,
  legal_basis text,            -- 근거 법령
  effective_from date not null,
  effective_to date,           -- null = 현재 유효
  value_amount numeric(18,0),  -- 금액 한도
  value_pct numeric(6,4),      -- 비율 한도
  region_code text,            -- 적용 지역 코드 (null = 전국)
  notes text,
  created_at timestamptz not null default now(),
  unique (ruleset_key, effective_from)
);

comment on table public.insolvency_ruleset_constants is '개인회생·파산 법적 한도 상수 (소액임차보증금·최저생계비 등). 연도·지역별로 갱신.';

-- 초기 주요 상수 (2024년 기준)
insert into public.insolvency_ruleset_constants (ruleset_key, display_name, legal_basis, effective_from, value_amount)
values
  ('small_lease_cap_metro_2024', '소액임차보증금 한도 (서울·수도권)', '주택임대차보호법 시행령', '2024-02-21', 55000000),
  ('small_lease_cap_metro_protected_2024', '소액임차 우선변제 한도 (서울·수도권)', '주택임대차보호법 시행령', '2024-02-21', 18500000),
  ('small_lease_cap_metro_2_2024', '소액임차보증금 한도 (인천·경기)', '주택임대차보호법 시행령', '2024-02-21', 48000000),
  ('small_lease_cap_metro_2_protected_2024', '소액임차 우선변제 한도 (인천·경기)', '주택임대차보호법 시행령', '2024-02-21', 16000000),
  ('min_living_cost_2024', '최저생계비 (1인 가구 기준)', '기초생활보장법', '2024-01-01', 2228445),
  ('rehabilitation_min_payment_pct', '개인회생 최소변제율 (가용소득 비율)', '채무자 회생 및 파산에 관한 법률', '2024-01-01', NULL)
on conflict (ruleset_key, effective_from) do nothing;

update public.insolvency_ruleset_constants
  set value_pct = 1.0000
where ruleset_key = 'rehabilitation_min_payment_pct';

create index if not exists idx_priority_claims_case on public.insolvency_priority_claims (case_id, lifecycle_status);
create index if not exists idx_priority_claims_creditor on public.insolvency_priority_claims (creditor_id);
create index if not exists idx_ruleset_constants_key on public.insolvency_ruleset_constants (ruleset_key, effective_from);

alter table public.insolvency_priority_claims enable row level security;
alter table public.insolvency_priority_claims force row level security;
alter table public.insolvency_ruleset_constants enable row level security;
alter table public.insolvency_ruleset_constants force row level security;

drop policy if exists priority_claims_select on public.insolvency_priority_claims;
create policy priority_claims_select on public.insolvency_priority_claims
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists priority_claims_write on public.insolvency_priority_claims;
create policy priority_claims_write on public.insolvency_priority_claims
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists priority_claims_service_role on public.insolvency_priority_claims;
create policy priority_claims_service_role on public.insolvency_priority_claims
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ruleset_constants: 플랫폼 관리자만 쓰기, 인증 사용자는 읽기
drop policy if exists ruleset_constants_select on public.insolvency_ruleset_constants;
create policy ruleset_constants_select on public.insolvency_ruleset_constants
  for select to authenticated using (true);

drop policy if exists ruleset_constants_write on public.insolvency_ruleset_constants;
create policy ruleset_constants_write on public.insolvency_ruleset_constants
  for all to authenticated
  using (app.is_platform_admin())
  with check (app.is_platform_admin());

drop trigger if exists trg_priority_claims_updated_at on public.insolvency_priority_claims;
create trigger trg_priority_claims_updated_at
  before update on public.insolvency_priority_claims
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_priority_claims on public.insolvency_priority_claims;
create trigger audit_insolvency_priority_claims
  after insert or update or delete on public.insolvency_priority_claims
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_insolvency_ruleset_constants on public.insolvency_ruleset_constants;
create trigger audit_insolvency_ruleset_constants
  after insert or update or delete on public.insolvency_ruleset_constants
  for each row execute procedure audit.capture_row_change();
