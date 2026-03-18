alter table public.notifications
  add column if not exists snoozed_until timestamptz;

create index if not exists notifications_snooze_queue_idx
  on public.notifications (recipient_profile_id, status, snoozed_until, created_at desc)
  where status in ('active', 'read');
