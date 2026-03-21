create schema if not exists app;
create schema if not exists audit;

do $$ begin
  create type public.platform_role as enum ('platform_admin', 'platform_support', 'standard');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.membership_role as enum ('org_owner', 'org_manager', 'org_staff');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.membership_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.case_type as enum ('civil', 'debt_collection', 'execution', 'injunction', 'criminal', 'advisory', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.case_status as enum ('intake', 'active', 'pending_review', 'approved', 'closed', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.lifecycle_status as enum ('active', 'soft_deleted', 'archived', 'legal_hold');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.retention_class as enum ('commercial_10y', 'document_5y', 'litigation_25y', 'permanent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.document_kind as enum ('complaint', 'answer', 'brief', 'evidence', 'contract', 'order', 'notice', 'opinion', 'internal_memo', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.approval_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'stale');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.schedule_kind as enum ('hearing', 'deadline', 'meeting', 'reminder', 'collection_visit', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.recovery_activity_kind as enum ('call', 'letter', 'visit', 'negotiation', 'payment', 'asset_check', 'legal_action', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.notification_kind as enum ('case_assigned', 'approval_requested', 'approval_completed', 'schedule_due', 'collection_update', 'support_request', 'generic');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.support_request_status as enum ('pending', 'approved', 'rejected', 'expired', 'consumed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.client_visibility as enum ('internal_only', 'client_visible');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.party_role as enum ('creditor', 'debtor', 'plaintiff', 'defendant', 'respondent', 'petitioner', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.entity_type as enum ('individual', 'corporation');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  avatar_url text,
  phone_e164 text,
  platform_role public.platform_role not null default 'standard',
  is_active boolean not null default true,
  default_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  business_number text,
  representative_name text,
  representative_title text,
  email citext,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  lifecycle_status public.lifecycle_status not null default 'active',
  retention_class public.retention_class not null default 'commercial_10y',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.profiles add constraint profiles_default_organization_fk foreign key (default_organization_id) references public.organizations(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference_no text,
  title text not null,
  case_type public.case_type not null,
  case_status public.case_status not null default 'intake',
  lifecycle_status public.lifecycle_status not null default 'active',
  retention_class public.retention_class not null default 'litigation_25y',
  opened_on date,
  closed_on date,
  court_name text,
  case_number text,
  principal_amount numeric(18, 2) not null default 0,
  interest_rate numeric(6, 4),
  summary text,
  legal_hold_until date,
  deleted_at timestamptz,
  row_version bigint not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference_no)
);

create table if not exists public.case_handlers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  handler_name text not null,
  role text not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, profile_id, role)
);

create table if not exists public.case_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  client_name text not null,
  client_email_snapshot citext,
  relation_label text,
  is_portal_enabled boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, client_email_snapshot)
);

create table if not exists public.case_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  party_role public.party_role not null,
  entity_type public.entity_type not null,
  display_name text not null,
  company_name text,
  registration_number_masked text,
  resident_number_last4 text,
  phone text,
  email citext,
  address_summary text,
  notes text,
  is_primary boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_party_private_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  case_party_id uuid not null unique references public.case_parties(id) on delete cascade,
  resident_number_ciphertext text,
  registration_number_ciphertext text,
  address_detail_ciphertext text,
  key_version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  document_kind public.document_kind not null,
  approval_status public.approval_status not null default 'draft',
  client_visibility public.client_visibility not null default 'internal_only',
  storage_path text,
  mime_type text,
  file_size bigint,
  summary text,
  content_markdown text,
  approval_requested_by uuid references public.profiles(id) on delete set null,
  approval_requested_by_name text,
  approval_requested_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_note text,
  row_version bigint not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_document_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  case_document_id uuid not null references public.case_documents(id) on delete cascade,
  request_status public.approval_status not null,
  requested_by uuid references public.profiles(id) on delete set null,
  requested_by_name text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_by_name text,
  comment text,
  snapshot_version bigint not null default 1,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.case_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  schedule_kind public.schedule_kind not null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  location text,
  notes text,
  client_visibility public.client_visibility not null default 'internal_only',
  is_important boolean not null default false,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_recovery_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  activity_kind public.recovery_activity_kind not null,
  occurred_at timestamptz not null,
  amount numeric(18, 2) not null default 0,
  outcome_status text,
  notes text,
  client_visibility public.client_visibility not null default 'internal_only',
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null default 'generic',
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.support_access_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_name_snapshot text not null,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_name_snapshot text not null,
  target_email_snapshot citext not null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  requested_by_name text not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_by_name text,
  reason text not null,
  approval_note text,
  status public.support_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_memberships_profile on public.organization_memberships (profile_id, status);
create index if not exists idx_org_memberships_org on public.organization_memberships (organization_id, status, role);
create index if not exists idx_cases_org on public.cases (organization_id, updated_at desc);
create index if not exists idx_cases_status on public.cases (organization_id, case_status);
create index if not exists idx_case_handlers_case on public.case_handlers (case_id);
create index if not exists idx_case_clients_case on public.case_clients (case_id);
create index if not exists idx_case_clients_profile on public.case_clients (profile_id);
create index if not exists idx_case_parties_case on public.case_parties (case_id);
create index if not exists idx_case_documents_case on public.case_documents (case_id, updated_at desc);
create index if not exists idx_case_documents_status on public.case_documents (organization_id, approval_status);
create index if not exists idx_case_document_reviews_case on public.case_document_reviews (case_id, created_at desc);
create index if not exists idx_case_schedules_case on public.case_schedules (case_id, scheduled_start);
create index if not exists idx_case_schedules_org_due on public.case_schedules (organization_id, scheduled_start);
create index if not exists idx_case_recovery_case on public.case_recovery_activities (case_id, occurred_at desc);
create index if not exists idx_notifications_recipient on public.notifications (recipient_profile_id, created_at desc);
create index if not exists idx_support_requests_org on public.support_access_requests (organization_id, status, created_at desc);

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.set_updated_at_and_row_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if row(new.*) is distinct from row(old.*) then
    new.row_version = old.row_version + 1;
  end if;
  return new;
end;
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'platform_admin'
      and p.is_active = true
  );
$$;

create or replace function app.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function app.is_org_manager(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('org_owner', 'org_manager')
  );
$$;

create or replace function app.is_org_staff(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_org_member(target_org);
$$;

create or replace function app.is_case_client(target_case uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_clients c
    where c.case_id = target_case
      and c.profile_id = auth.uid()
      and c.is_portal_enabled = true
  );
$$;

create or replace function app.can_view_case(target_case uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_platform_admin()
      or app.is_org_staff(target_org)
      or app.is_case_client(target_case);
$$;

create or replace function app.mark_document_stale()
returns trigger
language plpgsql
as $$
begin
  if old.approval_status = 'approved' and (
    new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.content_markdown is distinct from old.content_markdown
    or new.storage_path is distinct from old.storage_path
    or new.client_visibility is distinct from old.client_visibility
  ) then
    new.approval_status = 'stale';
    new.reviewed_by = null;
    new.reviewed_by_name = null;
    new.reviewed_at = null;
    new.review_note = null;
  end if;
  return new;
end;
$$;

create or replace function app.guard_document_review_update()
returns trigger
language plpgsql
as $$
begin
  if new.approval_status in ('approved', 'rejected') and not app.is_org_manager(new.organization_id) then
    raise exception 'Only org owner or manager can approve or reject documents';
  end if;
  return new;
end;
$$;

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure app.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_org_memberships_updated_at on public.organization_memberships;
create trigger trg_org_memberships_updated_at before update on public.organization_memberships
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_cases_updated_at on public.cases;
create trigger trg_cases_updated_at before update on public.cases
for each row execute procedure app.set_updated_at_and_row_version();
drop trigger if exists trg_case_handlers_updated_at on public.case_handlers;
create trigger trg_case_handlers_updated_at before update on public.case_handlers
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_clients_updated_at on public.case_clients;
create trigger trg_case_clients_updated_at before update on public.case_clients
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_parties_updated_at on public.case_parties;
create trigger trg_case_parties_updated_at before update on public.case_parties
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_party_private_updated_at on public.case_party_private_profiles;
create trigger trg_case_party_private_updated_at before update on public.case_party_private_profiles
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_documents_review_guard on public.case_documents;
create trigger trg_case_documents_review_guard before update on public.case_documents
for each row execute procedure app.guard_document_review_update();
drop trigger if exists trg_case_documents_mark_stale on public.case_documents;
create trigger trg_case_documents_mark_stale before update on public.case_documents
for each row execute procedure app.mark_document_stale();
drop trigger if exists trg_case_documents_updated_at on public.case_documents;
create trigger trg_case_documents_updated_at before update on public.case_documents
for each row execute procedure app.set_updated_at_and_row_version();
drop trigger if exists trg_case_schedules_updated_at on public.case_schedules;
create trigger trg_case_schedules_updated_at before update on public.case_schedules
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_case_recovery_updated_at on public.case_recovery_activities;
create trigger trg_case_recovery_updated_at before update on public.case_recovery_activities
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_support_requests_updated_at on public.support_access_requests;
create trigger trg_support_requests_updated_at before update on public.support_access_requests
for each row execute procedure app.set_updated_at();
