-- 0055: 사건허브 다중 조직 bridge canonicalization
-- 목적:
-- 1. case_hubs.organization_id를 legacy managing organization reference로 축소
-- 2. 허브 접근/연결의 canonical source를 case_hub_organizations로 분리
-- 3. 기존 runtime을 깨지 않기 위해 read path는 유지한 채 bridge/backfill/sync만 먼저 도입

do $$
begin
  create type public.case_hub_organization_status as enum ('active', 'pending', 'unlinked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.case_hub_organizations (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.case_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_case_organization_id uuid references public.case_organizations(id) on delete set null,
  hub_role public.case_organization_role not null,
  access_scope public.case_access_scope not null default 'read_only',
  status public.case_hub_organization_status not null default 'active',
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, organization_id)
);

comment on table public.case_hub_organizations is '사건허브와 참여 조직 간 canonical bridge';
comment on column public.case_hubs.organization_id is 'Legacy managing organization reference. Canonical org links live in case_hub_organizations.';
comment on column public.case_hub_organizations.source_case_organization_id is 'case_organizations canonical origin row';
comment on column public.case_hub_organizations.hub_role is '허브 기준 조직 역할 (case_organizations.role 계승)';
comment on column public.case_hub_organizations.access_scope is '허브 기준 조직 접근 범위 (case_organizations.access_scope 계승)';
comment on column public.case_hub_organizations.status is 'active | pending | unlinked';

create index if not exists idx_case_hub_organizations_hub on public.case_hub_organizations (hub_id, status);
create index if not exists idx_case_hub_organizations_org on public.case_hub_organizations (organization_id, status);
create index if not exists idx_case_hub_organizations_case_org on public.case_hub_organizations (source_case_organization_id);

create or replace function app.sync_case_hub_organizations(target_hub uuid)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  hub_row record;
begin
  select id, case_id, organization_id, lifecycle_status
    into hub_row
  from public.case_hubs
  where id = target_hub;

  if not found then
    return;
  end if;

  if hub_row.lifecycle_status <> 'active' then
    update public.case_hub_organizations
       set status = 'unlinked',
           unlinked_at = coalesce(unlinked_at, now()),
           updated_at = now()
     where hub_id = target_hub
       and status <> 'unlinked';
    return;
  end if;

  insert into public.case_hub_organizations (
    hub_id,
    organization_id,
    source_case_organization_id,
    hub_role,
    access_scope,
    status,
    linked_at,
    unlinked_at,
    created_by,
    updated_by
  )
  select
    target_hub,
    co.organization_id,
    co.id,
    co.role,
    co.access_scope,
    'active',
    coalesce(co.updated_at, co.created_at, now()),
    null,
    co.created_by,
    co.updated_by
  from public.case_organizations co
  where co.case_id = hub_row.case_id
    and co.status = 'active'
  on conflict (hub_id, organization_id) do update
    set source_case_organization_id = excluded.source_case_organization_id,
        hub_role = excluded.hub_role,
        access_scope = excluded.access_scope,
        status = 'active',
        unlinked_at = null,
        updated_by = coalesce(excluded.updated_by, public.case_hub_organizations.updated_by),
        updated_at = now();

  insert into public.case_hub_organizations (
    hub_id,
    organization_id,
    source_case_organization_id,
    hub_role,
    access_scope,
    status,
    linked_at,
    unlinked_at
  )
  values (
    target_hub,
    hub_row.organization_id,
    null,
    'managing_org',
    'full',
    'active',
    now(),
    null
  )
  on conflict (hub_id, organization_id) do update
    set hub_role = 'managing_org',
        access_scope = 'full',
        status = 'active',
        unlinked_at = null,
        updated_at = now();

  update public.case_hub_organizations cho
     set status = 'unlinked',
         unlinked_at = coalesce(cho.unlinked_at, now()),
         updated_at = now()
   where cho.hub_id = target_hub
     and cho.organization_id <> hub_row.organization_id
     and cho.status <> 'unlinked'
     and not exists (
       select 1
       from public.case_organizations co
       where co.case_id = hub_row.case_id
         and co.organization_id = cho.organization_id
         and co.status = 'active'
     );
end;
$$;

create or replace function app.sync_case_hub_organizations_for_case(target_case uuid)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  hub_item record;
begin
  for hub_item in
    select id
    from public.case_hubs
    where case_id = target_case
  loop
    perform app.sync_case_hub_organizations(hub_item.id);
  end loop;
end;
$$;

create or replace function app.case_hub_sync_from_case_organizations()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  affected_case uuid;
begin
  affected_case := coalesce(new.case_id, old.case_id);
  if affected_case is not null then
    perform app.sync_case_hub_organizations_for_case(affected_case);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function app.case_hub_sync_from_hubs()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  perform app.sync_case_hub_organizations(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function app.is_case_hub_org_member(target_hub uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_hub_organizations cho
    join public.organization_memberships om
      on om.organization_id = cho.organization_id
     and om.profile_id = auth.uid()
     and om.status = 'active'
    where cho.hub_id = target_hub
      and cho.status = 'active'
  );
$$;

alter table public.case_hub_organizations enable row level security;
alter table public.case_hub_organizations force row level security;

drop policy if exists case_hub_organizations_select on public.case_hub_organizations;
create policy case_hub_organizations_select
on public.case_hub_organizations
for select
to authenticated
using (
  app.is_platform_admin()
  or app.is_case_hub_org_member(hub_id)
);

drop policy if exists case_hub_organizations_service_role_all on public.case_hub_organizations;
create policy case_hub_organizations_service_role_all
on public.case_hub_organizations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop trigger if exists trg_case_hub_organizations_updated_at on public.case_hub_organizations;
create trigger trg_case_hub_organizations_updated_at
before update on public.case_hub_organizations
for each row execute procedure app.set_updated_at();

drop trigger if exists audit_case_hub_organizations on public.case_hub_organizations;
create trigger audit_case_hub_organizations
after insert or update or delete on public.case_hub_organizations
for each row execute procedure audit.capture_row_change();

drop trigger if exists trg_case_hub_sync_from_hubs on public.case_hubs;
create trigger trg_case_hub_sync_from_hubs
after insert or update of case_id, organization_id, lifecycle_status on public.case_hubs
for each row execute procedure app.case_hub_sync_from_hubs();

drop trigger if exists trg_case_hub_sync_from_case_organizations on public.case_organizations;
create trigger trg_case_hub_sync_from_case_organizations
after insert or update of organization_id, role, status, access_scope, case_id or delete on public.case_organizations
for each row execute procedure app.case_hub_sync_from_case_organizations();

do $$
declare
  hub_row record;
begin
  for hub_row in
    select id
    from public.case_hubs
  loop
    perform app.sync_case_hub_organizations(hub_row.id);
  end loop;
end;
$$;
