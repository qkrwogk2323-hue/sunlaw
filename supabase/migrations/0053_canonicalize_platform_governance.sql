-- Canonicalize platform governance without rewriting history.
-- 0042 is the semantic baseline. 0050 remains immutable history but is superseded here.

create table if not exists public.platform_runtime_settings (
  singleton boolean primary key default true check (singleton = true),
  platform_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_runtime_settings is 'Control plane singleton registry for platform organization governance';
comment on column public.platform_runtime_settings.platform_organization_id is 'Canonical platform organization id used by runtime governance';

create unique index if not exists uq_platform_runtime_settings_platform_organization_id
  on public.platform_runtime_settings (platform_organization_id);

alter table public.platform_runtime_settings enable row level security;

drop policy if exists platform_runtime_settings_admin_select on public.platform_runtime_settings;
create policy platform_runtime_settings_admin_select
  on public.platform_runtime_settings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships om
      join public.organizations o on o.id = om.organization_id
      where om.organization_id = platform_runtime_settings.platform_organization_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
        and om.role in ('org_owner', 'org_manager')
        and o.kind = 'platform_management'
        and o.lifecycle_status <> 'soft_deleted'
    )
  );

drop policy if exists platform_runtime_settings_admin_write on public.platform_runtime_settings;
create policy platform_runtime_settings_admin_write
  on public.platform_runtime_settings
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships om
      join public.organizations o on o.id = om.organization_id
      where om.organization_id = platform_runtime_settings.platform_organization_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
        and om.role in ('org_owner', 'org_manager')
        and o.kind = 'platform_management'
        and o.lifecycle_status <> 'soft_deleted'
    )
  )
  with check (
    exists (
      select 1
      from public.organization_memberships om
      join public.organizations o on o.id = om.organization_id
      where om.organization_id = platform_runtime_settings.platform_organization_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
        and om.role in ('org_owner', 'org_manager')
        and o.kind = 'platform_management'
        and o.lifecycle_status <> 'soft_deleted'
    )
  );

drop policy if exists platform_runtime_settings_service_role_all on public.platform_runtime_settings;
create policy platform_runtime_settings_service_role_all
  on public.platform_runtime_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists trg_platform_runtime_settings_updated_at on public.platform_runtime_settings;
create trigger trg_platform_runtime_settings_updated_at
before update on public.platform_runtime_settings
for each row execute procedure app.set_updated_at();

do $$
declare
  v_platform_org_id uuid;
begin
  select prs.platform_organization_id
    into v_platform_org_id
  from public.platform_runtime_settings prs
  where prs.singleton = true;

  if v_platform_org_id is null then
    select o.id
      into v_platform_org_id
    from public.organizations o
    where o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
      and o.is_platform_root = true
    order by o.updated_at desc nulls last, o.created_at asc
    limit 1;
  end if;

  if v_platform_org_id is null then
    select o.id
      into v_platform_org_id
    from public.organizations o
    where o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
    order by o.updated_at desc nulls last, o.created_at asc
    limit 1;
  end if;

  if v_platform_org_id is null then
    raise exception 'platform governance canonicalization failed: no active platform_management organization found';
  end if;

  insert into public.platform_runtime_settings (singleton, platform_organization_id)
  values (true, v_platform_org_id)
  on conflict (singleton) do update
    set platform_organization_id = excluded.platform_organization_id,
        updated_at = now();

  update public.organizations
  set is_platform_root = (id = v_platform_org_id)
  where is_platform_root is distinct from (id = v_platform_org_id);

  update public.organizations
  set kind = 'platform_management'
  where id = v_platform_org_id
    and kind <> 'platform_management';
end
$$;

create or replace function app.current_platform_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select prs.platform_organization_id
  from public.platform_runtime_settings prs
  where prs.singleton = true
  limit 1;
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
    from public.platform_runtime_settings prs
    join public.organization_memberships om on om.organization_id = prs.platform_organization_id
    join public.organizations o on o.id = prs.platform_organization_id
    where prs.singleton = true
      and om.profile_id = auth.uid()
      and om.status = 'active'
      and om.role in ('org_owner', 'org_manager')
      and o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
  );
$$;

alter table public.organizations
  drop constraint if exists organizations_platform_kind_slug_ck;

alter table public.organizations
  drop constraint if exists organizations_vein_slug_platform_kind_ck;

alter table public.organizations
  drop constraint if exists organizations_platform_root_slug_ck;

alter table public.organizations
  drop constraint if exists organizations_vein_slug_platform_root_ck;
