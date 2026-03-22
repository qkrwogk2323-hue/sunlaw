-- 0060: case_hub_organizations multi-role 지원 보정
-- 목적:
-- 0055에서 unique (hub_id, organization_id)로 설계되어 있어
-- 같은 조직이 동일 사건에서 여러 role을 가질 경우 (0009 허용 구조) role 손실 발생.
-- unique를 (hub_id, organization_id, hub_role)로 변경하고 sync 함수 갱신.

-- 1. 기존 단일 unique 제약 제거
alter table public.case_hub_organizations
  drop constraint if exists case_hub_organizations_hub_id_organization_id_key;

-- 2. multi-role 지원 unique 제약 추가
alter table public.case_hub_organizations
  add constraint case_hub_organizations_hub_org_role_uniq
  unique (hub_id, organization_id, hub_role);

-- 3. is_case_hub_org_member: 변경 불필요 (exists 조회라 multi-row에도 정상)

-- 4. sync 함수 재작성 — conflict target을 (hub_id, organization_id, hub_role)로 교체
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

  -- 허브가 비활성이면 모든 bridge row를 unlinked 처리
  if hub_row.lifecycle_status <> 'active' then
    update public.case_hub_organizations
       set status = 'unlinked',
           unlinked_at = coalesce(unlinked_at, now()),
           updated_at  = now()
     where hub_id = target_hub
       and status <> 'unlinked';
    return;
  end if;

  -- case_organizations → case_hub_organizations upsert (role별 1행)
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
  on conflict (hub_id, organization_id, hub_role) do update
    set source_case_organization_id = excluded.source_case_organization_id,
        access_scope  = excluded.access_scope,
        status        = 'active',
        unlinked_at   = null,
        updated_by    = coalesce(excluded.updated_by, case_hub_organizations.updated_by),
        updated_at    = now();

  -- managing_org가 case_organizations에 없으면 bridge에서도 보장
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
  on conflict (hub_id, organization_id, hub_role) do update
    set access_scope  = 'full',
        status        = 'active',
        unlinked_at   = null,
        updated_at    = now();

  -- 더 이상 case_organizations에 없는 조직 row → unlinked 처리
  -- (managing_org row는 case_hubs.organization_id 기준이므로 제외)
  update public.case_hub_organizations cho
     set status      = 'unlinked',
         unlinked_at = coalesce(cho.unlinked_at, now()),
         updated_at  = now()
   where cho.hub_id = target_hub
     and cho.organization_id <> hub_row.organization_id
     and cho.status <> 'unlinked'
     and not exists (
       select 1
       from public.case_organizations co
       where co.case_id  = hub_row.case_id
         and co.organization_id = cho.organization_id
         and co.role     = cho.hub_role
         and co.status   = 'active'
     );
end;
$$;

-- 5. 기존 데이터 re-sync (multi-role이 있을 경우 새 row 추가됨)
do $$
declare
  hub_row record;
begin
  for hub_row in
    select id from public.case_hubs
  loop
    perform app.sync_case_hub_organizations(hub_row.id);
  end loop;
end;
$$;
