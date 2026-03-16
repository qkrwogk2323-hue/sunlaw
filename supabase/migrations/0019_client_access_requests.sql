do $$ begin
  create type public.client_access_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.client_access_requests (
  id uuid primary key default gen_random_uuid(),
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_key text not null,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  requester_email citext not null,
  status public.client_access_request_status not null default 'pending',
  request_note text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_access_requests_target_status
  on public.client_access_requests (target_organization_id, status, created_at desc);

create index if not exists idx_client_access_requests_requester_status
  on public.client_access_requests (requester_profile_id, status, created_at desc);

create unique index if not exists uq_client_access_requests_pending
  on public.client_access_requests (target_organization_id, requester_profile_id)
  where status = 'pending';

alter table public.client_access_requests enable row level security;
alter table public.client_access_requests force row level security;

drop policy if exists client_access_requests_select on public.client_access_requests;
create policy client_access_requests_select on public.client_access_requests
for select to authenticated
using (
  app.is_platform_admin()
  or requester_profile_id = auth.uid()
  or app.is_org_manager(target_organization_id)
);

drop policy if exists client_access_requests_insert on public.client_access_requests;
create policy client_access_requests_insert on public.client_access_requests
for insert to authenticated
with check (requester_profile_id = auth.uid());

drop policy if exists client_access_requests_update on public.client_access_requests;
create policy client_access_requests_update on public.client_access_requests
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(target_organization_id))
with check (app.is_platform_admin() or app.is_org_manager(target_organization_id));

drop trigger if exists trg_client_access_requests_updated_at on public.client_access_requests;
create trigger trg_client_access_requests_updated_at
before update on public.client_access_requests
for each row execute procedure app.set_updated_at();