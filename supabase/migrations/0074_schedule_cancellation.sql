alter table public.case_schedules
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid references public.profiles(id) on delete set null,
  add column if not exists canceled_by_name text,
  add column if not exists canceled_reason text;

alter table public.case_schedule_activity_logs
  drop constraint if exists case_schedule_activity_logs_action_type_check;

alter table public.case_schedule_activity_logs
  add constraint case_schedule_activity_logs_action_type_check
  check (action_type in ('completed', 'reopened', 'canceled', 'cancel_reverted'));
