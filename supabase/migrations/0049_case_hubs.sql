-- 사건허브: 사건 중심 협업 로비
-- 사건 1개당 허브 1개 원칙 (case_id UNIQUE)

-- ────────────────────────────────────────────────────────────────────
-- case_hubs: 허브 메타 테이블
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.case_hubs (
  id                  uuid        not null default gen_random_uuid() primary key,
  organization_id     uuid        not null references public.organizations(id)  on delete cascade,
  case_id             uuid        not null references public.cases(id)          on delete cascade,
  primary_client_id   uuid                 references public.profiles(id)       on delete set null,
  title               text,
  status              text        not null default 'draft'
                        check (status in ('draft','setup_required','ready','active','review_pending','archived')),
  collaborator_limit  integer     not null default 5  check (collaborator_limit > 0),
  viewer_limit        integer     not null default 12 check (viewer_limit > 0),
  visibility_scope    text        not null default 'organization'
                        check (visibility_scope in ('organization','private','custom')),
  created_by          uuid                 references public.profiles(id) on delete set null,
  lifecycle_status    text        not null default 'active'
                        check (lifecycle_status in ('active','soft_deleted')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (case_id)
);

comment on table  public.case_hubs                  is '사건 중심 협업 허브 (사건당 1개)';
comment on column public.case_hubs.primary_client_id is '허브 카드 대표 의뢰인 (profiles.id)';
comment on column public.case_hubs.collaborator_limit is '협업 인원 상한';
comment on column public.case_hubs.viewer_limit       is '열람 인원 상한';
comment on column public.case_hubs.lifecycle_status   is 'active | soft_deleted';

-- ────────────────────────────────────────────────────────────────────
-- case_hub_members: 허브 참여자 좌석
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.case_hub_members (
  id              uuid        not null default gen_random_uuid() primary key,
  hub_id          uuid        not null references public.case_hubs(id) on delete cascade,
  profile_id      uuid        not null references public.profiles(id)  on delete cascade,
  membership_role text        not null default 'member'
                    check (membership_role in ('owner','admin','member','viewer')),
  access_level    text        not null default 'view'
                    check (access_level in ('full','edit','view')),
  seat_kind       text        not null default 'viewer'
                    check (seat_kind in ('collaborator','viewer')),
  is_ready        boolean     not null default false,
  joined_at       timestamptz not null default now(),
  last_seen_at    timestamptz,
  last_read_at    timestamptz,
  unique (hub_id, profile_id)
);

comment on table  public.case_hub_members               is '사건허브 참여자 좌석';
comment on column public.case_hub_members.seat_kind      is 'collaborator(협업) | viewer(열람)';
comment on column public.case_hub_members.membership_role is 'owner | admin | member | viewer';

-- ────────────────────────────────────────────────────────────────────
-- case_hub_activity: 허브 활동 피드
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.case_hub_activity (
  id                uuid        not null default gen_random_uuid() primary key,
  hub_id            uuid        not null references public.case_hubs(id) on delete cascade,
  actor_profile_id  uuid                 references public.profiles(id) on delete set null,
  action            text        not null,
  payload           jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.case_hub_activity is '사건허브 활동 피드';

-- ────────────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────────────
create index if not exists idx_case_hubs_organization_id  on public.case_hubs(organization_id);
create index if not exists idx_case_hubs_case_id          on public.case_hubs(case_id);
create index if not exists idx_case_hubs_lifecycle        on public.case_hubs(lifecycle_status);
create index if not exists idx_case_hub_members_hub_id    on public.case_hub_members(hub_id);
create index if not exists idx_case_hub_members_profile   on public.case_hub_members(profile_id);
create index if not exists idx_case_hub_activity_hub_id   on public.case_hub_activity(hub_id);
create index if not exists idx_case_hub_activity_created  on public.case_hub_activity(created_at desc);

-- ────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────
alter table public.case_hubs         enable row level security;
alter table public.case_hub_members  enable row level security;
alter table public.case_hub_activity enable row level security;

-- case_hubs: 조직 구성원 읽기, service_role 전체
create policy "case_hubs_org_member_select"
  on public.case_hubs for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = case_hubs.organization_id
        and om.profile_id = auth.uid()
    )
  );

create policy "case_hubs_service_role_all"
  on public.case_hubs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- case_hub_members: 조직 구성원 읽기, service_role 전체
create policy "case_hub_members_org_select"
  on public.case_hub_members for select
  using (
    exists (
      select 1 from public.case_hubs ch
      join public.organization_members om on om.organization_id = ch.organization_id
      where ch.id = case_hub_members.hub_id
        and om.profile_id = auth.uid()
    )
  );

create policy "case_hub_members_service_role_all"
  on public.case_hub_members for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- case_hub_activity: 조직 구성원 읽기, service_role 전체
create policy "case_hub_activity_org_select"
  on public.case_hub_activity for select
  using (
    exists (
      select 1 from public.case_hubs ch
      join public.organization_members om on om.organization_id = ch.organization_id
      where ch.id = case_hub_activity.hub_id
        and om.profile_id = auth.uid()
    )
  );

create policy "case_hub_activity_service_role_all"
  on public.case_hub_activity for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
