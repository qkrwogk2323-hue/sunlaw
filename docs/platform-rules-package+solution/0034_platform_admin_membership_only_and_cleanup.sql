-- 플랫폼 관리자 판정을 프로필 role이 아닌 플랫폼 루트 조직 멤버십으로만 통일
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
  );
$$;

-- 기존 별도 관리자 프로필 role 흔적 제거 (일반 가입자와 동일 모델)
update public.profiles
set platform_role = 'standard'
where platform_role in ('platform_admin', 'platform_support');

-- 가상/더미 조직 잔여 데이터 정리
delete from public.organizations
where id in (
  '11111111-1111-4111-8111-111111111124',
  '22222222-2222-4222-8222-222222222224',
  '33333333-3333-4333-8333-333333333324'
)
or slug in ('saeon-garam-beop', 'nuri-chaeum-won', 'daon-haneul-lab')
or name like '%(가상조직)%'
or coalesce(email, '') like '%.virtual%';
