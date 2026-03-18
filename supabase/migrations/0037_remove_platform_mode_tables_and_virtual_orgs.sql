drop table if exists public.platform_admin_scenario_controls cascade;
drop table if exists public.platform_admin_security_controls cascade;

create or replace function app.has_platform_admin_security_access(target_profile uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_platform_admin();
$$;

create or replace function app.has_platform_admin_scenario_access(target_profile uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

delete from public.organizations
where id in (
  '11111111-1111-4111-8111-111111111124',
  '22222222-2222-4222-8222-222222222224',
  '33333333-3333-4333-8333-333333333324'
)
or slug in ('saeon-garam-beop', 'nuri-chaeum-won', 'daon-haneul-lab');
