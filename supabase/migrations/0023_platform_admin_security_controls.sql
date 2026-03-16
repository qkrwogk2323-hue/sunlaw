create table if not exists public.platform_admin_security_controls (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  access_state text not null default 'suspended' check (access_state in ('active', 'suspended', 'pending_review')),
  platform_mode_enabled boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  last_reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_platform_admin_security_state on public.platform_admin_security_controls (access_state, platform_mode_enabled);

insert into public.platform_admin_security_controls (
  profile_id,
  access_state,
  platform_mode_enabled,
  approved_at,
  approved_by,
  last_reviewed_at,
  review_note
)
select
  p.id,
  'active',
  true,
  now(),
  p.id,
  now(),
  'Bootstrap existing active platform administrator during dedicated security migration'
from public.profiles p
where p.platform_role = 'platform_admin'
  and p.is_active = true
on conflict (profile_id) do nothing;

drop trigger if exists trg_platform_admin_security_updated_at on public.platform_admin_security_controls;
create trigger trg_platform_admin_security_updated_at
before update on public.platform_admin_security_controls
for each row execute procedure app.set_updated_at();

create or replace function app.is_platform_admin_profile(target_profile uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile
      and p.platform_role = 'platform_admin'
      and p.is_active = true
  );
$$;

create or replace function app.has_platform_admin_security_access(target_profile uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admin_security_controls c
    where c.profile_id = target_profile
      and c.access_state = 'active'
      and c.platform_mode_enabled = true
  );
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_platform_admin_profile(auth.uid())
    and app.has_platform_admin_security_access(auth.uid());
$$;

alter table public.platform_admin_security_controls enable row level security;
alter table public.platform_admin_security_controls force row level security;

drop policy if exists platform_admin_security_self_select on public.platform_admin_security_controls;
create policy platform_admin_security_self_select on public.platform_admin_security_controls
for select to authenticated
using (profile_id = auth.uid());

drop trigger if exists audit_platform_admin_security_controls on public.platform_admin_security_controls;
create trigger audit_platform_admin_security_controls
after insert or update or delete on public.platform_admin_security_controls
for each row execute procedure audit.capture_row_change();
