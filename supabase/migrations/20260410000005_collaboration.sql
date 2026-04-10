-- 005_collaboration.sql
-- Consolidated collaboration, case hubs, invitations, and cross-org features, notifications
-- Based on: 0011, 0036, 0040, 0041, 0049, 0054, 0055

-- ============================================================================
-- NOTIFICATION CHANNEL PREFERENCES
-- ============================================================================

create table if not exists public.notification_channel_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  kakao_enabled boolean not null default true,
  kakao_important_only boolean not null default true,
  allow_case boolean not null default true,
  allow_schedule boolean not null default true,
  allow_client boolean not null default true,
  allow_collaboration boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_channel_preferences enable row level security;
alter table public.notification_channel_preferences force row level security;

drop policy if exists notification_channel_preferences_select on public.notification_channel_preferences;
create policy notification_channel_preferences_select on public.notification_channel_preferences
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists notification_channel_preferences_insert on public.notification_channel_preferences;
create policy notification_channel_preferences_insert on public.notification_channel_preferences
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists notification_channel_preferences_update on public.notification_channel_preferences;
create policy notification_channel_preferences_update on public.notification_channel_preferences
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop trigger if exists trg_notification_channel_preferences_updated_at on public.notification_channel_preferences;
create trigger trg_notification_channel_preferences_updated_at
before update on public.notification_channel_preferences
for each row execute function app.set_updated_at();

-- ============================================================================
-- KAKAO NOTIFICATION OUTBOX
-- ============================================================================

create table if not exists public.kakao_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  failed_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists kakao_notification_outbox_status_idx
  on public.kakao_notification_outbox (status, created_at desc);

create or replace function app.enqueue_kakao_notification_for_eligible()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pref record;
  has_kakao_identity boolean := false;
  entity text := coalesce(new.entity_type, new.action_entity_type, 'collaboration');
begin
  if coalesce(new.recipient_profile_id, null) is null then
    return new;
  end if;

  select exists (
    select 1
    from auth.identities i
    where i.user_id = new.recipient_profile_id
      and i.provider = 'kakao'
  ) into has_kakao_identity;

  if not has_kakao_identity then
    return new;
  end if;

  select *
  into pref
  from public.notification_channel_preferences p
  where p.profile_id = new.recipient_profile_id;

  if pref is null then
    insert into public.notification_channel_preferences (profile_id)
    values (new.recipient_profile_id)
    on conflict (profile_id) do nothing;

    select *
    into pref
    from public.notification_channel_preferences p
    where p.profile_id = new.recipient_profile_id;
  end if;

  if coalesce(pref.kakao_enabled, false) = false then
    return new;
  end if;

  if coalesce(pref.kakao_important_only, true) = true and coalesce(new.priority, 'normal') <> 'urgent' then
    return new;
  end if;

  if entity = 'case' and coalesce(pref.allow_case, true) = false then
    return new;
  end if;
  if entity = 'schedule' and coalesce(pref.allow_schedule, true) = false then
    return new;
  end if;
  if entity = 'client' and coalesce(pref.allow_client, true) = false then
    return new;
  end if;
  if entity = 'collaboration' and coalesce(pref.allow_collaboration, true) = false then
    return new;
  end if;

  insert into public.kakao_notification_outbox (
    notification_id,
    recipient_profile_id,
    payload,
    status
  ) values (
    new.id,
    new.recipient_profile_id,
    jsonb_build_object(
      'title', new.title,
      'body', new.body,
      'destination_url', coalesce(new.destination_url, new.action_href, '/notifications'),
      'priority', coalesce(new.priority, 'normal')
    ),
    'pending'
  );

  return new;
end;
$$;

drop trigger if exists trg_notifications_enqueue_kakao_outbox on public.notifications;
create trigger trg_notifications_enqueue_kakao_outbox
after insert on public.notifications
for each row execute function app.enqueue_kakao_notification_for_eligible();

-- ============================================================================
-- INVITATIONS REWORK
-- ============================================================================

alter table public.invitations
  add column if not exists case_client_id uuid references public.case_clients(id) on delete set null,
  add column if not exists invited_name text,
  add column if not exists actor_category text,
  add column if not exists role_template_key text,
  add column if not exists case_scope_policy text,
  add column if not exists permissions_override jsonb not null default '{}'::jsonb,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_invitations_status_expires on public.invitations (status, expires_at);
create index if not exists idx_invitations_case_client on public.invitations (case_client_id, status);

alter table public.invitations
  drop constraint if exists invitations_staff_fields_check;

alter table public.invitations
  add constraint invitations_staff_fields_check
  check (
    (kind = 'staff_invite' and requested_role is not null and case_id is null)
    or
    (kind = 'client_invite' and case_id is not null)
  );

alter table public.invitations enable row level security;
alter table public.invitations force row level security;

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
);

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
for insert to authenticated
with check (
  app.is_platform_admin() or app.is_org_manager(organization_id)
);

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
for update to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
);

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at
before update on public.invitations
for each row execute procedure app.set_updated_at();

-- ============================================================================
-- ORGANIZATION COLLABORATION FOUNDATION
-- ============================================================================

do $$ begin
  create type public.collaboration_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

create table if not exists public.organization_collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  approved_hub_id uuid,
  title text not null,
  proposal_note text,
  response_note text,
  status public.collaboration_request_status not null default 'pending',
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_collaboration_requests_source_target_check check (source_organization_id <> target_organization_id)
);

create table if not exists public.organization_collaboration_hubs (
  id uuid primary key default gen_random_uuid(),
  primary_organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.organization_collaboration_requests(id) on delete set null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_collaboration_hubs_org_pair_check check (primary_organization_id <> partner_organization_id),
  constraint organization_collaboration_hubs_status_check check (status in ('active', 'archived'))
);

alter table public.organization_collaboration_requests
  drop constraint if exists organization_collaboration_requests_approved_hub_id_fkey;

alter table public.organization_collaboration_requests
  add constraint organization_collaboration_requests_approved_hub_id_fkey
  foreign key (approved_hub_id) references public.organization_collaboration_hubs(id) on delete set null not valid;

create table if not exists public.organization_collaboration_messages (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_collaboration_messages_body_check check (char_length(trim(body)) > 0)
);

create table if not exists public.organization_collaboration_reads (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, profile_id)
);

create table if not exists public.organization_collaboration_case_shares (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.organization_collaboration_hubs(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  shared_by_organization_id uuid not null references public.organizations(id) on delete cascade,
  shared_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_scope text not null default 'view',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, case_id),
  constraint organization_collaboration_case_shares_permission_scope_check check (permission_scope in ('view', 'reference', 'collaborate'))
);

-- ============================================================================
-- COLLABORATION INDEXES
-- ============================================================================

create unique index if not exists uq_org_collaboration_requests_pending_pair
  on public.organization_collaboration_requests (source_organization_id, target_organization_id)
  where status = 'pending';

create unique index if not exists uq_org_collaboration_hubs_active_pair
  on public.organization_collaboration_hubs (
    (least(primary_organization_id, partner_organization_id)),
    (greatest(primary_organization_id, partner_organization_id))
  )
  where status = 'active';

create index if not exists idx_org_collaboration_requests_source_status
  on public.organization_collaboration_requests (source_organization_id, status, created_at desc);

create index if not exists idx_org_collaboration_requests_target_status
  on public.organization_collaboration_requests (target_organization_id, status, created_at desc);

create index if not exists idx_org_collaboration_hubs_primary_status
  on public.organization_collaboration_hubs (primary_organization_id, status, updated_at desc);

create index if not exists idx_org_collaboration_hubs_partner_status
  on public.organization_collaboration_hubs (partner_organization_id, status, updated_at desc);

create index if not exists idx_org_collaboration_messages_hub_created_at
  on public.organization_collaboration_messages (hub_id, created_at desc);

create index if not exists idx_org_collaboration_messages_org_created_at
  on public.organization_collaboration_messages (organization_id, created_at desc);

create index if not exists idx_org_collaboration_reads_hub_profile
  on public.organization_collaboration_reads (hub_id, profile_id, last_read_at desc);

create index if not exists idx_org_collaboration_case_shares_hub_created_at
  on public.organization_collaboration_case_shares (hub_id, created_at desc);

-- ============================================================================
-- COLLABORATION RLS
-- ============================================================================

alter table public.organization_collaboration_requests enable row level security;
alter table public.organization_collaboration_requests force row level security;
alter table public.organization_collaboration_hubs enable row level security;
alter table public.organization_collaboration_hubs force row level security;
alter table public.organization_collaboration_messages enable row level security;
alter table public.organization_collaboration_messages force row level security;
alter table public.organization_collaboration_reads enable row level security;
alter table public.organization_collaboration_reads force row level security;
alter table public.organization_collaboration_case_shares enable row level security;
alter table public.organization_collaboration_case_shares force row level security;

drop policy if exists organization_collaboration_requests_select on public.organization_collaboration_requests;
create policy organization_collaboration_requests_select on public.organization_collaboration_requests
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(source_organization_id)
  or app.is_org_member(target_organization_id)
);

drop policy if exists organization_collaboration_requests_insert on public.organization_collaboration_requests;
create policy organization_collaboration_requests_insert on public.organization_collaboration_requests
for insert to authenticated
with check (
  requested_by_profile_id = auth.uid()
  and app.is_org_manager(source_organization_id)
);

drop policy if exists organization_collaboration_requests_update on public.organization_collaboration_requests;
create policy organization_collaboration_requests_update on public.organization_collaboration_requests
for update to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(source_organization_id)
  or app.is_org_manager(target_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(source_organization_id)
  or app.is_org_manager(target_organization_id)
);

drop policy if exists organization_collaboration_hubs_select on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_select on public.organization_collaboration_hubs
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(primary_organization_id)
  or app.is_org_member(partner_organization_id)
);

drop policy if exists organization_collaboration_hubs_write on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_write on public.organization_collaboration_hubs
for all to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(primary_organization_id)
  or app.is_org_manager(partner_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(primary_organization_id)
  or app.is_org_manager(partner_organization_id)
);

drop policy if exists organization_collaboration_messages_select on public.organization_collaboration_messages;
create policy organization_collaboration_messages_select on public.organization_collaboration_messages
for select to authenticated
using (
  app.is_platform_admin()
  or exists (
    select 1
    from public.organization_collaboration_hubs hubs
    where hubs.id = hub_id
      and (
        app.is_org_member(hubs.primary_organization_id)
        or app.is_org_member(hubs.partner_organization_id)
      )
  )
);

drop policy if exists organization_collaboration_messages_insert on public.organization_collaboration_messages;
create policy organization_collaboration_messages_insert on public.organization_collaboration_messages
for insert to authenticated
with check (
  sender_profile_id = auth.uid()
  and app.is_org_member(organization_id)
  and exists (
    select 1
    from public.organization_collaboration_hubs hubs
    where hubs.id = hub_id
      and (
        hubs.primary_organization_id = organization_id
        or hubs.partner_organization_id = organization_id
      )
  )
);

drop policy if exists organization_collaboration_reads_select on public.organization_collaboration_reads;
create policy organization_collaboration_reads_select on public.organization_collaboration_reads
for select to authenticated
using (
  app.is_platform_admin()
  or profile_id = auth.uid()
  or app.is_org_member(organization_id)
);

drop policy if exists organization_collaboration_reads_write on public.organization_collaboration_reads;
create policy organization_collaboration_reads_write on public.organization_collaboration_reads
for all to authenticated
using (
  app.is_platform_admin()
  or profile_id = auth.uid()
)
with check (
  app.is_platform_admin()
  or profile_id = auth.uid()
);

drop policy if exists organization_collaboration_case_shares_select on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_select on public.organization_collaboration_case_shares
for select to authenticated
using (
  app.is_platform_admin()
  or exists (
    select 1
    from public.organization_collaboration_hubs hubs
    where hubs.id = hub_id
      and (
        app.is_org_member(hubs.primary_organization_id)
        or app.is_org_member(hubs.partner_organization_id)
      )
  )
);

drop policy if exists organization_collaboration_case_shares_write on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_write on public.organization_collaboration_case_shares
for all to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(shared_by_organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_member(shared_by_organization_id)
);

-- ============================================================================
-- COLLABORATION TRIGGERS
-- ============================================================================

drop trigger if exists trg_org_collaboration_requests_updated_at on public.organization_collaboration_requests;
create trigger trg_org_collaboration_requests_updated_at
before update on public.organization_collaboration_requests
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_org_collaboration_hubs_updated_at on public.organization_collaboration_hubs;
create trigger trg_org_collaboration_hubs_updated_at
before update on public.organization_collaboration_hubs
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_org_collaboration_reads_updated_at on public.organization_collaboration_reads;
create trigger trg_org_collaboration_reads_updated_at
before update on public.organization_collaboration_reads
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_org_collaboration_case_shares_updated_at on public.organization_collaboration_case_shares;
create trigger trg_org_collaboration_case_shares_updated_at
before update on public.organization_collaboration_case_shares
for each row execute procedure app.set_updated_at();

-- ============================================================================
-- CASE HUBS FOUNDATION
-- ============================================================================

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

comment on table  public.case_hubs                  is 'Event-centered collaboration hub (1 hub per case)';
comment on column public.case_hubs.primary_client_id is 'Hub card primary client (profiles.id)';
comment on column public.case_hubs.collaborator_limit is 'Collaboration member cap';
comment on column public.case_hubs.viewer_limit       is 'Viewer member cap';
comment on column public.case_hubs.lifecycle_status   is 'active | soft_deleted';

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

comment on table  public.case_hub_members               is 'Event hub participant seat';
comment on column public.case_hub_members.seat_kind      is 'collaborator(collaboration) | viewer(reading)';
comment on column public.case_hub_members.membership_role is 'owner | admin | member | viewer';

create table if not exists public.case_hub_activity (
  id                uuid        not null default gen_random_uuid() primary key,
  hub_id            uuid        not null references public.case_hubs(id) on delete cascade,
  actor_profile_id  uuid                 references public.profiles(id) on delete set null,
  action            text        not null,
  payload           jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.case_hub_activity is 'Event hub activity feed';

do $$ begin
  create type public.case_hub_organization_status as enum ('active', 'pending', 'unlinked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.case_hub_organizations (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.case_hubs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_case_organization_id uuid references public.case_organizations(id) on delete set null,
  hub_role public.case_organization_role not null,
  access_scope public.case_access_scope not null default 'read_only',
  status public.case_hub_organization_status not null default 'active',
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hub_id, organization_id)
);

comment on table public.case_hub_organizations is 'Canonical bridge between event hub and participating organizations';
comment on column public.case_hubs.organization_id is 'Legacy managing organization reference. Canonical org links live in case_hub_organizations.';
comment on column public.case_hub_organizations.source_case_organization_id is 'case_organizations canonical origin row';
comment on column public.case_hub_organizations.hub_role is 'Hub-based organization role (inherits case_organizations.role)';
comment on column public.case_hub_organizations.access_scope is 'Hub-based organization access scope (inherits case_organizations.access_scope)';
comment on column public.case_hub_organizations.status is 'active | pending | unlinked';

-- ============================================================================
-- CASE HUBS INDEXES
-- ============================================================================

create index if not exists idx_case_hubs_organization_id  on public.case_hubs(organization_id);
create index if not exists idx_case_hubs_case_id          on public.case_hubs(case_id);
create index if not exists idx_case_hubs_lifecycle        on public.case_hubs(lifecycle_status);
create index if not exists idx_case_hub_members_hub_id    on public.case_hub_members(hub_id);
create index if not exists idx_case_hub_members_profile   on public.case_hub_members(profile_id);
create index if not exists idx_case_hub_activity_hub_id   on public.case_hub_activity(hub_id);
create index if not exists idx_case_hub_activity_created  on public.case_hub_activity(created_at desc);
create index if not exists idx_case_hub_organizations_hub on public.case_hub_organizations (hub_id, status);
create index if not exists idx_case_hub_organizations_org on public.case_hub_organizations (organization_id, status);
create index if not exists idx_case_hub_organizations_case_org on public.case_hub_organizations (source_case_organization_id);

-- ============================================================================
-- CASE HUBS RLS
-- ============================================================================

alter table public.case_hubs         enable row level security;
alter table public.case_hub_members  enable row level security;
alter table public.case_hub_activity enable row level security;
alter table public.case_hub_organizations enable row level security;
alter table public.case_hub_organizations force row level security;

-- case_hubs: organization members read, service_role all
drop policy if exists "case_hubs_org_member_select" on public.case_hubs;
create policy "case_hubs_org_member_select"
  on public.case_hubs for select
  using (
    exists (
      select 1 from public.organization_memberships om
      where om.organization_id = case_hubs.organization_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
    )
  );

drop policy if exists "case_hubs_service_role_all" on public.case_hubs;
create policy "case_hubs_service_role_all"
  on public.case_hubs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- case_hub_members: organization members read, service_role all
drop policy if exists "case_hub_members_org_select" on public.case_hub_members;
create policy "case_hub_members_org_select"
  on public.case_hub_members for select
  using (
    exists (
      select 1 from public.case_hubs ch
      join public.organization_memberships om on om.organization_id = ch.organization_id
      where ch.id = case_hub_members.hub_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
    )
  );

drop policy if exists "case_hub_members_service_role_all" on public.case_hub_members;
create policy "case_hub_members_service_role_all"
  on public.case_hub_members for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- case_hub_activity: organization members read, service_role all
drop policy if exists "case_hub_activity_org_select" on public.case_hub_activity;
create policy "case_hub_activity_org_select"
  on public.case_hub_activity for select
  using (
    exists (
      select 1 from public.case_hubs ch
      join public.organization_memberships om on om.organization_id = ch.organization_id
      where ch.id = case_hub_activity.hub_id
        and om.profile_id = auth.uid()
        and om.status = 'active'
    )
  );

drop policy if exists "case_hub_activity_service_role_all" on public.case_hub_activity;
create policy "case_hub_activity_service_role_all"
  on public.case_hub_activity for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists case_hub_organizations_select on public.case_hub_organizations;
create policy case_hub_organizations_select
on public.case_hub_organizations
for select
to authenticated
using (
  app.is_platform_admin()
  or app.is_case_hub_org_member(hub_id)
);

drop policy if exists case_hub_organizations_service_role_all on public.case_hub_organizations;
create policy case_hub_organizations_service_role_all
on public.case_hub_organizations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- ============================================================================
-- CASE HUBS TRIGGERS & FUNCTIONS
-- ============================================================================

create or replace function app.is_case_hub_org_member(target_hub uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_hub_organizations cho
    join public.organization_memberships om
      on om.organization_id = cho.organization_id
     and om.profile_id = auth.uid()
     and om.status = 'active'
    where cho.hub_id = target_hub
      and cho.status = 'active'
  );
$$;

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

  if hub_row.lifecycle_status <> 'active' then
    update public.case_hub_organizations
       set status = 'unlinked',
           unlinked_at = coalesce(unlinked_at, now()),
           updated_at = now()
     where hub_id = target_hub
       and status <> 'unlinked';
    return;
  end if;

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
  on conflict (hub_id, organization_id) do update
    set source_case_organization_id = excluded.source_case_organization_id,
        hub_role = excluded.hub_role,
        access_scope = excluded.access_scope,
        status = 'active',
        unlinked_at = null,
        updated_by = coalesce(excluded.updated_by, public.case_hub_organizations.updated_by),
        updated_at = now();

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
  on conflict (hub_id, organization_id) do update
    set hub_role = 'managing_org',
        access_scope = 'full',
        status = 'active',
        unlinked_at = null,
        updated_at = now();

  update public.case_hub_organizations cho
     set status = 'unlinked',
         unlinked_at = coalesce(cho.unlinked_at, now()),
         updated_at = now()
   where cho.hub_id = target_hub
     and cho.organization_id <> hub_row.organization_id
     and cho.status <> 'unlinked'
     and not exists (
       select 1
       from public.case_organizations co
       where co.case_id = hub_row.case_id
         and co.organization_id = cho.organization_id
         and co.status = 'active'
     );
end;
$$;

create or replace function app.sync_case_hub_organizations_for_case(target_case uuid)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
declare
  hub_item record;
begin
  for hub_item in
    select id
    from public.case_hubs
    where case_id = target_case
  loop
    perform app.sync_case_hub_organizations(hub_item.id);
  end loop;
end;
$$;

create or replace function app.case_hub_sync_from_case_organizations()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
declare
  affected_case uuid;
begin
  affected_case := coalesce(new.case_id, old.case_id);
  if affected_case is not null then
    perform app.sync_case_hub_organizations_for_case(affected_case);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function app.case_hub_sync_from_hubs()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  perform app.sync_case_hub_organizations(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_case_hubs_updated_at on public.case_hubs;
create trigger trg_case_hubs_updated_at
before update on public.case_hubs
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_hub_members_updated_at on public.case_hub_members;
create trigger trg_case_hub_members_updated_at
before update on public.case_hub_members
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_hub_organizations_updated_at on public.case_hub_organizations;
create trigger trg_case_hub_organizations_updated_at
before update on public.case_hub_organizations
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_case_hub_sync_from_hubs on public.case_hubs;
create trigger trg_case_hub_sync_from_hubs
after insert or update of case_id, organization_id, lifecycle_status on public.case_hubs
for each row execute procedure app.case_hub_sync_from_hubs();

drop trigger if exists trg_case_hub_sync_from_case_organizations on public.case_organizations;
create trigger trg_case_hub_sync_from_case_organizations
after insert or update of organization_id, role, status, access_scope, case_id or delete on public.case_organizations
for each row execute procedure app.case_hub_sync_from_case_organizations();

drop trigger if exists audit_case_hub_organizations on public.case_hub_organizations;
create trigger audit_case_hub_organizations
after insert or update or delete on public.case_hub_organizations
for each row execute procedure audit.capture_row_change();

-- ============================================================================
-- CASE HUBS AUDIT TRIGGERS
-- ============================================================================

drop trigger if exists audit_case_hubs on public.case_hubs;
create trigger audit_case_hubs
after insert or update or delete on public.case_hubs
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_hub_members on public.case_hub_members;
create trigger audit_case_hub_members
after insert or update or delete on public.case_hub_members
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_hub_activity on public.case_hub_activity;
create trigger audit_case_hub_activity
after insert or update or delete on public.case_hub_activity
for each row execute procedure audit.capture_row_change();

-- ============================================================================
-- COLLABORATION AUDIT TRIGGERS
-- ============================================================================

drop trigger if exists audit_organization_collaboration_requests on public.organization_collaboration_requests;
create trigger audit_organization_collaboration_requests
after insert or update or delete on public.organization_collaboration_requests
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_collaboration_hubs on public.organization_collaboration_hubs;
create trigger audit_organization_collaboration_hubs
after insert or update or delete on public.organization_collaboration_hubs
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_collaboration_messages on public.organization_collaboration_messages;
create trigger audit_organization_collaboration_messages
after insert or update or delete on public.organization_collaboration_messages
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_collaboration_reads on public.organization_collaboration_reads;
create trigger audit_organization_collaboration_reads
after insert or update or delete on public.organization_collaboration_reads
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_collaboration_case_shares on public.organization_collaboration_case_shares;
create trigger audit_organization_collaboration_case_shares
after insert or update or delete on public.organization_collaboration_case_shares
for each row execute procedure audit.capture_row_change();

-- ============================================================================
-- INITIAL CASE HUB ORGANIZATION SYNC
-- ============================================================================

do $$
declare
  hub_row record;
begin
  for hub_row in
    select id
    from public.case_hubs
  loop
    perform app.sync_case_hub_organizations(hub_row.id);
  end loop;
end;
$$;
