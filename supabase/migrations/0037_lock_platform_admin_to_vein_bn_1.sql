do $$
begin
  if exists (select 1 from public.organizations where slug = 'vein-bn-1') then
    update public.organizations
    set is_platform_root = case when slug = 'vein-bn-1' then true else false end
    where is_platform_root = true or slug = 'vein-bn-1';
  end if;
end
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
    from public.organization_memberships om
    join public.organizations o on o.id = om.organization_id
    where om.profile_id = auth.uid()
      and om.status = 'active'
      and om.role in ('org_owner', 'org_manager')
      and o.is_platform_root = true
      and o.slug = 'vein-bn-1'
  );
$$;
