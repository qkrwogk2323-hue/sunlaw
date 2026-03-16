alter table public.profiles
  add column if not exists is_client_account boolean not null default false,
  add column if not exists client_account_status text not null default 'active',
  add column if not exists client_account_status_changed_at timestamptz not null default now(),
  add column if not exists client_account_status_reason text,
  add column if not exists client_last_approved_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_client_account_status_check;

alter table public.profiles
  add constraint profiles_client_account_status_check
  check (client_account_status in ('active', 'pending_initial_approval', 'pending_reapproval'));

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

create index if not exists idx_client_private_profiles_created_at
  on public.client_private_profiles (created_at desc);

create index if not exists idx_client_service_requests_profile_status
  on public.client_service_requests (profile_id, status, created_at desc);

create index if not exists idx_client_service_requests_org_status
  on public.client_service_requests (organization_id, status, created_at desc);

grant select, insert, update, delete on public.client_private_profiles to authenticated;
grant select, insert, update, delete on public.client_service_requests to authenticated;

alter table public.client_private_profiles enable row level security;
alter table public.client_private_profiles force row level security;
alter table public.client_service_requests enable row level security;
alter table public.client_service_requests force row level security;

drop policy if exists client_private_profiles_select on public.client_private_profiles;
create policy client_private_profiles_select on public.client_private_profiles
for select to authenticated
using (profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists client_private_profiles_insert on public.client_private_profiles;
create policy client_private_profiles_insert on public.client_private_profiles
for insert to authenticated
with check (profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists client_private_profiles_update on public.client_private_profiles;
create policy client_private_profiles_update on public.client_private_profiles
for update to authenticated
using (profile_id = auth.uid() or app.is_platform_admin())
with check (profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists client_service_requests_select on public.client_service_requests;
create policy client_service_requests_select on public.client_service_requests
for select to authenticated
using (
  profile_id = auth.uid()
  or app.is_platform_admin()
  or (organization_id is not null and app.is_org_manager(organization_id))
);

drop policy if exists client_service_requests_insert on public.client_service_requests;
create policy client_service_requests_insert on public.client_service_requests
for insert to authenticated
with check (profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists client_service_requests_update on public.client_service_requests;
create policy client_service_requests_update on public.client_service_requests
for update to authenticated
using (
  app.is_platform_admin()
  or (organization_id is not null and app.is_org_manager(organization_id))
)
with check (
  app.is_platform_admin()
  or (organization_id is not null and app.is_org_manager(organization_id))
);

drop trigger if exists trg_client_private_profiles_updated_at on public.client_private_profiles;
create trigger trg_client_private_profiles_updated_at
before update on public.client_private_profiles
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_client_service_requests_updated_at on public.client_service_requests;
create trigger trg_client_service_requests_updated_at
before update on public.client_service_requests
for each row execute procedure app.set_updated_at();

drop trigger if exists audit_client_private_profiles on public.client_private_profiles;
create trigger audit_client_private_profiles after insert or update or delete on public.client_private_profiles
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_client_service_requests on public.client_service_requests;
create trigger audit_client_service_requests after insert or update or delete on public.client_service_requests
for each row execute procedure audit.capture_row_change();