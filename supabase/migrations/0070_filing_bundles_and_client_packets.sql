-- 0070: filing_bundles_and_client_packets — 산출물·전자소송 번들 + 의뢰인 액션패킷
-- 목적:
-- 1. filing_bundles: 변제계획안 기준 전자소송 제출용 파일 번들 (CSV, docx 등)
-- 2. client_action_packets: 의뢰인이 확인·이행해야 할 체크리스트 패킷
--    (보정권고서 기반 필요서류 목록 포함, 타임스탬프 기록 = 법적 증거)

do $$ begin
  create type public.filing_bundle_status as enum (
    'generating',   -- 파일 생성 중
    'ready',        -- 다운로드 가능
    'submitted',    -- 전자소송 제출 완료
    'expired',      -- 만료 (재생성 필요)
    'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_packet_status as enum (
    'pending',      -- 의뢰인 확인 대기
    'in_progress',  -- 일부 완료
    'completed',    -- 전체 완료
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_item_responsibility as enum (
    'client_self',        -- 의뢰인 본인 처리 (예: 공동인증서 발급)
    'client_visit',       -- 의뢰인 직접 방문 필요 (예: 주민센터)
    'office_prepare'      -- 사무소 준비 항목
  );
exception when duplicate_object then null; end $$;

-- 전자소송 제출 번들
create table if not exists public.insolvency_filing_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  plan_id uuid references public.insolvency_repayment_plans(id) on delete set null,

  bundle_type text not null check (bundle_type in ('csv', 'docx', 'pdf', 'zip')),
  status public.filing_bundle_status not null default 'generating',
  storage_path text,          -- 생성된 파일 경로 (case-files 버킷)
  file_size_bytes bigint,
  download_count int not null default 0,
  expires_at timestamptz,     -- 번들 만료 시각 (null = 영구 보존)
  generation_error text,

  -- 포함된 채권자 수 (스냅샷)
  creditor_count int,
  total_claim_snapshot numeric(18,0),

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.insolvency_filing_bundles is '전자소송 제출용 산출물 번들 (CSV·docx·PDF). 변제계획안 기준으로 생성됨.';

-- 의뢰인 액션패킷 (보정권고서 기반 체크리스트)
create table if not exists public.insolvency_client_action_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  ingestion_job_id uuid references public.document_ingestion_jobs(id) on delete set null,

  title text not null,        -- 예: "2024-03 보정권고서 체크리스트"
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

comment on table public.insolvency_client_action_packets is '의뢰인 체크리스트 패킷. 보정권고서 AI 분석 결과로 자동 생성. 의뢰인이 포털에서 항목 확인 시 타임스탬프 기록 = 법적 증거.';

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
  client_checked_at timestamptz,        -- 의뢰인이 확인 버튼 누른 시각 (법적 증거)
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

comment on table public.insolvency_client_action_items is '의뢰인 체크리스트 개별 항목. client_checked_at이 법적 확인 증거. responsibility로 의뢰인/방문/사무소 분류.';

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

-- filing_bundles
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

-- action_packets
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

-- action_items: 의뢰인은 자신 사건 항목만 읽기 + client_checked 컬럼 업데이트 가능
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

-- Triggers
drop trigger if exists trg_filing_bundles_updated_at on public.insolvency_filing_bundles;
create trigger trg_filing_bundles_updated_at
  before update on public.insolvency_filing_bundles
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_filing_bundles on public.insolvency_filing_bundles;
create trigger audit_insolvency_filing_bundles
  after insert or update or delete on public.insolvency_filing_bundles
  for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_action_packets_updated_at on public.insolvency_client_action_packets;
create trigger trg_action_packets_updated_at
  before update on public.insolvency_client_action_packets
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_packets on public.insolvency_client_action_packets;
create trigger audit_insolvency_client_action_packets
  after insert or update or delete on public.insolvency_client_action_packets
  for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_action_items_updated_at on public.insolvency_client_action_items;
create trigger trg_action_items_updated_at
  before update on public.insolvency_client_action_items
  for each row execute procedure app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_items on public.insolvency_client_action_items;
create trigger audit_insolvency_client_action_items
  after insert or update or delete on public.insolvency_client_action_items
  for each row execute procedure audit.capture_row_change();
