-- 0056_client_link_lifecycle.sql
-- 의뢰인 연결고리 lifecycle canonicalization
-- - case_clients에 link lifecycle / orphan / relink 규칙 추가
-- - case_hubs에 primary_case_client_id 추가
-- - legacy primary_client_id(profiles.id)와 새 primary_case_client_id(case_clients.id)를 병행 유지

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'case_client_link_status'
  ) then
    create type public.case_client_link_status as enum ('linked', 'pending_unlink', 'unlinked', 'orphan_review');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'case_client_orphan_reason'
  ) then
    create type public.case_client_orphan_reason as enum (
      'profile_detached',
      'hub_detached',
      'case_reassignment',
      'source_deleted',
      'manual_cleanup',
      'migration_review'
    );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'case_client_relink_policy'
  ) then
    create type public.case_client_relink_policy as enum (
      'manual_review',
      'auto_when_profile_returns',
      'auto_when_case_relinked',
      'admin_override_only'
    );
  end if;
end$$;

alter table public.case_clients
  add column if not exists link_status public.case_client_link_status not null default 'linked',
  add column if not exists orphan_reason public.case_client_orphan_reason,
  add column if not exists relink_policy public.case_client_relink_policy not null default 'manual_review',
  add column if not exists detached_at timestamptz,
  add column if not exists orphaned_at timestamptz,
  add column if not exists review_deadline timestamptz,
  add column if not exists last_linked_hub_id uuid references public.case_hubs(id) on delete set null;

comment on column public.case_clients.link_status is 'linked | pending_unlink | unlinked | orphan_review';
comment on column public.case_clients.orphan_reason is '붕 뜬 의뢰인(orphan) 상태가 된 원인';
comment on column public.case_clients.relink_policy is '재연결 허용 정책';
comment on column public.case_clients.last_linked_hub_id is '가장 최근 연결된 허브 reference';

alter table public.case_hubs
  add column if not exists primary_case_client_id uuid;

comment on column public.case_hubs.primary_case_client_id is '허브 카드 대표 의뢰인 (case_clients.id canonical)';
comment on column public.case_hubs.primary_client_id is 'legacy profile pointer. 새 경로는 primary_case_client_id를 우선 사용한다.';

create index if not exists idx_case_clients_case_link_status
  on public.case_clients(case_id, link_status);

create index if not exists idx_case_clients_orphan_review_deadline
  on public.case_clients(review_deadline)
  where link_status = 'orphan_review';

create index if not exists idx_case_clients_last_linked_hub_id
  on public.case_clients(last_linked_hub_id)
  where last_linked_hub_id is not null;

create index if not exists idx_case_hubs_primary_case_client_id
  on public.case_hubs(primary_case_client_id)
  where primary_case_client_id is not null;

update public.case_clients
   set link_status = coalesce(link_status, 'linked'::public.case_client_link_status),
       relink_policy = coalesce(relink_policy, 'manual_review'::public.case_client_relink_policy)
 where link_status is distinct from 'linked'::public.case_client_link_status
    or relink_policy is distinct from coalesce(relink_policy, 'manual_review'::public.case_client_relink_policy);

with hub_match as (
  select distinct on (ch.id)
         ch.id as hub_id,
         cc.id as case_client_id
    from public.case_hubs ch
    join public.case_clients cc
      on cc.case_id = ch.case_id
     and cc.profile_id = ch.primary_client_id
   where ch.primary_client_id is not null
   order by ch.id, cc.created_at asc, cc.id asc
)
update public.case_hubs ch
   set primary_case_client_id = hm.case_client_id
  from hub_match hm
 where ch.id = hm.hub_id
   and ch.primary_case_client_id is null;

update public.case_clients cc
   set last_linked_hub_id = ch.id
  from public.case_hubs ch
 where ch.primary_case_client_id = cc.id
   and cc.last_linked_hub_id is null;

alter table public.case_hubs
  drop constraint if exists case_hubs_primary_case_client_id_fkey;

alter table public.case_hubs
  add constraint case_hubs_primary_case_client_id_fkey
  foreign key (primary_case_client_id)
  references public.case_clients(id)
  on delete set null
  not valid;

create or replace function app.sync_case_hub_primary_case_client()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  matched_case_client_id uuid;
  matched_profile_id uuid;
  matched_case_client record;
begin
  if new.primary_case_client_id is null and new.primary_client_id is not null then
    select cc.id
      into matched_case_client_id
      from public.case_clients cc
     where cc.case_id = new.case_id
       and cc.profile_id = new.primary_client_id
       and cc.link_status in ('linked', 'pending_unlink')
     order by cc.created_at asc, cc.id asc
     limit 1;

    new.primary_case_client_id := matched_case_client_id;
  end if;

  if new.primary_case_client_id is not null then
    select cc.id, cc.case_id, cc.profile_id, cc.link_status
      into matched_case_client
      from public.case_clients cc
     where cc.id = new.primary_case_client_id;

    if matched_case_client.id is null then
      raise exception '대표 의뢰인 연결을 찾을 수 없습니다.';
    end if;

    if matched_case_client.case_id <> new.case_id then
      raise exception '대표 의뢰인은 같은 사건의 case_clients row여야 합니다.';
    end if;

    if matched_case_client.link_status not in ('linked', 'pending_unlink') then
      raise exception '대표 의뢰인은 linked 또는 pending_unlink 상태여야 합니다.';
    end if;

    matched_profile_id := matched_case_client.profile_id;
    if matched_profile_id is not null then
      new.primary_client_id := matched_profile_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function app.handle_case_client_link_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if new.link_status = 'pending_unlink' and old.link_status <> 'pending_unlink' then
    new.detached_at := coalesce(new.detached_at, now());
  end if;

  if new.link_status = 'orphan_review' and old.link_status <> 'orphan_review' then
    new.orphaned_at := coalesce(new.orphaned_at, now());
    new.review_deadline := coalesce(new.review_deadline, now() + interval '7 days');
  end if;

  if new.link_status = 'linked' then
    new.detached_at := null;
    new.orphaned_at := null;
    new.review_deadline := null;
    new.orphan_reason := null;
  end if;

  return new;
end;
$$;

create or replace function app.cleanup_case_hub_client_links()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if new.link_status in ('unlinked', 'orphan_review') then
    update public.case_hubs
       set primary_case_client_id = null,
           primary_client_id = null,
           updated_at = now()
     where primary_case_client_id = new.id;
  elsif new.link_status = 'linked' and new.last_linked_hub_id is not null then
    update public.case_hubs
       set primary_case_client_id = new.id,
           primary_client_id = coalesce(new.profile_id, primary_client_id),
           updated_at = now()
     where id = new.last_linked_hub_id
       and primary_case_client_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_case_hubs_sync_primary_case_client on public.case_hubs;
create trigger trg_case_hubs_sync_primary_case_client
before insert or update of case_id, primary_client_id, primary_case_client_id
on public.case_hubs
for each row
execute function app.sync_case_hub_primary_case_client();

drop trigger if exists trg_case_clients_link_lifecycle on public.case_clients;
create trigger trg_case_clients_link_lifecycle
before update of link_status, orphan_reason, relink_policy, last_linked_hub_id
on public.case_clients
for each row
execute function app.handle_case_client_link_lifecycle();

drop trigger if exists trg_case_clients_cleanup_hub_links on public.case_clients;
create trigger trg_case_clients_cleanup_hub_links
after update of link_status, profile_id, last_linked_hub_id
on public.case_clients
for each row
execute function app.cleanup_case_hub_client_links();
