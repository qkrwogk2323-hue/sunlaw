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
