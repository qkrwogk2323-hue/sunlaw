-- Migration 0083: 조직 업무 항목 (organization_work_items)
-- 조직소통 대화방에서 메시지와 분리된 업무 도메인 모델
-- 할 일(task), 요청사항(request), 지시(instruction)를 대화 흐름과 연결

-- ============================================================
-- 1. organization_work_items
-- ============================================================
create table if not exists public.organization_work_items (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  item_type           text not null check (item_type in ('message', 'task', 'request', 'instruction')),
  title               text,
  body                text not null,
  status              text not null default 'open' check (status in ('open', 'in_progress', 'done', 'canceled')),
  priority            text not null default 'normal' check (priority in ('urgent', 'normal', 'low')),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  created_by          uuid not null references public.profiles(id) on delete cascade,
  completed_by        uuid references public.profiles(id) on delete set null,
  completed_at        timestamptz,
  due_at              timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 색인: 조직 단위 최신순 조회
create index if not exists idx_org_work_items_org_created
  on public.organization_work_items (organization_id, created_at desc);

-- 색인: 상태별 필터
create index if not exists idx_org_work_items_status
  on public.organization_work_items (organization_id, status);

-- ============================================================
-- 2. organization_work_item_links  (태그형 연결: 사건 / 의뢰인 / 허브)
-- ============================================================
create table if not exists public.organization_work_item_links (
  id            uuid primary key default gen_random_uuid(),
  work_item_id  uuid not null references public.organization_work_items(id) on delete cascade,
  link_type     text not null check (link_type in ('case', 'client', 'hub')),
  target_id     uuid not null,
  display_label text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_org_work_item_links_item
  on public.organization_work_item_links (work_item_id);

create index if not exists idx_org_work_item_links_target
  on public.organization_work_item_links (link_type, target_id);

-- ============================================================
-- 3. organization_work_item_events  (상태변경 + 감사로그)
-- ============================================================
create table if not exists public.organization_work_item_events (
  id            uuid primary key default gen_random_uuid(),
  work_item_id  uuid not null references public.organization_work_items(id) on delete cascade,
  event_type    text not null check (event_type in (
    'created', 'assigned', 'checked', 'unchecked',
    'reopened', 'canceled', 'deleted', 'commented',
    'link_added', 'link_removed'
  )),
  actor_id      uuid references public.profiles(id) on delete set null,
  summary       text,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_org_work_item_events_item
  on public.organization_work_item_events (work_item_id, created_at desc);

-- ============================================================
-- 4. updated_at 자동 갱신 트리거
-- ============================================================
create or replace function public.touch_organization_work_items_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_org_work_items_updated_at on public.organization_work_items;
create trigger trg_org_work_items_updated_at
  before update on public.organization_work_items
  for each row execute function public.touch_organization_work_items_updated_at();

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.organization_work_items       enable row level security;
alter table public.organization_work_item_links  enable row level security;
alter table public.organization_work_item_events enable row level security;

-- organization_work_items: 같은 조직 멤버만 조회/생성/수정 가능
create policy "org_work_items_select"
  on public.organization_work_items for select
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid()
        and status = 'active'
    )
  );

create policy "org_work_items_insert"
  on public.organization_work_items for insert
  with check (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid()
        and status = 'active'
    )
    and created_by = auth.uid()
  );

create policy "org_work_items_update"
  on public.organization_work_items for update
  using (
    organization_id in (
      select organization_id
      from public.organization_memberships
      where profile_id = auth.uid()
        and status = 'active'
    )
  );

-- 삭제는 서버 측 admin client만 허용 (soft-delete 대신 status='canceled' 사용)
create policy "org_work_items_delete"
  on public.organization_work_items for delete
  using (false);

-- organization_work_item_links: work_item 소유 조직 멤버만 접근
create policy "org_work_item_links_select"
  on public.organization_work_item_links for select
  using (
    work_item_id in (
      select id from public.organization_work_items
      where organization_id in (
        select organization_id
        from public.organization_memberships
        where profile_id = auth.uid() and status = 'active'
      )
    )
  );

create policy "org_work_item_links_insert"
  on public.organization_work_item_links for insert
  with check (
    work_item_id in (
      select id from public.organization_work_items
      where organization_id in (
        select organization_id
        from public.organization_memberships
        where profile_id = auth.uid() and status = 'active'
      )
    )
  );

create policy "org_work_item_links_delete"
  on public.organization_work_item_links for delete
  using (false);

-- organization_work_item_events: 같은 조직 멤버만 조회, insert는 서버 측만
create policy "org_work_item_events_select"
  on public.organization_work_item_events for select
  using (
    work_item_id in (
      select id from public.organization_work_items
      where organization_id in (
        select organization_id
        from public.organization_memberships
        where profile_id = auth.uid() and status = 'active'
      )
    )
  );

create policy "org_work_item_events_insert"
  on public.organization_work_item_events for insert
  with check (
    work_item_id in (
      select id from public.organization_work_items
      where organization_id in (
        select organization_id
        from public.organization_memberships
        where profile_id = auth.uid() and status = 'active'
      )
    )
  );
