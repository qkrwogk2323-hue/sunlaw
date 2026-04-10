-- Consolidated core tables: profiles, organizations, memberships, cases, documents, schedules, messages, requests

-- Create basic profiles table with auth.users link
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  avatar_url text,
  phone_e164 text,
  platform_role public.platform_role not null default 'standard',
  is_active boolean not null default true,
  default_organization_id uuid,
  is_client_account boolean not null default false,
  client_account_status text not null default 'active',
  client_account_status_changed_at timestamptz not null default now(),
  client_account_status_reason text,
  client_last_approved_at timestamptz,
  legal_name text,
  legal_name_confirmed_at timestamptz,
  must_change_password boolean not null default false,
  must_complete_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create organizations table
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
  updated_at timestamptz not null default now(),
  kind public.organization_kind not null default 'law_firm',
  enabled_modules jsonb not null default '{}',
  website_url text,
  onboarding_status text not null default 'approved',
  is_directory_public boolean not null default true,
  source_signup_request_id uuid,
  is_platform_root boolean not null default false,
  organization_industry text
);

-- Add FK constraint on profiles.default_organization_id
do $$ begin
  alter table public.profiles add constraint profiles_default_organization_fk foreign key (default_organization_id) references public.organizations(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Create organization_memberships table
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
  permissions jsonb not null default '{}',
  actor_category public.org_actor_category not null default 'staff',
  permission_template_key text,
  case_scope_policy public.case_scope_policy not null default 'assigned_cases_only',
  unique (organization_id, profile_id)
);

-- Create cases table
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
  stage_template_key text,
  stage_key text,
  module_flags jsonb not null default '{}',
  court_division text,
  presiding_judge text,
  assigned_judge text,
  court_room text,
  appeal_court_name text,
  appeal_division text,
  appeal_case_number text,
  appeal_presiding_judge text,
  appeal_assigned_judge text,
  appeal_court_room text,
  supreme_case_number text,
  supreme_division text,
  supreme_presiding_judge text,
  supreme_assigned_judge text,
  opponent_counsel_name text,
  opponent_counsel_phone text,
  opponent_counsel_fax text,
  client_contact_address text,
  client_contact_phone text,
  client_contact_fax text,
  deadline_filing date,
  deadline_appeal date,
  deadline_final_appeal date,
  cover_notes text,
  insolvency_subtype public.insolvency_subtype,
  colaw_case_basic_seq text,
  unique (organization_id, reference_no)
);

-- Create case_handlers table
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

-- Create case_clients table
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
  link_status public.case_client_link_status not null default 'linked',
  orphan_reason public.case_client_orphan_reason,
  relink_policy public.case_client_relink_policy not null default 'manual_review',
  detached_at timestamptz,
  orphaned_at timestamptz,
  review_deadline timestamptz,
  last_linked_hub_id uuid,
  unique (case_id, client_email_snapshot)
);

-- Create case_parties table
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

-- Create case_party_private_profiles table
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

-- Create case_documents table
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

-- Create case_document_reviews table
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

-- Create case_schedules table
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

-- Create case_recovery_activities table
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

-- Create case_messages table
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

-- Create case_requests table
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

-- Create case_request_attachments table
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

-- Create case_organizations table
create table if not exists public.case_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  role public.case_organization_role not null,
  status public.case_organization_status not null default 'active',
  instructed_by_case_organization_id uuid references public.case_organizations(id) on delete set null,
  access_scope public.case_access_scope not null default 'read_only',
  billing_scope public.case_billing_scope not null default 'none',
  communication_scope public.case_communication_scope not null default 'cross_org_only',
  is_lead boolean not null default false,
  can_submit_legal_requests boolean not null default false,
  can_receive_legal_requests boolean not null default false,
  can_manage_collection boolean not null default false,
  can_view_client_messages boolean not null default false,
  agreement_summary text,
  started_on date,
  ended_on date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, organization_id, role)
);

-- Create organization_relations table
create table if not exists public.organization_relations (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  relation_type public.organization_relation_type not null,
  is_active boolean not null default true,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_organization_id, target_organization_id, relation_type)
);

-- Create case_stage_templates table
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

-- Create case_stage_template_steps table
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

-- Create case_module_catalog table
create table if not exists public.case_module_catalog (
  module_key text primary key,
  display_name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

-- Create case_type_default_modules table
create table if not exists public.case_type_default_modules (
  id uuid primary key default gen_random_uuid(),
  case_type public.case_type not null,
  module_key text not null references public.case_module_catalog(module_key) on delete cascade,
  unique (case_type, module_key)
);

-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null default 'generic',
  title text not null,
  body text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  requires_action boolean not null default false,
  resolved_at timestamptz,
  action_label text,
  action_href text,
  action_entity_type text,
  action_target_id uuid,
  trashed_at timestamptz,
  trashed_by uuid,
  snoozed_until timestamptz,
  notification_type text not null default 'generic',
  entity_type text not null default 'collaboration',
  entity_id text,
  priority text not null default 'normal',
  status text not null default 'active',
  destination_type text not null default 'internal_route',
  destination_url text not null default '/dashboard',
  destination_params jsonb not null default '{}',
  archived_at timestamptz,
  deleted_at timestamptz
);

-- Create support_access_requests table
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

-- Create billing_entries table
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
  updated_at timestamptz not null default now(),
  fee_agreement_id uuid,
  billing_owner_case_organization_id uuid,
  bill_to_party_kind public.case_billing_party_kind,
  bill_to_case_client_id uuid,
  bill_to_case_organization_id uuid,
  description text,
  tax_amount numeric(18, 2) not null default 0,
  source_event_type text,
  source_event_id uuid
);

-- Create invitations table
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
  case_client_id uuid,
  invited_name text,
  actor_category text,
  role_template_key text,
  case_scope_policy text,
  permissions_override jsonb not null default '{}',
  revoked_at timestamptz,
  check ((kind = 'staff_invite' and requested_role is not null and case_id is null) or (kind = 'client_invite' and case_id is not null))
);

-- Create client_private_profiles table
create table if not exists public.client_private_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text not null,
  resident_number_ciphertext text not null,
  resident_number_masked text not null,
  address_line1_ciphertext text,
  address_line2_ciphertext text,
  postal_code_ciphertext text,
  mobile_phone_ciphertext text,
  key_version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create client_service_requests table
create table if not exists public.client_service_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  request_kind text not null default 'status_help',
  account_status_snapshot text not null,
  title text not null,
  body text not null,
  status text not null default 'open',
  resolved_note text,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create member_private_profiles table
create table if not exists public.member_private_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  resident_number_ciphertext text,
  resident_number_masked text,
  address_line1_ciphertext text,
  address_line2_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create organization_exit_requests table
create table if not exists public.organization_exit_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- NOTE: indexes → 011

-- Create update trigger functions
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

-- Mark document stale when approved content changes
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

-- Guard document review update to managers only
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

-- Create auto-profile trigger for new auth.users
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

-- Set up all update triggers
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

drop trigger if exists trg_case_organizations_updated_at on public.case_organizations;
create trigger trg_case_organizations_updated_at before update on public.case_organizations
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_messages_updated_at on public.case_messages;
create trigger trg_case_messages_updated_at before update on public.case_messages
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_requests_updated_at on public.case_requests;
create trigger trg_case_requests_updated_at before update on public.case_requests
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_stage_templates_updated_at on public.case_stage_templates;
create trigger trg_case_stage_templates_updated_at before update on public.case_stage_templates
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at before update on public.invitations
for each row execute procedure app.set_updated_at();

-- NOTE: RLS → 010

-- Triggers for organization_exit_requests, client_private_profiles, and member_private_profiles updated_at
drop trigger if exists trg_client_private_profiles_updated_at on public.client_private_profiles;
create trigger trg_client_private_profiles_updated_at
before update on public.client_private_profiles
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_client_service_requests_updated_at on public.client_service_requests;
create trigger trg_client_service_requests_updated_at
before update on public.client_service_requests
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_member_private_profiles_updated_at on public.member_private_profiles;
create trigger trg_member_private_profiles_updated_at
before update on public.member_private_profiles
for each row execute function app.set_updated_at();

create or replace function public.touch_org_exit_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_org_exit_requests_updated_at on public.organization_exit_requests;
create trigger trg_org_exit_requests_updated_at
before update on public.organization_exit_requests
for each row execute procedure public.touch_org_exit_requests_updated_at();

-- Audit triggers
drop trigger if exists audit_client_private_profiles on public.client_private_profiles;
create trigger audit_client_private_profiles after insert or update or delete on public.client_private_profiles
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_client_service_requests on public.client_service_requests;
create trigger audit_client_service_requests after insert or update or delete on public.client_service_requests
for each row execute procedure audit.capture_row_change();

-- Insert system case modules
insert into public.case_module_catalog (module_key, display_name, description)
values
  ('collection', 'Collection', '추심 사건에서만 노출되는 회수 운영 모듈'),
  ('insolvency', 'Insolvency', '회생/파산 사건 특화 모듈'),
  ('settlement', 'Settlement', '합의/조정 중심 사건 모듈')
on conflict (module_key) do nothing;

-- Insert default modules for debt_collection cases
insert into public.case_type_default_modules (case_type, module_key)
values ('debt_collection', 'collection')
on conflict (case_type, module_key) do nothing;

-- Seed case stage templates and steps
insert into public.case_stage_templates (organization_id, template_key, display_name, case_type, is_system)
values
  (null, 'general-default', '공통 기본', null, true),
  (null, 'civil-default', '민사 기본', 'civil', true),
  (null, 'collection-default', '추심 기본', 'debt_collection', true),
  (null, 'criminal-default', '형사 기본', 'criminal', true)
on conflict (organization_id, template_key) do nothing;

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
