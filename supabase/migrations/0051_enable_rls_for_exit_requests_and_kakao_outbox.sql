alter table public.organization_exit_requests enable row level security;

drop policy if exists organization_exit_requests_select on public.organization_exit_requests;
create policy organization_exit_requests_select on public.organization_exit_requests
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or requested_by_profile_id = auth.uid()
);

drop policy if exists organization_exit_requests_insert on public.organization_exit_requests;
create policy organization_exit_requests_insert on public.organization_exit_requests
for insert to authenticated
with check (
  app.is_platform_admin()
  or (
    app.is_org_manager(organization_id)
    and requested_by_profile_id = auth.uid()
  )
);

drop policy if exists organization_exit_requests_update on public.organization_exit_requests;
create policy organization_exit_requests_update on public.organization_exit_requests
for update to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
);

alter table public.kakao_notification_outbox enable row level security;

drop policy if exists kakao_notification_outbox_select on public.kakao_notification_outbox;
create policy kakao_notification_outbox_select on public.kakao_notification_outbox
for select to authenticated
using (app.is_platform_admin());

drop policy if exists kakao_notification_outbox_write on public.kakao_notification_outbox;
create policy kakao_notification_outbox_write on public.kakao_notification_outbox
for all to authenticated
using (app.is_platform_admin())
with check (app.is_platform_admin());
