-- 플랫폼 조직을 vein-bn-1 단일 루트로 고정한다.

do $$ begin
  alter type public.organization_kind add value 'platform_management';
exception when duplicate_object then null; end $$;

update public.organizations
set
  kind = 'platform_management',
  is_platform_root = true
where slug = 'vein-bn-1';

update public.organizations
set is_platform_root = false
where slug <> 'vein-bn-1'
  and is_platform_root = true;

update public.organizations
set kind = 'law_firm'
where kind = 'platform_management'
  and slug <> 'vein-bn-1';

drop index if exists uq_organizations_platform_management_singleton;
create unique index uq_organizations_platform_management_singleton
on public.organizations (kind)
where kind = 'platform_management';

alter table public.organizations
  drop constraint if exists organizations_platform_kind_slug_ck;
alter table public.organizations
  add constraint organizations_platform_kind_slug_ck
  check (kind <> 'platform_management' or slug = 'vein-bn-1');

alter table public.organizations
  drop constraint if exists organizations_vein_slug_platform_kind_ck;
alter table public.organizations
  add constraint organizations_vein_slug_platform_kind_ck
  check (slug <> 'vein-bn-1' or kind = 'platform_management');

alter table public.organizations
  drop constraint if exists organizations_platform_root_slug_ck;
alter table public.organizations
  add constraint organizations_platform_root_slug_ck
  check (is_platform_root = false or slug = 'vein-bn-1');

alter table public.organizations
  drop constraint if exists organizations_vein_slug_platform_root_ck;
alter table public.organizations
  add constraint organizations_vein_slug_platform_root_ck
  check (slug <> 'vein-bn-1' or is_platform_root = true);

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    join public.organizations o on o.id = om.organization_id
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.role in ('org_owner', 'org_manager')
      and o.slug = 'vein-bn-1'
      and o.kind = 'platform_management'
      and o.is_platform_root = true
      and o.lifecycle_status <> 'soft_deleted'
  );
$$;
