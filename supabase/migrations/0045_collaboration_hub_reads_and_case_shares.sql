create table if not exists public.organization_collaboration_reads (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, profile_id)
);

create table if not exists public.organization_collaboration_case_shares (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  shared_by_organization_id uuid not null references public.organizations(id) on delete cascade,
  shared_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_scope text not null default 'view',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, case_id),
  constraint organization_collaboration_case_shares_permission_scope_check check (permission_scope in ('view', 'reference', 'collaborate'))
);

create index if not exists idx_org_collaboration_reads_hub_profile
  on public.organization_collaboration_reads (hub_id, profile_id, last_read_at desc);

create index if not exists idx_org_collaboration_case_shares_hub_created_at
  on public.organization_collaboration_case_shares (hub_id, created_at desc);

alter table public.organization_collaboration_reads enable row level security;
alter table public.organization_collaboration_reads force row level security;

alter table public.organization_collaboration_case_shares enable row level security;
alter table public.organization_collaboration_case_shares force row level security;

drop policy if exists organization_collaboration_reads_select on public.organization_collaboration_reads;
create policy organization_collaboration_reads_select on public.organization_collaboration_reads
for select to authenticated
using (
  app.is_platform_admin()
  or profile_id = auth.uid()
  or app.is_org_member(organization_id)
);

drop policy if exists organization_collaboration_reads_write on public.organization_collaboration_reads;
create policy organization_collaboration_reads_write on public.organization_collaboration_reads
for all to authenticated
using (
  app.is_platform_admin()
  or profile_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or profile_id = auth.uid()
);

drop policy if exists organization_collaboration_case_shares_select on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_select on public.organization_collaboration_case_shares
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

drop policy if exists organization_collaboration_case_shares_write on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_write on public.organization_collaboration_case_shares
for all to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(shared_by_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_member(shared_by_organization_id)
);

drop trigger if exists trg_org_collaboration_reads_updated_at on public.organization_collaboration_reads;
create trigger trg_org_collaboration_reads_updated_at
before update on public.organization_collaboration_reads
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_org_collaboration_case_shares_updated_at on public.organization_collaboration_case_shares;
create trigger trg_org_collaboration_case_shares_updated_at
before update on public.organization_collaboration_case_shares
for each row execute procedure app.set_updated_at();
