-- 0065: document_ingestion_jobs — AI 문서 수집·분류·추출 작업 큐
-- 목적:
-- 부채증명서·초본·보정권고서 등을 업로드하면 Gemini AI 추출 작업이 큐에 쌓이고,
-- API route에서 순차 처리 후 결과를 저장한다.

do $$ begin
  create type public.ingestion_status as enum (
    'pending',      -- 대기 중
    'processing',   -- AI 처리 중
    'completed',    -- 추출 완료
    'failed',       -- 실패 (retry 가능)
    'cancelled'     -- 취소
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ingestion_document_type as enum (
    'debt_certificate',       -- 부채증명서 (채권자별 채무 확인서)
    'registration_abstract',  -- 등기부등본
    'resident_abstract',      -- 주민등록초본
    'income_certificate',     -- 소득증명 (근로소득원천징수영수증 등)
    'asset_declaration',      -- 재산목록 신고서
    'correction_order',       -- 보정명령서
    'correction_recommendation', -- 보정권고서
    'other'
  );
exception when duplicate_object then null; end $$;

-- AI 추출 작업 큐
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
  ai_model text,                   -- 사용된 모델명 (예: gemini-1.5-pro)
  ai_prompt_version text,          -- 프롬프트 버전 관리용
  retry_count int not null default 0,
  max_retries int not null default 3,
  last_error text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,

  -- 추출 결과 (raw)
  extracted_json jsonb,            -- AI가 반환한 원본 JSON

  -- 감사
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.document_ingestion_jobs is 'AI 문서 수집·분류·추출 작업 큐. 부채증명서·초본·보정권고서 등을 업로드 시 생성된다.';
comment on column public.document_ingestion_jobs.extracted_json is 'AI 원본 출력 JSON. 후속 파싱(채권자목록·보정체크리스트)은 각 도메인 테이블에 저장.';

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
