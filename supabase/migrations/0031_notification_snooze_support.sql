alter table public.notifications
  add column if not exists snoozed_until timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'status'
  ) then
    execute '
      create index if not exists notifications_snooze_queue_idx
      on public.notifications (recipient_profile_id, status, snoozed_until, created_at desc)
      where status in (''active'', ''read'')';
  else
    execute '
      create index if not exists notifications_snooze_queue_idx
      on public.notifications (recipient_profile_id, snoozed_until, created_at desc)
      where trashed_at is null';
  end if;
end $$;
