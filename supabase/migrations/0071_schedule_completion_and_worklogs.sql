alter table public.case_schedules
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_by_name text;

create table if not exists public.case_schedule_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  case_schedule_id uuid not null references public.case_schedules(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action_type text not null check (action_type in ('completed', 'reopened')),
  summary text not null,
  schedule_title text not null,
  schedule_scheduled_start timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_schedule_activity_logs_org_created
  on public.case_schedule_activity_logs (organization_id, created_at desc);

create index if not exists idx_case_schedule_activity_logs_schedule_created
  on public.case_schedule_activity_logs (case_schedule_id, created_at desc);

alter table public.case_schedule_activity_logs enable row level security;
alter table public.case_schedule_activity_logs force row level security;

drop policy if exists case_schedule_activity_logs_select on public.case_schedule_activity_logs;
create policy case_schedule_activity_logs_select on public.case_schedule_activity_logs
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
);

drop policy if exists case_schedule_activity_logs_write on public.case_schedule_activity_logs;
create policy case_schedule_activity_logs_write on public.case_schedule_activity_logs
for all to authenticated
using (
  app.is_org_staff(organization_id)
  and (
    app.has_permission(organization_id, 'schedule_create')
    or app.has_permission(organization_id, 'schedule_edit')
    or app.has_permission(organization_id, 'schedule_manage')
    or app.has_permission(organization_id, 'case_create')
  )
)
with check (
  app.is_org_staff(organization_id)
  and (
    app.has_permission(organization_id, 'schedule_create')
    or app.has_permission(organization_id, 'schedule_edit')
    or app.has_permission(organization_id, 'schedule_manage')
    or app.has_permission(organization_id, 'case_create')
  )
);
