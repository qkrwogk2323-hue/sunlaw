alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists must_complete_profile boolean not null default false;

create table if not exists public.organization_staff_temp_credentials (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  login_id text not null,
  login_id_normalized text not null,
  login_email citext not null unique,
  contact_email citext,
  contact_phone text,
  issued_by uuid references public.profiles(id) on delete set null,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_password_changed_at timestamptz
);

create unique index if not exists organization_staff_temp_credentials_org_login_idx
  on public.organization_staff_temp_credentials (organization_id, login_id_normalized);

create index if not exists organization_staff_temp_credentials_org_created_idx
  on public.organization_staff_temp_credentials (organization_id, created_at desc);

alter table public.organization_staff_temp_credentials enable row level security;
alter table public.organization_staff_temp_credentials force row level security;

drop policy if exists organization_staff_temp_credentials_self_select on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_self_select on public.organization_staff_temp_credentials
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists organization_staff_temp_credentials_org_manager_select on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_org_manager_select on public.organization_staff_temp_credentials
for select to authenticated
using (app.is_org_manager(organization_id));

drop policy if exists organization_staff_temp_credentials_self_update on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_self_update on public.organization_staff_temp_credentials
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop trigger if exists trg_organization_staff_temp_credentials_updated_at on public.organization_staff_temp_credentials;
create trigger trg_organization_staff_temp_credentials_updated_at
before update on public.organization_staff_temp_credentials
for each row execute function app.set_updated_at();
