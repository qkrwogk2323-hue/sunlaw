-- 0066: insolvency_creditors_and_addresses — 채권자목록 + 채권자 주소
-- 목적:
-- AI가 추출한 채권자 정보를 정형화된 테이블에 저장.
-- 0009의 case_organizations (조직 단위)과 별개로, 개인 채권자도 등록 가능.
-- 채권 성격(별제권부/우선권/일반)은 별도 컬럼으로 분류.

do $$ begin
  create type public.creditor_claim_class as enum (
    'secured',          -- 별제권부 채권 (담보/근저당 있음)
    'priority',         -- 우선권 있는 채권 (세금, 임금, 임차보증금 등)
    'general'           -- 일반 개인회생채권
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.creditor_type as enum (
    'financial_institution',  -- 은행·캐피탈·보험사 등
    'government',             -- 국가·지방자치단체 (세금·사회보험)
    'individual',             -- 개인 채권자
    'corporation',            -- 법인 채권자 (금융기관 제외)
    'other'
  );
exception when duplicate_object then null; end $$;

-- 채권자목록 (= 개인회생/파산 신청서의 채권자일람표)
create table if not exists public.insolvency_creditors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  ingestion_job_id uuid references public.document_ingestion_jobs(id) on delete set null,

  -- 채권자 기본 정보
  creditor_name text not null,
  creditor_type public.creditor_type not null default 'financial_institution',
  creditor_business_number text,  -- 사업자등록번호 (법인)
  creditor_national_id_masked text, -- 주민번호 앞 6자리만 (개인) — 뒷자리 저장 금지

  -- 채권 정보
  claim_class public.creditor_claim_class not null,
  principal_amount numeric(18,0) not null check (principal_amount >= 0),
  interest_amount numeric(18,0) not null default 0 check (interest_amount >= 0),
  penalty_amount numeric(18,0) not null default 0 check (penalty_amount >= 0),
  total_claim_amount numeric(18,0) generated always as (principal_amount + interest_amount + penalty_amount) stored,
  interest_rate_pct numeric(5,2),          -- 이자율 (%)
  overdue_since date,                      -- 연체 시작일
  original_contract_date date,             -- 최초 계약일
  account_number_masked text,              -- 계좌/대출번호 마스킹

  -- 보증인
  has_guarantor boolean not null default false,
  guarantor_name text,

  -- AI 추출 메타데이터
  ai_extracted boolean not null default false,
  ai_confidence_score numeric(4,3) check (ai_confidence_score between 0 and 1),
  source_page_reference text,    -- 원본 문서 페이지 참조 (예: "p.3 3행")

  -- 편집 상태
  is_confirmed boolean not null default false,  -- 직원이 검토 확정한 row
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  notes text,

  -- soft delete
  lifecycle_status public.lifecycle_status not null default 'active',
  deleted_at timestamptz,

  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_creditors is '개인회생·파산 채권자목록. AI 추출 또는 수동 입력. claim_class로 별제권부/우선권/일반 분류.';
comment on column public.insolvency_creditors.creditor_national_id_masked is '개인채권자 주민번호 앞 6자리만 저장. 뒷자리(7자리) 저장 절대 금지.';
comment on column public.insolvency_creditors.account_number_masked is '계좌/대출번호 마스킹 표기 (예: ****-1234). 원번호 저장 금지.';

-- 채권자 연락처·주소 (분리 저장 — 민감정보 격리)
create table if not exists public.insolvency_creditor_addresses (
  id uuid primary key default gen_random_uuid(),
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  address_type text not null default 'service',  -- service(송달) | registered(등기)
  postal_code text,
  address_line1 text,
  address_line2 text,
  phone text,
  fax text,
  email text,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_insolvency_creditors_case on public.insolvency_creditors (case_id, lifecycle_status, claim_class);
create index if not exists idx_insolvency_creditors_org on public.insolvency_creditors (organization_id, lifecycle_status);
create index if not exists idx_insolvency_creditor_addresses_creditor on public.insolvency_creditor_addresses (creditor_id);

alter table public.insolvency_creditors enable row level security;
alter table public.insolvency_creditors force row level security;
alter table public.insolvency_creditor_addresses enable row level security;
alter table public.insolvency_creditor_addresses force row level security;

-- insolvency_creditors RLS
drop policy if exists insolvency_creditors_select on public.insolvency_creditors;
create policy insolvency_creditors_select on public.insolvency_creditors
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists insolvency_creditors_write on public.insolvency_creditors;
create policy insolvency_creditors_write on public.insolvency_creditors
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists insolvency_creditors_service_role on public.insolvency_creditors;
create policy insolvency_creditors_service_role on public.insolvency_creditors
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- insolvency_creditor_addresses RLS
drop policy if exists insolvency_creditor_addresses_select on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_select on public.insolvency_creditor_addresses
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists insolvency_creditor_addresses_write on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_write on public.insolvency_creditor_addresses
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists insolvency_creditor_addresses_service_role on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_service_role on public.insolvency_creditor_addresses
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Triggers
drop trigger if exists trg_insolvency_creditors_updated_at on public.insolvency_creditors;
create trigger trg_insolvency_creditors_updated_at
  before update on public.insolvency_creditors
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_creditors on public.insolvency_creditors;
create trigger audit_insolvency_creditors
  after insert or update or delete on public.insolvency_creditors
  for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_insolvency_creditor_addresses_updated_at on public.insolvency_creditor_addresses;
create trigger trg_insolvency_creditor_addresses_updated_at
  before update on public.insolvency_creditor_addresses
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_creditor_addresses on public.insolvency_creditor_addresses;
create trigger audit_insolvency_creditor_addresses
  after insert or update or delete on public.insolvency_creditor_addresses
  for each row execute procedure audit.capture_row_change();
