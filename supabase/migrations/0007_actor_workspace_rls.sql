alter table public.organization_signup_requests enable row level security;
alter table public.organization_signup_requests force row level security;
alter table public.invitations enable row level security;
alter table public.invitations force row level security;
alter table public.case_messages enable row level security;
alter table public.case_messages force row level security;
alter table public.case_requests enable row level security;
alter table public.case_requests force row level security;
alter table public.case_request_attachments enable row level security;
alter table public.case_request_attachments force row level security;
alter table public.billing_entries enable row level security;
alter table public.billing_entries force row level security;
alter table public.case_stage_templates enable row level security;
alter table public.case_stage_templates force row level security;
alter table public.case_stage_template_steps enable row level security;
alter table public.case_stage_template_steps force row level security;

drop policy if exists signup_requests_select on public.organization_signup_requests;
drop policy if exists signup_requests_select on public.organization_signup_requests;
create policy signup_requests_select on public.organization_signup_requests
for select to authenticated
using (app.is_platform_admin() or requester_profile_id = auth.uid());

drop policy if exists signup_requests_insert on public.organization_signup_requests;
create policy signup_requests_insert on public.organization_signup_requests
for insert to authenticated
with check (requester_profile_id = auth.uid());

drop policy if exists signup_requests_update on public.organization_signup_requests;
create policy signup_requests_update on public.organization_signup_requests
for update to authenticated
using (app.is_platform_admin())
with check (app.is_platform_admin());

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
);

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations
for insert to authenticated
with check (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id))
with check (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists stage_templates_select on public.case_stage_templates;
create policy stage_templates_select on public.case_stage_templates
for select to authenticated
using (organization_id is null or app.is_org_member(organization_id));

drop policy if exists stage_templates_write on public.case_stage_templates;
create policy stage_templates_write on public.case_stage_templates
for all to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id))
with check (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists stage_template_steps_select on public.case_stage_template_steps;
create policy stage_template_steps_select on public.case_stage_template_steps
for select to authenticated
using (
  exists (
    select 1 from public.case_stage_templates t
    where t.id = template_id
      and (t.organization_id is null or app.is_org_member(t.organization_id))
  )
);

drop policy if exists stage_template_steps_write on public.case_stage_template_steps;
create policy stage_template_steps_write on public.case_stage_template_steps
for all to authenticated
using (
  exists (
    select 1 from public.case_stage_templates t
    where t.id = template_id
      and (app.is_platform_admin() or app.is_org_manager(t.organization_id))
  )
)
with check (
  exists (
    select 1 from public.case_stage_templates t
    where t.id = template_id
      and (app.is_platform_admin() or app.is_org_manager(t.organization_id))
  )
);

drop policy if exists case_messages_select on public.case_messages;
create policy case_messages_select on public.case_messages
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or (app.is_case_client(case_id) and is_internal = false)
);

drop policy if exists case_messages_insert on public.case_messages;
create policy case_messages_insert on public.case_messages
for insert to authenticated
with check (
  sender_profile_id = auth.uid()
  and (
    app.is_org_staff(organization_id)
    or (app.is_case_client(case_id) and is_internal = false)
  )
);

drop policy if exists case_requests_select on public.case_requests;
create policy case_requests_select on public.case_requests
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or (app.is_case_client(case_id) and client_visible = true)
);

drop policy if exists case_requests_insert on public.case_requests;
create policy case_requests_insert on public.case_requests
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    app.is_org_staff(organization_id)
    or (app.is_case_client(case_id) and client_visible = true)
  )
);

drop policy if exists case_requests_update on public.case_requests;
create policy case_requests_update on public.case_requests
for update to authenticated
using (
  app.is_org_staff(organization_id)
  or created_by = auth.uid()
)
with check (
  app.is_org_staff(organization_id)
  or created_by = auth.uid()
);

drop policy if exists case_request_files_select on public.case_request_attachments;
create policy case_request_files_select on public.case_request_attachments
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or app.is_case_client(case_id)
);

drop policy if exists case_request_files_insert on public.case_request_attachments;
create policy case_request_files_insert on public.case_request_attachments
for insert to authenticated
with check (
  app.is_org_staff(organization_id)
  or app.is_case_client(case_id)
);

drop policy if exists billing_entries_select on public.billing_entries;
create policy billing_entries_select on public.billing_entries
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or app.is_case_client(case_id)
);

drop policy if exists billing_entries_write on public.billing_entries;
create policy billing_entries_write on public.billing_entries
for all to authenticated
using (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'billing_manage'))
with check (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'billing_manage'));
