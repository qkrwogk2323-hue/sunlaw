-- ═══════════════════════════════════════════════════════════════════════════
-- 007_insolvency_shared.sql
-- Shared AI extraction + insolvency framework layer
-- ═══════════════════════════════════════════════════════════════════════════
-- This migration consolidates the core insolvency infrastructure that will be
-- shared between 개인회생 (rehabilitation) and 개인파산 (bankruptcy) modules.
--
-- Includes:
-- 1. Insolvency case type + subtype enums
-- 2. Document ingestion job queue for AI extraction
-- 3. AI-extracted creditor staging tables
-- 4. Collateral registry for secured claims
-- 5. Priority claim classification
-- 6. Ruleset constants for legal thresholds
-- 7. Repayment plan engine (computation framework)
-- 8. Filing bundles + client action packets (deliverables)
--
-- Origin migrations:
--   0063: insolvency enums
--   0064: insolvency case_type module registration
--   0065: document_ingestion_jobs (AI queue)
--   0066: insolvency_creditors + addresses (AI staging)
--   0067: insolvency_collaterals (secured claim registry)
--   0068: insolvency_priority_claims + ruleset_constants
--   0069: insolvency_repayment_plans + allocations (engine)
--   0070: insolvency_filing_bundles + client_action_packets (deliverables)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1: Enums — Case Types & Classification
-- ───────────────────────────────────────────────────────────────────────────

-- case_type enum: add insolvency (0063)
alter type public.case_type add value if not exists 'insolvency';

-- insolvency_subtype enum: individual rehab/bankruptcy, corporate (0063)
do $$ begin
  create type public.insolvency_subtype as enum (
    'individual_rehabilitation',
    'individual_bankruptcy',
    'corporate_rehabilitation',
    'corporate_bankruptcy'
  );
exception when duplicate_object then null; end $$;

-- Creditor claim classification (0066)
do $$ begin
  create type public.creditor_claim_class as enum (
    'secured',          -- 별제권부 채권 (담보/근저당)
    'priority',         -- 우선권 있는 채권 (세금, 임금, 임차보증금)
    'general'           -- 일반 개인회생채권
  );
exception when duplicate_object then null; end $$;

-- Creditor type classification (0066)
do $$ begin
  create type public.creditor_type as enum (
    'financial_institution',  -- 은행·캐피탈·보험사
    'government',             -- 국가·지방자치단체 (세금·사회보험)
    'individual',             -- 개인 채권자
    'corporation',            -- 법인 채권자 (금융기관 제외)
    'other'
  );
exception when duplicate_object then null; end $$;

-- Collateral type enum (0067)
do $$ begin
  create type public.collateral_type as enum (
    'real_estate',      -- 부동산
    'vehicle',          -- 차량
    'deposit_account',  -- 예금 계좌 (압류)
    'insurance',        -- 보험 해약환급금
    'other'
  );
exception when duplicate_object then null; end $$;

-- Priority claim subtype (0068)
do $$ begin
  create type public.priority_claim_subtype as enum (
    'national_tax',           -- 국세
    'local_tax',              -- 지방세
    'social_insurance',       -- 4대보험
    'wage_arrears',           -- 미지급 임금
    'lease_deposit',          -- 임차 보증금
    'child_support',          -- 양육비·부양료
    'other_priority'
  );
exception when duplicate_object then null; end $$;

-- Repayment plan status (0069)
do $$ begin
  create type public.repayment_plan_status as enum (
    'draft',        -- 초안
    'confirmed',    -- 확정
    'filed',        -- 법원 제출 완료
    'approved',     -- 법원 인가
    'rejected',     -- 법원 기각
    'cancelled'     -- 취소
  );
exception when duplicate_object then null; end $$;

-- Document ingestion status (0065)
do $$ begin
  create type public.ingestion_status as enum (
    'pending',      -- 대기 중
    'processing',   -- AI 처리 중
    'completed',    -- 추출 완료
    'failed',       -- 실패 (retry 가능)
    'cancelled'     -- 취소
  );
exception when duplicate_object then null; end $$;

-- Document type classification (0065)
do $$ begin
  create type public.ingestion_document_type as enum (
    'debt_certificate',           -- 부채증명서
    'registration_abstract',      -- 등기부등본
    'resident_abstract',          -- 주민등록초본
    'income_certificate',         -- 소득증명
    'asset_declaration',          -- 재산목록 신고서
    'correction_order',           -- 보정명령서
    'correction_recommendation',  -- 보정권고서
    'other'
  );
exception when duplicate_object then null; end $$;

-- Filing bundle status (0070)
do $$ begin
  create type public.filing_bundle_status as enum (
    'generating',   -- 파일 생성 중
    'ready',        -- 다운로드 가능
    'submitted',    -- 전자소송 제출 완료
    'expired',      -- 만료
    'failed'
  );
exception when duplicate_object then null; end $$;

-- Action packet status (0070)
do $$ begin
  create type public.action_packet_status as enum (
    'pending',      -- 의뢰인 확인 대기
    'in_progress',  -- 일부 완료
    'completed',    -- 전체 완료
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- Action item responsibility (0070)
do $$ begin
  create type public.action_item_responsibility as enum (
    'client_self',        -- 의뢰인 본인 처리
    'client_visit',       -- 의뢰인 직접 방문 필요
    'office_prepare'      -- 사무소 준비 항목
  );
exception when duplicate_object then null; end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2: Cases Table — Insolvency Metadata (0064)
-- ───────────────────────────────────────────────────────────────────────────

alter table public.cases
  add column if not exists insolvency_subtype public.insolvency_subtype;

comment on column public.cases.insolvency_subtype is
  '도산 사건 세부 유형 (case_type = insolvency 일 때만 사용)';

-- Constraint: insolvency_subtype only valid when case_type = insolvency
alter table public.cases
  drop constraint if exists chk_insolvency_subtype_requires_type;

alter table public.cases
  add constraint chk_insolvency_subtype_requires_type check (
    insolvency_subtype is null
    or case_type = 'insolvency'
  );

-- Register insolvency module in case_type_default_modules (0064)
insert into public.case_type_default_modules (case_type, module_key)
values ('insolvency', 'insolvency')
on conflict (case_type, module_key) do nothing;

-- Index for insolvency case queries (0064)
create index if not exists idx_cases_insolvency_subtype
  on public.cases (organization_id, insolvency_subtype)
  where case_type = 'insolvency';

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3: Document Ingestion Queue (0065)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.document_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  case_document_id uuid references public.case_documents(id) on delete set null,

  -- 업로드된 파일 정보
  storage_path text not null,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes bigint,
  document_type public.ingestion_document_type not null default 'other',

  -- AI 처리 상태
  status public.ingestion_status not null default 'pending',
  ai_model text,
  ai_prompt_version text,
  retry_count int not null default 0,
  max_retries int not null default 3,
  last_error text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,

  -- 추출 결과 (raw)
  extracted_json jsonb,

  -- 감사
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_ingestion_jobs is
  'AI 문서 수집·분류·추출 작업 큐. 부채증명서·초본·보정권고서 등 업로드 시 생성.';
comment on column public.document_ingestion_jobs.extracted_json is
  'AI 원본 출력 JSON. 후속 파싱은 도메인 테이블에 저장.';

create index if not exists idx_ingestion_jobs_case on public.document_ingestion_jobs (case_id, status);
create index if not exists idx_ingestion_jobs_org_status on public.document_ingestion_jobs (organization_id, status, created_at desc);
create index if not exists idx_ingestion_jobs_pending on public.document_ingestion_jobs (status, created_at)
  where status in ('pending', 'failed');

alter table public.document_ingestion_jobs enable row level security;
alter table public.document_ingestion_jobs force row level security;

drop policy if exists ingestion_jobs_select on public.document_ingestion_jobs;
create policy ingestion_jobs_select on public.document_ingestion_jobs
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists ingestion_jobs_insert on public.document_ingestion_jobs;
create policy ingestion_jobs_insert on public.document_ingestion_jobs
  for insert to authenticated
  with check (app.is_org_staff(organization_id));

drop policy if exists ingestion_jobs_update on public.document_ingestion_jobs;
create policy ingestion_jobs_update on public.document_ingestion_jobs
  for update to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists ingestion_jobs_service_role on public.document_ingestion_jobs;
create policy ingestion_jobs_service_role on public.document_ingestion_jobs
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_ingestion_jobs_updated_at on public.document_ingestion_jobs;
create trigger trg_ingestion_jobs_updated_at
  before update on public.document_ingestion_jobs
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_document_ingestion_jobs on public.document_ingestion_jobs;
create trigger audit_document_ingestion_jobs
  after insert or update or delete on public.document_ingestion_jobs
  for each row execute procedure audit.capture_row_change();

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4: AI-Extracted Creditor Staging Tables (0066)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.insolvency_creditors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  ingestion_job_id uuid references public.document_ingestion_jobs(id) on delete set null,

  -- 채권자 기본 정보
  creditor_name text not null,
  creditor_type public.creditor_type not null default 'financial_institution',
  creditor_business_number text,
  creditor_national_id_masked text,  -- 앞 6자리만

  -- 채권 정보
  claim_class public.creditor_claim_class not null,
  principal_amount numeric(18,0) not null check (principal_amount >= 0),
  interest_amount numeric(18,0) not null default 0 check (interest_amount >= 0),
  penalty_amount numeric(18,0) not null default 0 check (penalty_amount >= 0),
  total_claim_amount numeric(18,0) generated always as (principal_amount + interest_amount + penalty_amount) stored,
  interest_rate_pct numeric(5,2),
  overdue_since date,
  original_contract_date date,
  account_number_masked text,

  -- 보증인
  has_guarantor boolean not null default false,
  guarantor_name text,

  -- AI 추출 메타데이터
  ai_extracted boolean not null default false,
  ai_confidence_score numeric(4,3) check (ai_confidence_score between 0 and 1),
  source_page_reference text,

  -- 편집 상태
  is_confirmed boolean not null default false,
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

comment on table public.insolvency_creditors is
  '개인회생·파산 채권자목록. AI 추출 또는 수동 입력.';
comment on column public.insolvency_creditors.creditor_national_id_masked is
  '개인채권자 주민번호 앞 6자리만 저장. 뒷자리 저장 금지.';
comment on column public.insolvency_creditors.account_number_masked is
  '계좌/대출번호 마스킹 표기 (예: ****-1234). 원번호 저장 금지.';

-- 채권자 연락처·주소 (민감정보 격리)
create table if not exists public.insolvency_creditor_addresses (
  id uuid primary key default gen_random_uuid(),
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  address_type text not null default 'service',  -- service | registered
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

-- RLS: insolvency_creditors
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

-- RLS: insolvency_creditor_addresses
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

-- Triggers: insolvency_creditors
drop trigger if exists trg_insolvency_creditors_updated_at on public.insolvency_creditors;
create trigger trg_insolvency_creditors_updated_at
  before update on public.insolvency_creditors
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_creditors on public.insolvency_creditors;
create trigger audit_insolvency_creditors
  after insert or update or delete on public.insolvency_creditors
  for each row execute procedure audit.capture_row_change();

-- Triggers: insolvency_creditor_addresses
drop trigger if exists trg_insolvency_creditor_addresses_updated_at on public.insolvency_creditor_addresses;
create trigger trg_insolvency_creditor_addresses_updated_at
  before update on public.insolvency_creditor_addresses
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_creditor_addresses on public.insolvency_creditor_addresses;
create trigger audit_insolvency_creditor_addresses
  after insert or update or delete on public.insolvency_creditor_addresses
  for each row execute procedure audit.capture_row_change();

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5: Collateral Registry (0067)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.insolvency_collaterals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,

  collateral_type public.collateral_type not null,

  -- 부동산
  real_estate_address text,
  real_estate_registry_number text,
  real_estate_area_sqm numeric(10,2),

  -- 차량
  vehicle_registration_number text,
  vehicle_model text,
  vehicle_year int,

  -- 공통 평가
  estimated_value numeric(18,0) check (estimated_value >= 0),
  secured_claim_amount numeric(18,0) check (secured_claim_amount >= 0),
  valuation_basis text,
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

comment on table public.insolvency_collaterals is
  '별제권부 채권의 담보물 레지스트리. estimated_value vs secured_claim_amount로 별제권 초과/부족분 계산.';
comment on column public.insolvency_collaterals.estimated_value is
  '담보물 현재 추정 시장가. 별제권 충족 시 secured_claim_amount까지만 별제권으로 처리.';

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

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6: Priority Claims + Ruleset Constants (0068)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.insolvency_priority_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,

  priority_subtype public.priority_claim_subtype not null,

  -- 세금/보험료
  tax_period_from date,
  tax_period_to date,
  tax_notice_number text,

  -- 임금
  employment_period_from date,
  employment_period_to date,

  -- 법적 우선 한도 정보
  statutory_priority_cap numeric(18,0),
  priority_basis_text text,

  confirmed_priority_amount numeric(18,0) not null default 0,

  notes text,
  lifecycle_status public.lifecycle_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_priority_claims is
  '우선변제채권 상세 분류. 개인회생에서는 변제계획 전기간 전액변제 필요.';

-- 법적 ruleset (연도별 한도 상수 테이블)
create table if not exists public.insolvency_ruleset_constants (
  id uuid primary key default gen_random_uuid(),
  ruleset_key text not null,
  display_name text not null,
  legal_basis text,
  effective_from date not null,
  effective_to date,
  value_amount numeric(18,0),
  value_pct numeric(6,4),
  region_code text,
  notes text,
  created_at timestamptz not null default now(),
  unique (ruleset_key, effective_from)
);

comment on table public.insolvency_ruleset_constants is
  '개인회생·파산 법적 한도 상수 (소액임차보증금·최저생계비 등). 연도·지역별 갱신.';

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

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7: Repayment Plan Engine (0069)
-- ───────────────────────────────────────────────────────────────────────────

-- 변제계획 헤더 (사건당 복수 버전 관리)
create table if not exists public.insolvency_repayment_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,

  version_number int not null default 1,
  status public.repayment_plan_status not null default 'draft',
  insolvency_subtype public.insolvency_subtype,

  -- 기간 설정
  repayment_months int not null check (repayment_months in (36, 60)),
  plan_start_date date,
  plan_end_date date,

  -- 소득/생계비 기준
  monthly_income numeric(18,0) not null default 0,
  monthly_living_cost numeric(18,0) not null default 0,
  monthly_disposable numeric(18,0) generated always as (
    greatest(0, monthly_income - monthly_living_cost)
  ) stored,

  -- 채권 총액 요약 (스냅샷)
  total_secured_claim numeric(18,0) not null default 0,
  total_priority_claim numeric(18,0) not null default 0,
  total_general_claim numeric(18,0) not null default 0,
  total_claim_amount numeric(18,0) generated always as (
    total_secured_claim + total_priority_claim + total_general_claim
  ) stored,

  -- 변제 총액 및 안분비례
  total_repayment_amount numeric(18,0),
  general_repayment_pool numeric(18,0),
  general_repayment_rate_pct numeric(7,4),

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

comment on table public.insolvency_repayment_plans is
  '개인회생 변제계획안. 36/60개월 기간, 월변제액, 안분비례 결과를 버전별로 저장.';

-- 채권자별 변제 배분 상세
create table if not exists public.insolvency_repayment_allocations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.insolvency_repayment_plans(id) on delete cascade,
  creditor_id uuid not null references public.insolvency_creditors(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  claim_class public.creditor_claim_class not null,
  original_claim_amount numeric(18,0) not null,
  allocated_amount numeric(18,0) not null,
  repayment_rate_pct numeric(7,4),
  monthly_installment numeric(18,0),

  -- 별제권부: 별제권 충족 여부 표시
  secured_shortage_amount numeric(18,0),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (plan_id, creditor_id)
);

comment on table public.insolvency_repayment_allocations is
  '채권자별 변제 배분. 별제권부/우선변제/일반채권별 안분비례 결과.';

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

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 8: Filing Bundles + Client Action Packets (0070)
-- ───────────────────────────────────────────────────────────────────────────

-- 전자소송 제출 번들
create table if not exists public.insolvency_filing_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  plan_id uuid references public.insolvency_repayment_plans(id) on delete set null,

  bundle_type text not null check (bundle_type in ('csv', 'docx', 'pdf', 'zip')),
  status public.filing_bundle_status not null default 'generating',
  storage_path text,
  file_size_bytes bigint,
  download_count int not null default 0,
  expires_at timestamptz,
  generation_error text,

  -- 포함된 채권자 수 (스냅샷)
  creditor_count int,
  total_claim_snapshot numeric(18,0),

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_filing_bundles is
  '전자소송 제출용 산출물 번들 (CSV·docx·PDF). 변제계획안 기준으로 생성됨.';

-- 의뢰인 액션패킷 (보정권고서 기반 체크리스트)
create table if not exists public.insolvency_client_action_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  ingestion_job_id uuid references public.document_ingestion_jobs(id) on delete set null,

  title text not null,
  status public.action_packet_status not null default 'pending',
  due_date date,
  notes text,

  completed_count int not null default 0,
  total_count int not null default 0,

  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_client_action_packets is
  '의뢰인 체크리스트 패킷. 보정권고서 AI 분석 결과로 자동 생성. 타임스탬프 기록 = 법적 증거.';

-- 체크리스트 개별 항목
create table if not exists public.insolvency_client_action_items (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.insolvency_client_action_packets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,

  display_order int not null default 0,
  title text not null,
  description text,
  responsibility public.action_item_responsibility not null,

  -- 의뢰인 확인 (클라이언트 포털)
  client_checked_at timestamptz,
  client_checked_by uuid references public.profiles(id) on delete set null,
  client_note text,

  -- 직원 확인
  staff_verified_at timestamptz,
  staff_verified_by uuid references public.profiles(id) on delete set null,
  staff_note text,

  is_completed boolean not null default false,
  completed_at timestamptz,

  ai_extracted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_client_action_items is
  '의뢰인 체크리스트 개별 항목. client_checked_at이 법적 확인 증거.';

create index if not exists idx_filing_bundles_case on public.insolvency_filing_bundles (case_id, status);
create index if not exists idx_action_packets_case on public.insolvency_client_action_packets (case_id, status);
create index if not exists idx_action_items_packet on public.insolvency_client_action_items (packet_id, display_order);
create index if not exists idx_action_items_case on public.insolvency_client_action_items (case_id, is_completed);

alter table public.insolvency_filing_bundles enable row level security;
alter table public.insolvency_filing_bundles force row level security;
alter table public.insolvency_client_action_packets enable row level security;
alter table public.insolvency_client_action_packets force row level security;
alter table public.insolvency_client_action_items enable row level security;
alter table public.insolvency_client_action_items force row level security;

-- RLS: filing_bundles
drop policy if exists filing_bundles_select on public.insolvency_filing_bundles;
create policy filing_bundles_select on public.insolvency_filing_bundles
  for select to authenticated
  using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists filing_bundles_write on public.insolvency_filing_bundles;
create policy filing_bundles_write on public.insolvency_filing_bundles
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists filing_bundles_service_role on public.insolvency_filing_bundles;
create policy filing_bundles_service_role on public.insolvency_filing_bundles
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RLS: action_packets
drop policy if exists action_packets_select on public.insolvency_client_action_packets;
create policy action_packets_select on public.insolvency_client_action_packets
  for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_org_member(organization_id)
    or app.is_case_client(case_id)
  );

drop policy if exists action_packets_write on public.insolvency_client_action_packets;
create policy action_packets_write on public.insolvency_client_action_packets
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists action_packets_service_role on public.insolvency_client_action_packets;
create policy action_packets_service_role on public.insolvency_client_action_packets
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RLS: action_items
drop policy if exists action_items_select on public.insolvency_client_action_items;
create policy action_items_select on public.insolvency_client_action_items
  for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_org_member(organization_id)
    or app.is_case_client(case_id)
  );

drop policy if exists action_items_staff_write on public.insolvency_client_action_items;
create policy action_items_staff_write on public.insolvency_client_action_items
  for all to authenticated
  using (app.is_org_staff(organization_id))
  with check (app.is_org_staff(organization_id));

drop policy if exists action_items_service_role on public.insolvency_client_action_items;
create policy action_items_service_role on public.insolvency_client_action_items
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Triggers: filing_bundles
drop trigger if exists trg_filing_bundles_updated_at on public.insolvency_filing_bundles;
create trigger trg_filing_bundles_updated_at
  before update on public.insolvency_filing_bundles
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_filing_bundles on public.insolvency_filing_bundles;
create trigger audit_insolvency_filing_bundles
  after insert or update or delete on public.insolvency_filing_bundles
  for each row execute procedure audit.capture_row_change();

-- Triggers: action_packets
drop trigger if exists trg_action_packets_updated_at on public.insolvency_client_action_packets;
create trigger trg_action_packets_updated_at
  before update on public.insolvency_client_action_packets
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_packets on public.insolvency_client_action_packets;
create trigger audit_insolvency_client_action_packets
  after insert or update or delete on public.insolvency_client_action_packets
  for each row execute procedure audit.capture_row_change();

-- Triggers: action_items
drop trigger if exists trg_action_items_updated_at on public.insolvency_client_action_items;
create trigger trg_action_items_updated_at
  before update on public.insolvency_client_action_items
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_items on public.insolvency_client_action_items;
create trigger audit_insolvency_client_action_items
  after insert or update or delete on public.insolvency_client_action_items
  for each row execute procedure audit.capture_row_change();
