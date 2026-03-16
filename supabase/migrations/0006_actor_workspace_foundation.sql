-- Actor-driven workspace foundation

do $$ begin
  create type public.organization_signup_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_kind as enum ('staff_invite', 'client_invite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_request_kind as enum ('question', 'document_submission', 'document_request', 'schedule_request', 'call_request', 'meeting_request', 'status_check', 'signature_request', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_request_status as enum ('open', 'in_review', 'waiting_client', 'completed', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_entry_kind as enum ('retainer', 'success_fee', 'expense', 'invoice', 'payment', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_status as enum ('draft', 'issued', 'partial', 'paid', 'void');
exception when duplicate_object then null; end $$;

alter table public.organization_memberships
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.cases
  add column if not exists stage_template_key text,
  add column if not exists stage_key text,
  add column if not exists module_flags jsonb not null default '{}'::jsonb;

create table if not exists public.organization_signup_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid references public.profiles(id) on delete set null,
  requester_email citext not null,
  organization_name text not null,
  business_number text,
  representative_name text,
  representative_title text,
  contact_phone text,
  note text,
  status public.organization_signup_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  kind public.invitation_kind not null,
  status public.invitation_status not null default 'pending',
  email citext not null,
  requested_role public.membership_role,
  token_hash text not null unique,
  share_token text not null unique,
  token_hint text,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'staff_invite' and requested_role is not null and case_id is null) or (kind = 'client_invite' and case_id is not null))
);

create table if not exists public.case_stage_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  display_name text not null,
  case_type public.case_type,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, template_key)
);

create table if not exists public.case_stage_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.case_stage_templates(id) on delete cascade,
  step_key text not null,
  display_name text not null,
  sequence_no integer not null,
  created_at timestamptz not null default now(),
  unique (template_id, step_key),
  unique (template_id, sequence_no)
);

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  request_kind public.case_request_kind not null,
  title text not null,
  body text not null,
  status public.case_request_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  client_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_request_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  case_request_id uuid not null references public.case_requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  entry_kind public.billing_entry_kind not null,
  title text not null,
  amount numeric(18, 2) not null default 0,
  status public.billing_status not null default 'draft',
  due_on date,
  paid_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_signup_requests_status_created on public.organization_signup_requests (status, created_at desc);
create index if not exists idx_invitations_org_status on public.invitations (organization_id, status, created_at desc);
create index if not exists idx_invitations_case_status on public.invitations (case_id, status, created_at desc);
create index if not exists idx_case_messages_case_created on public.case_messages (case_id, created_at desc);
create index if not exists idx_case_requests_case_status on public.case_requests (case_id, status, created_at desc);
create index if not exists idx_case_requests_assigned on public.case_requests (assigned_to, status, created_at desc);
create index if not exists idx_billing_entries_case_status on public.billing_entries (case_id, status, created_at desc);

create or replace function app.has_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with membership as (
    select role, permissions
    from public.organization_memberships
    where organization_id = target_org
      and profile_id = auth.uid()
      and status = 'active'
    limit 1
  )
  select case
    when app.is_platform_admin() then true
    when exists (select 1 from membership where role in ('org_owner', 'org_manager')) then true
    else coalesce(
      (select (permissions ->> permission_key)::boolean from membership),
      case
        when exists (select 1 from membership where role = 'org_staff') and permission_key in ('case_create','case_edit','document_create','request_manage','schedule_manage') then true
        else false
      end
    )
  end;
$$;

create or replace function app.default_stage_template(case_type_value public.case_type)
returns text
language sql
immutable
as $$
  select case
    when case_type_value = 'debt_collection' then 'collection-default'
    when case_type_value = 'civil' then 'civil-default'
    when case_type_value = 'criminal' then 'criminal-default'
    else 'general-default'
  end;
$$;

update public.cases
set stage_template_key = coalesce(stage_template_key, app.default_stage_template(case_type)),
    stage_key = coalesce(stage_key, 'intake')
where stage_template_key is null or stage_key is null;

insert into public.case_stage_templates (organization_id, template_key, display_name, case_type, is_system)
select null, 'general-default', '공통 기본', null, true
where not exists (select 1 from public.case_stage_templates where organization_id is null and template_key = 'general-default');

insert into public.case_stage_templates (organization_id, template_key, display_name, case_type, is_system)
select null, 'civil-default', '민사 기본', 'civil', true
where not exists (select 1 from public.case_stage_templates where organization_id is null and template_key = 'civil-default');

insert into public.case_stage_templates (organization_id, template_key, display_name, case_type, is_system)
select null, 'collection-default', '추심 기본', 'debt_collection', true
where not exists (select 1 from public.case_stage_templates where organization_id is null and template_key = 'collection-default');

insert into public.case_stage_templates (organization_id, template_key, display_name, case_type, is_system)
select null, 'criminal-default', '형사 기본', 'criminal', true
where not exists (select 1 from public.case_stage_templates where organization_id is null and template_key = 'criminal-default');

with target as (
  select id, template_key from public.case_stage_templates where organization_id is null
)
insert into public.case_stage_template_steps (template_id, step_key, display_name, sequence_no)
select t.id, v.step_key, v.display_name, v.sequence_no
from target t
join (
  values
    ('general-default','intake','접수',1),
    ('general-default','review','검토',2),
    ('general-default','active','진행',3),
    ('general-default','closed','종결',4),
    ('civil-default','intake','상담',1),
    ('civil-default','preservation','보전처분',2),
    ('civil-default','merits','본안소송',3),
    ('civil-default','enforcement','강제집행',4),
    ('civil-default','closed','종결',5),
    ('collection-default','intake','상담',1),
    ('collection-default','preservation','보전처분',2),
    ('collection-default','merits','본안소송',3),
    ('collection-default','enforcement','강제집행',4),
    ('collection-default','recovery','회수',5),
    ('collection-default','closed','종결',6),
    ('criminal-default','intake','상담',1),
    ('criminal-default','investigation','수사',2),
    ('criminal-default','trial','공판',3),
    ('criminal-default','closed','종결',4)
) as v(template_key, step_key, display_name, sequence_no)
  on t.template_key = v.template_key
where not exists (
  select 1 from public.case_stage_template_steps s where s.template_id = t.id and s.step_key = v.step_key
);
