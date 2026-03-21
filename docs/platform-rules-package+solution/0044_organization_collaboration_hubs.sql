do $$ begin
  create type public.collaboration_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;
create table if not exists public.organization_collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_hub_id uuid,
  title text not null,
  proposal_note text,
  response_note text,
  status public.collaboration_request_status not null default 'pending',
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_collaboration_requests_source_target_check check (source_organization_id <> target_organization_id)
);
create index if not exists idx_org_collaboration_requests_source_status
  on public.organization_collaboration_requests (source_organization_id, status, created_at desc);
create index if not exists idx_org_collaboration_requests_target_status
  on public.organization_collaboration_requests (target_organization_id, status, created_at desc);
create unique index if not exists uq_org_collaboration_requests_pending_pair
  on public.organization_collaboration_requests (source_organization_id, target_organization_id)
  where status = 'pending';
create table if not exists public.organization_collaboration_hubs (
  id uuid primary key default gen_random_uuid(),
  primary_organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.organization_collaboration_requests(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_collaboration_hubs_org_pair_check check (primary_organization_id <> partner_organization_id),
  constraint organization_collaboration_hubs_status_check check (status in ('active', 'archived'))
);
create unique index if not exists uq_org_collaboration_hubs_active_pair
  on public.organization_collaboration_hubs ((least(primary_organization_id, partner_organization_id)), (greatest(primary_organization_id, partner_organization_id)))
  where status = 'active';
create index if not exists idx_org_collaboration_hubs_primary_status
  on public.organization_collaboration_hubs (primary_organization_id, status, updated_at desc);
create index if not exists idx_org_collaboration_hubs_partner_status
  on public.organization_collaboration_hubs (partner_organization_id, status, updated_at desc);
alter table public.organization_collaboration_requests
  drop constraint if exists organization_collaboration_requests_approved_hub_id_fkey;
alter table public.organization_collaboration_requests
  add constraint organization_collaboration_requests_approved_hub_id_fkey
  foreign key (approved_hub_id) references public.organization_collaboration_hubs(id) on delete set null;
create table if not exists public.organization_collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_collaboration_messages_body_check check (char_length(trim(body)) > 0)
);
create index if not exists idx_org_collaboration_messages_hub_created_at
  on public.organization_collaboration_messages (hub_id, created_at desc);
create index if not exists idx_org_collaboration_messages_org_created_at
  on public.organization_collaboration_messages (organization_id, created_at desc);
alter table public.organization_collaboration_requests enable row level security;
alter table public.organization_collaboration_requests force row level security;
alter table public.organization_collaboration_hubs enable row level security;
alter table public.organization_collaboration_hubs force row level security;
alter table public.organization_collaboration_messages enable row level security;
alter table public.organization_collaboration_messages force row level security;
drop policy if exists organization_collaboration_requests_select on public.organization_collaboration_requests;
create policy organization_collaboration_requests_select on public.organization_collaboration_requests
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(source_organization_id)
  or app.is_org_member(target_organization_id)
);
drop policy if exists organization_collaboration_requests_insert on public.organization_collaboration_requests;
create policy organization_collaboration_requests_insert on public.organization_collaboration_requests
for insert to authenticated
with check (
  requested_by_profile_id = auth.uid()
  and app.is_org_manager(source_organization_id)
);
drop policy if exists organization_collaboration_requests_update on public.organization_collaboration_requests;
create policy organization_collaboration_requests_update on public.organization_collaboration_requests
for update to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(source_organization_id)
  or app.is_org_manager(target_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(source_organization_id)
  or app.is_org_manager(target_organization_id)
);
drop policy if exists organization_collaboration_hubs_select on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_select on public.organization_collaboration_hubs
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(primary_organization_id)
  or app.is_org_member(partner_organization_id)
);
drop policy if exists organization_collaboration_hubs_write on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_write on public.organization_collaboration_hubs
for all to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(primary_organization_id)
  or app.is_org_manager(partner_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(primary_organization_id)
  or app.is_org_manager(partner_organization_id)
);
drop policy if exists organization_collaboration_messages_select on public.organization_collaboration_messages;
create policy organization_collaboration_messages_select on public.organization_collaboration_messages
for select to authenticated
using (
  app.is_platform_admin()
  or exists (
    select 1
    from public.organization_collaboration_hubs hubs
    where hubs.id = hub_id
      and (
        app.is_org_member(hubs.primary_organization_id)
        or app.is_org_member(hubs.partner_organization_id)
      )
  )
);
drop policy if exists organization_collaboration_messages_insert on public.organization_collaboration_messages;
create policy organization_collaboration_messages_insert on public.organization_collaboration_messages
for insert to authenticated
with check (
  sender_profile_id = auth.uid()
  and app.is_org_member(organization_id)
  and exists (
    select 1
    from public.organization_collaboration_hubs hubs
    where hubs.id = hub_id
      and (
        hubs.primary_organization_id = organization_id
        or hubs.partner_organization_id = organization_id
      )
  )
);
drop trigger if exists trg_org_collaboration_requests_updated_at on public.organization_collaboration_requests;
create trigger trg_org_collaboration_requests_updated_at
before update on public.organization_collaboration_requests
for each row execute procedure app.set_updated_at();
drop trigger if exists trg_org_collaboration_hubs_updated_at on public.organization_collaboration_hubs;
create trigger trg_org_collaboration_hubs_updated_at
before update on public.organization_collaboration_hubs
for each row execute procedure app.set_updated_at();
