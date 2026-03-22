-- 0067: collateral_vehicle_registry — 별제권부 채권 (담보·근저당) 레지스트리
-- 목적:
-- claim_class='secured' 채권자에 연결된 담보물 정보를 별도 테이블로 관리.
-- 담보물 평가액 vs 피담보채권액을 비교해 별제권 충족 여부 및 초과/부족 계산.

do $$ begin
  create type public.collateral_type as enum (
    'real_estate',      -- 부동산 (아파트·토지 등)
    'vehicle',          -- 차량
    'deposit_account',  -- 예금 계좌 (압류)
    'insurance',        -- 보험 해약환급금
    'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.insolvency_collaterals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,

  collateral_type public.collateral_type not null,

  -- 부동산 기준
  real_estate_address text,
  real_estate_registry_number text,         -- 등기부 고유번호 (마스킹 불필요)
  real_estate_area_sqm numeric(10,2),

  -- 차량 기준
  vehicle_registration_number text,         -- 차량등록번호
  vehicle_model text,
  vehicle_year int,

  -- 공통 평가
  estimated_value numeric(18,0) check (estimated_value >= 0),  -- 현재 시장 추정가
  secured_claim_amount numeric(18,0) check (secured_claim_amount >= 0),  -- 피담보채권 총액
  -- 별제권 충족 여부: estimated_value >= secured_claim_amount
  -- 초과분 = max(0, estimated_value - secured_claim_amount) → 일반채권 재분배 재원
  -- 부족분 = max(0, secured_claim_amount - estimated_value) → 일반채권으로 전환

  valuation_basis text,    -- 평가 근거 (공시지가 / 실거래가 / KB시세 등)
  valuation_date date,

  -- AI 추출
  ai_extracted boolean not null default false,
  notes text,

  lifecycle_status public.lifecycle_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_collaterals is '별제권부 채권의 담보물 레지스트리. estimated_value vs secured_claim_amount로 별제권 초과/부족분을 계산한다.';
comment on column public.insolvency_collaterals.estimated_value is '담보물 현재 추정 시장가. 별제권 충족 시 secured_claim_amount까지만 별제권으로 처리. 초과분은 일반재단 귀속.';

create index if not exists idx_insolvency_collaterals_case on public.insolvency_collaterals (case_id, lifecycle_status);
create index if not exists idx_insolvency_collaterals_creditor on public.insolvency_collaterals (creditor_id);

alter table public.insolvency_collaterals enable row level security;
alter table public.insolvency_collaterals force row level security;

drop policy if exists insolvency_collaterals_select on public.insolvency_collaterals;
create policy insolvency_collaterals_select on public.insolvency_collaterals
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists insolvency_collaterals_write on public.insolvency_collaterals;
create policy insolvency_collaterals_write on public.insolvency_collaterals
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists insolvency_collaterals_service_role on public.insolvency_collaterals;
create policy insolvency_collaterals_service_role on public.insolvency_collaterals
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_insolvency_collaterals_updated_at on public.insolvency_collaterals;
create trigger trg_insolvency_collaterals_updated_at
  before update on public.insolvency_collaterals
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_collaterals on public.insolvency_collaterals;
create trigger audit_insolvency_collaterals
  after insert or update or delete on public.insolvency_collaterals
  for each row execute procedure audit.capture_row_change();
