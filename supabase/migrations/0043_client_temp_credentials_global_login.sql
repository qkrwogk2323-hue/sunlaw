create table if not exists public.client_temp_credentials (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  login_id text not null,
  login_id_normalized text not null unique,
  login_email citext not null unique,
  issued_by uuid references public.profiles(id) on delete set null,
  contact_email citext,
  contact_phone text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_password_changed_at timestamptz
);

create index if not exists client_temp_credentials_org_idx
  on public.client_temp_credentials (organization_id, created_at desc);
create index if not exists client_temp_credentials_case_idx
  on public.client_temp_credentials (case_id, created_at desc);

alter table public.client_temp_credentials enable row level security;
alter table public.client_temp_credentials force row level security;

drop policy if exists client_temp_credentials_self_select on public.client_temp_credentials;
create policy client_temp_credentials_self_select on public.client_temp_credentials
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists client_temp_credentials_org_manager_select on public.client_temp_credentials;
create policy client_temp_credentials_org_manager_select on public.client_temp_credentials
for select to authenticated
using (organization_id is not null and app.is_org_manager(organization_id));

drop trigger if exists trg_client_temp_credentials_updated_at on public.client_temp_credentials;
create trigger trg_client_temp_credentials_updated_at
before update on public.client_temp_credentials
for each row execute function app.set_updated_at();
