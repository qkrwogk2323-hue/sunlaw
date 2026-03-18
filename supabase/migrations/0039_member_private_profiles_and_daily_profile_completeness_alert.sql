create table if not exists public.member_private_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  resident_number_ciphertext text,
  resident_number_masked text,
  address_line1_ciphertext text,
  address_line2_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_private_profiles enable row level security;
alter table public.member_private_profiles force row level security;

drop policy if exists member_private_profiles_select on public.member_private_profiles;
create policy member_private_profiles_select on public.member_private_profiles
  for select using (profile_id = auth.uid());

drop policy if exists member_private_profiles_insert on public.member_private_profiles;
create policy member_private_profiles_insert on public.member_private_profiles
  for insert with check (profile_id = auth.uid());

drop policy if exists member_private_profiles_update on public.member_private_profiles;
create policy member_private_profiles_update on public.member_private_profiles
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop trigger if exists trg_member_private_profiles_updated_at on public.member_private_profiles;
create trigger trg_member_private_profiles_updated_at
before update on public.member_private_profiles
for each row execute function app.set_updated_at();

create index if not exists notifications_profile_missing_daily_idx
  on public.notifications (organization_id, notification_type, entity_id, created_at desc)
  where notification_type = 'member_profile_missing_daily';
