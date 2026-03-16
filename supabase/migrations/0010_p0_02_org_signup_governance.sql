-- P0-02 organization signup governance

do $$ begin
  create type public.organization_kind as enum (
    'law_firm',
    'collection_company',
    'mixed_practice',
    'corporate_legal_team',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  alter type public.organization_signup_status add value 'cancelled';
exception when duplicate_object then null; end $$;

alter table public.organizations
  add column if not exists kind public.organization_kind not null default 'law_firm',
  add column if not exists enabled_modules jsonb not null default '{}'::jsonb,
  add column if not exists website_url text,
  add column if not exists onboarding_status text not null default 'approved';

alter table public.organization_signup_requests
  add column if not exists organization_kind public.organization_kind not null default 'law_firm',
  add column if not exists website_url text,
  add column if not exists requested_modules jsonb not null default '[]'::jsonb,
  add column if not exists approved_organization_id uuid references public.organizations(id) on delete set null;

create unique index if not exists uq_org_signup_pending_requester
on public.organization_signup_requests (requester_profile_id)
where status = 'pending';

create index if not exists idx_org_signup_requests_kind_status
on public.organization_signup_requests (organization_kind, status, created_at desc);

alter table public.organization_signup_requests
  drop constraint if exists organization_signup_requests_status_rejected_requires_note;

alter table public.organization_signup_requests
  add constraint organization_signup_requests_status_rejected_requires_note
  check (status <> 'rejected' or reviewed_note is not null);

-- keep existing RLS but refresh policies to reflect approved organization link and requester self access
alter table public.organization_signup_requests enable row level security;
alter table public.organization_signup_requests force row level security;

drop policy if exists signup_requests_select on public.organization_signup_requests;
create policy signup_requests_select on public.organization_signup_requests
for select to authenticated
using (app.is_platform_admin() or requester_profile_id = auth.uid());

drop policy if exists signup_requests_insert on public.organization_signup_requests;
create policy signup_requests_insert on public.organization_signup_requests
for insert to authenticated
with check (requester_profile_id = auth.uid());

drop policy if exists signup_requests_update on public.organization_signup_requests;
create policy signup_requests_update on public.organization_signup_requests
for update to authenticated
using (
  app.is_platform_admin()
  or (requester_profile_id = auth.uid() and status = 'pending')
)
with check (
  app.is_platform_admin()
  or requester_profile_id = auth.uid()
);

-- audit and timestamps are already present; keep trigger idempotent
alter table public.organization_signup_requests
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_signup_requests_updated_at on public.organization_signup_requests;
create trigger trg_signup_requests_updated_at
before update on public.organization_signup_requests
for each row execute procedure app.set_updated_at();
