-- Keep platform runtime registry and organizations table in sync after 0053.
-- This is a guard/hardening migration: no history rewrite, only forward consistency enforcement.

create or replace function app.assert_valid_platform_organization(target_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org public.organizations%rowtype;
begin
  select *
    into v_org
  from public.organizations
  where id = target_organization_id;

  if not found then
    raise exception 'platform governance guard failed: organization % not found', target_organization_id;
  end if;

  if v_org.lifecycle_status = 'soft_deleted' then
    raise exception 'platform governance guard failed: organization % is soft deleted', target_organization_id;
  end if;

  return target_organization_id;
end;
$$;

comment on function app.assert_valid_platform_organization(uuid) is
  'Validates that the runtime registry points to a live organization before sync logic runs';

create or replace function app.sync_platform_runtime_registry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app.assert_valid_platform_organization(new.platform_organization_id);

  update public.organizations
  set kind = 'platform_management'
  where id = new.platform_organization_id
    and kind <> 'platform_management';

  update public.organizations
  set is_platform_root = (id = new.platform_organization_id)
  where is_platform_root is distinct from (id = new.platform_organization_id);

  return new;
end;
$$;

comment on function app.sync_platform_runtime_registry() is
  'Keeps organizations.kind/is_platform_root aligned with the platform runtime registry singleton';

drop trigger if exists trg_platform_runtime_registry_sync on public.platform_runtime_settings;
create trigger trg_platform_runtime_registry_sync
before insert or update on public.platform_runtime_settings
for each row execute procedure app.sync_platform_runtime_registry();

create or replace function app.prevent_platform_registry_drift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_platform_org_id uuid;
begin
  v_platform_org_id := app.current_platform_organization_id();

  if v_platform_org_id is null then
    return new;
  end if;

  if new.id = v_platform_org_id then
    if new.lifecycle_status = 'soft_deleted' then
      raise exception 'platform governance drift blocked: runtime platform organization cannot be soft deleted while registered';
    end if;

    if new.kind <> 'platform_management' then
      raise exception 'platform governance drift blocked: runtime platform organization kind must remain platform_management';
    end if;

    if new.is_platform_root is distinct from true then
      raise exception 'platform governance drift blocked: runtime platform organization must remain is_platform_root = true';
    end if;
  elsif new.is_platform_root = true then
    raise exception 'platform governance drift blocked: only the runtime registry organization may hold is_platform_root = true';
  end if;

  return new;
end;
$$;

comment on function app.prevent_platform_registry_drift() is
  'Prevents direct organization updates from drifting away from the runtime platform registry semantics';

drop trigger if exists trg_platform_registry_drift_guard on public.organizations;
create trigger trg_platform_registry_drift_guard
before update of kind, is_platform_root, lifecycle_status on public.organizations
for each row execute procedure app.prevent_platform_registry_drift();

do $$
declare
  v_platform_org_id uuid;
begin
  select app.current_platform_organization_id()
    into v_platform_org_id;

  if v_platform_org_id is not null then
    perform app.assert_valid_platform_organization(v_platform_org_id);

    update public.organizations
    set kind = 'platform_management'
    where id = v_platform_org_id
      and kind <> 'platform_management';

    update public.organizations
    set is_platform_root = (id = v_platform_org_id)
    where is_platform_root is distinct from (id = v_platform_org_id);
  end if;
end
$$;
