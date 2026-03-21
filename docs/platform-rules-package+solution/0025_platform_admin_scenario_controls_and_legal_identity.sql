-- User/profile/legal-name/platform-admin scenario changes depend on this migration.
-- Apply this migration together when rolling out related user-facing changes.

alter table public.profiles
add column if not exists legal_name text,
add column if not exists legal_name_confirmed_at timestamptz;

create table if not exists public.platform_admin_scenario_controls (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  scenario_mode_enabled boolean not null default false,
  scenario_seed_version text not null default 'v2',
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_admin_scenario_enabled
  on public.platform_admin_scenario_controls (scenario_mode_enabled);

insert into public.platform_admin_scenario_controls (
  profile_id,
  scenario_mode_enabled,
  scenario_seed_version,
  approved_at,
  approved_by,
  review_note
)
select
  c.profile_id,
  true,
  'v2',
  now(),
  c.approved_by,
  'Bootstrap scenario access for existing dedicated platform administrators'
from public.platform_admin_security_controls c
join public.profiles p on p.id = c.profile_id
where p.platform_role = 'platform_admin'
  and p.is_active = true
  and c.access_state = 'active'
  and c.platform_mode_enabled = true
on conflict (profile_id) do nothing;

drop trigger if exists trg_platform_admin_scenario_controls_updated_at on public.platform_admin_scenario_controls;
create trigger trg_platform_admin_scenario_controls_updated_at
before update on public.platform_admin_scenario_controls
for each row execute procedure app.set_updated_at();

create or replace function app.has_platform_admin_scenario_access(target_profile uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admin_scenario_controls c
    where c.profile_id = target_profile
      and c.scenario_mode_enabled = true
  );
$$;

alter table public.platform_admin_scenario_controls enable row level security;
alter table public.platform_admin_scenario_controls force row level security;

drop policy if exists platform_admin_scenario_self_select on public.platform_admin_scenario_controls;
create policy platform_admin_scenario_self_select on public.platform_admin_scenario_controls
for select to authenticated
using (profile_id = auth.uid());

drop trigger if exists audit_platform_admin_scenario_controls on public.platform_admin_scenario_controls;
create trigger audit_platform_admin_scenario_controls
after insert or update or delete on public.platform_admin_scenario_controls
for each row execute procedure audit.capture_row_change();