-- 0069: repayment_plan_engine — 변제계획 ruleset 엔진
-- 목적:
-- 개인회생 변제계획안(변제기간·월변제액·안분비례) 자동계산 결과를 저장.
-- 계산 버전을 관리해 수정 이력 추적 가능.

do $$ begin
  create type public.repayment_plan_status as enum (
    'draft',        -- 초안 (계산 중)
    'confirmed',    -- 확정 (신청서 제출 기준)
    'filed',        -- 법원 제출 완료
    'approved',     -- 법원 인가
    'rejected',     -- 법원 기각·불인가
    'cancelled'     -- 취소
  );
exception when duplicate_object then null; end $$;

-- 변제계획 헤더 (사건당 복수 버전 관리)
create table if not exists public.insolvency_repayment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,

  version_number int not null default 1,
  status public.repayment_plan_status not null default 'draft',
  insolvency_subtype public.insolvency_subtype,  -- 해당 계획의 도산 유형

  -- 기간 설정
  repayment_months int not null check (repayment_months in (36, 60)),  -- 36 or 60개월
  plan_start_date date,
  plan_end_date date,  -- plan_start_date + repayment_months개월, 앱 레이어에서 계산해 저장

  -- 소득/생계비 기준
  monthly_income numeric(18,0) not null default 0,       -- 월 가처분소득
  monthly_living_cost numeric(18,0) not null default 0,  -- 월 최저생계비
  monthly_disposable numeric(18,0) generated always as (
    greatest(0, monthly_income - monthly_living_cost)
  ) stored,

  -- 채권 총액 요약 (계산 시점 스냅샷)
  total_secured_claim numeric(18,0) not null default 0,   -- 별제권부 채권 총액
  total_priority_claim numeric(18,0) not null default 0,  -- 우선변제채권 총액
  total_general_claim numeric(18,0) not null default 0,   -- 일반채권 총액
  total_claim_amount numeric(18,0) generated always as (
    total_secured_claim + total_priority_claim + total_general_claim
  ) stored,

  -- 변제 총액 및 안분비례 기반액
  total_repayment_amount numeric(18,0),    -- 계획 기간 총 변제 예정액
  general_repayment_pool numeric(18,0),    -- 일반채권 안분비례 재원
  general_repayment_rate_pct numeric(7,4), -- 일반채권 변제율 (%)

  -- 법원 제출 정보
  filed_at date,
  court_case_number text,
  approved_at date,
  rejection_reason text,

  notes text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (case_id, version_number)
);

comment on table public.insolvency_repayment_plans is '개인회생 변제계획안. 36/60개월 기간, 월변제액, 안분비례 결과를 버전별로 저장.';

-- 채권자별 변제 배분 상세
create table if not exists public.insolvency_repayment_allocations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.insolvency_repayment_plans(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  claim_class public.creditor_claim_class not null,
  original_claim_amount numeric(18,0) not null,  -- 채권 원금 (스냅샷)
  allocated_amount numeric(18,0) not null,        -- 이 계획에서 변제받을 금액
  repayment_rate_pct numeric(7,4),               -- 변제율 (%)
  monthly_installment numeric(18,0),             -- 월 분할액

  -- 별제권부: 별제권 충족 여부 표시
  secured_shortage_amount numeric(18,0),  -- 별제권 부족분 (일반채권으로 전환된 금액)

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id, creditor_id)
);

comment on table public.insolvency_repayment_allocations is '채권자별 변제 배분. 별제권부/우선변제/일반채권별 안분비례 결과.';

create index if not exists idx_repayment_plans_case on public.insolvency_repayment_plans (case_id, status);
create index if not exists idx_repayment_allocations_plan on public.insolvency_repayment_allocations (plan_id);
create index if not exists idx_repayment_allocations_creditor on public.insolvency_repayment_allocations (creditor_id);

alter table public.insolvency_repayment_plans enable row level security;
alter table public.insolvency_repayment_plans force row level security;
alter table public.insolvency_repayment_allocations enable row level security;
alter table public.insolvency_repayment_allocations force row level security;

drop policy if exists repayment_plans_select on public.insolvency_repayment_plans;
create policy repayment_plans_select on public.insolvency_repayment_plans
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists repayment_plans_write on public.insolvency_repayment_plans;
create policy repayment_plans_write on public.insolvency_repayment_plans
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists repayment_plans_service_role on public.insolvency_repayment_plans;
create policy repayment_plans_service_role on public.insolvency_repayment_plans
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists repayment_allocations_select on public.insolvency_repayment_allocations;
create policy repayment_allocations_select on public.insolvency_repayment_allocations
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists repayment_allocations_write on public.insolvency_repayment_allocations;
create policy repayment_allocations_write on public.insolvency_repayment_allocations
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists repayment_allocations_service_role on public.insolvency_repayment_allocations;
create policy repayment_allocations_service_role on public.insolvency_repayment_allocations
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_repayment_plans_updated_at on public.insolvency_repayment_plans;
create trigger trg_repayment_plans_updated_at
  before update on public.insolvency_repayment_plans
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_repayment_plans on public.insolvency_repayment_plans;
create trigger audit_insolvency_repayment_plans
  after insert or update or delete on public.insolvency_repayment_plans
  for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_repayment_allocations_updated_at on public.insolvency_repayment_allocations;
create trigger trg_repayment_allocations_updated_at
  before update on public.insolvency_repayment_allocations
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_repayment_allocations on public.insolvency_repayment_allocations;
create trigger audit_insolvency_repayment_allocations
  after insert or update or delete on public.insolvency_repayment_allocations
  for each row execute procedure audit.capture_row_change();
