alter table public.organizations
  add column if not exists is_platform_root boolean not null default false;

create unique index if not exists organizations_single_platform_root_idx
  on public.organizations (is_platform_root)
  where is_platform_root = true;

with admin_orgs as (
  select
    m.organization_id,
    row_number() over (
      order by
        case when lower(o.slug) in ('vein', 'platform', 'sunlaw-platform') then 0 else 1 end,
        m.created_at asc
    ) as rn
  from public.organization_memberships m
  join public.organizations o on o.id = m.organization_id
  join public.profiles p on p.id = m.profile_id
  where m.status = 'active'
    and m.role in ('org_owner', 'org_manager')
    and p.is_active = true
    and p.platform_role = 'platform_admin'
),
picked as (
  select organization_id from admin_orgs where rn = 1
)
update public.organizations o
set is_platform_root = exists (
  select 1 from picked p where p.organization_id = o.id
);

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.organizations o on o.id = m.organization_id
    join public.profiles p on p.id = m.profile_id
    where m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('org_owner', 'org_manager')
      and o.is_platform_root = true
      and p.is_active = true
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.platform_role = 'platform_admin'
      and p.is_active = true
  );
$$;
