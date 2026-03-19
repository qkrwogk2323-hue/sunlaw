-- 0029: notification status/destination canonical model

alter table public.notifications
  add column if not exists notification_type text not null default 'generic',
  add column if not exists entity_type text not null default 'collaboration',
  add column if not exists entity_id text,
  add column if not exists priority text not null default 'normal',
  add column if not exists status text not null default 'active',
  add column if not exists destination_type text not null default 'internal_route',
  add column if not exists destination_url text not null default '/dashboard',
  add column if not exists destination_params jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- compatibility backfill from legacy columns
update public.notifications
set
  notification_type = coalesce(nullif(notification_type, ''), kind::text),
  entity_type = case
    when action_entity_type in ('case', 'case_document') then 'case'
    when action_entity_type = 'schedule' or kind = 'schedule_due' then 'schedule'
    when action_entity_type = 'client' then 'client'
    else 'collaboration'
  end,
  entity_id = coalesce(entity_id, action_target_id::text, case_id::text),
  priority = case
    when priority in ('urgent', 'normal', 'low') then priority
    when requires_action = true then 'urgent'
    else 'normal'
  end,
  status = case
    when status in ('active', 'read', 'resolved', 'archived', 'deleted') then status
    when deleted_at is not null then 'deleted'
    when trashed_at is not null then 'archived'
    when resolved_at is not null then 'resolved'
    when read_at is not null then 'read'
    else 'active'
  end,
  destination_type = coalesce(nullif(destination_type, ''), 'internal_route'),
  destination_url = coalesce(
    nullif(destination_url, ''),
    nullif(action_href, ''),
    case when case_id is not null then '/cases/' || case_id::text else '/dashboard' end
  ),
  destination_params = coalesce(destination_params, '{}'::jsonb)
where true;

alter table public.notifications
  drop constraint if exists notifications_entity_type_check,
  add constraint notifications_entity_type_check check (entity_type in ('case', 'schedule', 'client', 'collaboration')),
  drop constraint if exists notifications_priority_check,
  add constraint notifications_priority_check check (priority in ('urgent', 'normal', 'low')),
  drop constraint if exists notifications_status_check,
  add constraint notifications_status_check check (status in ('active', 'read', 'resolved', 'archived', 'deleted'));

create or replace function app.sync_notification_model()
returns trigger
language plpgsql
as $$
begin
  -- derive canonical fields from legacy fields when missing
  if new.notification_type is null or btrim(new.notification_type) = '' then
    new.notification_type := coalesce(new.kind::text, 'generic');
  end if;

  if new.entity_type is null or btrim(new.entity_type) = '' then
    new.entity_type := case
      when new.action_entity_type in ('case', 'case_document') then 'case'
      when new.action_entity_type = 'schedule' or new.kind = 'schedule_due' then 'schedule'
      when new.action_entity_type = 'client' then 'client'
      else 'collaboration'
    end;
  end if;

  if new.entity_id is null then
    new.entity_id := coalesce(new.action_target_id::text, new.case_id::text);
  end if;

  if new.priority is null or btrim(new.priority) = '' then
    new.priority := case when new.requires_action = true then 'urgent' else 'normal' end;
  end if;

  if new.destination_type is null or btrim(new.destination_type) = '' then
    new.destination_type := 'internal_route';
  end if;

  if new.destination_url is null or btrim(new.destination_url) = '' then
    new.destination_url := coalesce(new.action_href, case when new.case_id is not null then '/cases/' || new.case_id::text else '/dashboard' end);
  end if;

  if new.destination_params is null then
    new.destination_params := '{}'::jsonb;
  end if;

  if tg_op = 'INSERT' then
    if new.status is null or btrim(new.status) = '' then
      if new.deleted_at is not null then
        new.status := 'deleted';
      elsif new.trashed_at is not null then
        new.status := 'archived';
      elsif new.resolved_at is not null then
        new.status := 'resolved';
      elsif new.read_at is not null then
        new.status := 'read';
      else
        new.status := 'active';
      end if;
    end if;
  else
    -- allowed transitions only
    if old.status <> new.status then
      if not (
        (old.status = 'active' and new.status in ('read', 'resolved')) or
        (old.status = 'read' and new.status = 'resolved') or
        (old.status = 'resolved' and new.status = 'archived') or
        (old.status = 'archived' and new.status = 'deleted')
      ) then
        raise exception 'invalid notification status transition: % -> %', old.status, new.status;
      end if;
    end if;
  end if;

  -- synchronize legacy timestamps
  if new.status = 'read' and new.read_at is null then
    new.read_at := now();
  end if;

  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  end if;

  if new.status = 'archived' then
    if new.trashed_at is null then
      new.trashed_at := now();
    end if;
    if new.archived_at is null then
      new.archived_at := now();
    end if;
  end if;

  if new.status = 'deleted' and new.deleted_at is null then
    new.deleted_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notifications_sync_model on public.notifications;
create trigger trg_notifications_sync_model
before insert or update on public.notifications
for each row execute function app.sync_notification_model();

create index if not exists notifications_queue_status_priority_idx
  on public.notifications (recipient_profile_id, status, priority, created_at desc)
  where status in ('active', 'read', 'resolved', 'archived');

create index if not exists notifications_queue_entity_idx
  on public.notifications (recipient_profile_id, entity_type, entity_id, created_at desc)
  where status <> 'deleted';

create index if not exists notifications_destination_idx
  on public.notifications (recipient_profile_id, destination_url, created_at desc)
  where status in ('active', 'read');
