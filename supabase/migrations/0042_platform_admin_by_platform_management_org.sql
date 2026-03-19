-- 플랫폼 관리자 판별을 고정 slug/is_platform_root에서 해제하고
-- 플랫폼 관리조직(kind = platform_management) 멤버십 기반으로 통일한다.

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
      and o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
  );
$$;

-- 과거 lock 마이그레이션으로 남아 있을 수 있는 is_platform_root 값을 완화한다.
update public.organizations
set is_platform_root = false
where is_platform_root = true
  and kind <> 'platform_management';
