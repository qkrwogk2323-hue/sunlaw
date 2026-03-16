revoke all on all tables in schema public from anon;
revoke all on all tables in schema audit from anon;

grant usage on schema public to authenticated;
grant usage on schema app to authenticated;
grant usage on schema audit to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema app to authenticated;

grant select on all tables in schema audit to authenticated;
grant usage, select on all sequences in schema audit to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.cases enable row level security;
alter table public.case_handlers enable row level security;
alter table public.case_clients enable row level security;
alter table public.case_parties enable row level security;
alter table public.case_party_private_profiles enable row level security;
alter table public.case_documents enable row level security;
alter table public.case_document_reviews enable row level security;
alter table public.case_schedules enable row level security;
alter table public.case_recovery_activities enable row level security;
alter table public.notifications enable row level security;
alter table public.support_access_requests enable row level security;

alter table public.profiles force row level security;
alter table public.organizations force row level security;
alter table public.organization_memberships force row level security;
alter table public.cases force row level security;
alter table public.case_handlers force row level security;
alter table public.case_clients force row level security;
alter table public.case_parties force row level security;
alter table public.case_party_private_profiles force row level security;
alter table public.case_documents force row level security;
alter table public.case_document_reviews force row level security;
alter table public.case_schedules force row level security;
alter table public.case_recovery_activities force row level security;
alter table public.notifications force row level security;
alter table public.support_access_requests force row level security;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or app.is_platform_admin()
  or exists (
    select 1
    from public.organization_memberships current_m
    join public.organization_memberships target_m
      on current_m.organization_id = target_m.organization_id
    where current_m.profile_id = auth.uid()
      and current_m.status = 'active'
      and target_m.profile_id = profiles.id
      and target_m.status = 'active'
  )
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid() or app.is_platform_admin())
with check (id = auth.uid() or app.is_platform_admin());

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (app.is_platform_admin() or app.is_org_member(id));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(id))
with check (app.is_platform_admin() or app.is_org_manager(id));

drop policy if exists memberships_select on public.organization_memberships;
create policy memberships_select on public.organization_memberships
for select to authenticated
using (app.is_platform_admin() or app.is_org_member(organization_id));

drop policy if exists memberships_insert on public.organization_memberships;
create policy memberships_insert on public.organization_memberships
for insert to authenticated
with check (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or (
    profile_id = auth.uid()
    and role = 'org_owner'
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and o.created_by = auth.uid()
    )
  )
);

drop policy if exists memberships_update on public.organization_memberships;
create policy memberships_update on public.organization_memberships
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id))
with check (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists memberships_delete on public.organization_memberships;
create policy memberships_delete on public.organization_memberships
for delete to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases
for select to authenticated
using (app.can_view_case(id, organization_id));

drop policy if exists cases_insert on public.cases;
create policy cases_insert on public.cases
for insert to authenticated
with check (app.is_org_staff(organization_id) and created_by = auth.uid());

drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases
for update to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_handlers_select on public.case_handlers;
create policy case_handlers_select on public.case_handlers
for select to authenticated
using (app.can_view_case(case_id, organization_id));

drop policy if exists case_handlers_write on public.case_handlers;
create policy case_handlers_write on public.case_handlers
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_clients_select on public.case_clients;
create policy case_clients_select on public.case_clients
for select to authenticated
using (app.can_view_case(case_id, organization_id));

drop policy if exists case_clients_write on public.case_clients;
create policy case_clients_write on public.case_clients
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_parties_select on public.case_parties;
create policy case_parties_select on public.case_parties
for select to authenticated
using (app.can_view_case(case_id, organization_id));

drop policy if exists case_parties_write on public.case_parties;
create policy case_parties_write on public.case_parties
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_party_private_select on public.case_party_private_profiles;
create policy case_party_private_select on public.case_party_private_profiles
for select to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists case_party_private_write on public.case_party_private_profiles;
create policy case_party_private_write on public.case_party_private_profiles
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_documents_select on public.case_documents;
create policy case_documents_select on public.case_documents
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or (app.is_case_client(case_id) and client_visibility = 'client_visible')
);

drop policy if exists case_documents_write on public.case_documents;
create policy case_documents_write on public.case_documents
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_document_reviews_select on public.case_document_reviews;
create policy case_document_reviews_select on public.case_document_reviews
for select to authenticated
using (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists case_document_reviews_insert on public.case_document_reviews;
create policy case_document_reviews_insert on public.case_document_reviews
for insert to authenticated
with check (app.is_org_staff(organization_id));

drop policy if exists case_schedules_select on public.case_schedules;
create policy case_schedules_select on public.case_schedules
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or (app.is_case_client(case_id) and client_visibility = 'client_visible')
);

drop policy if exists case_schedules_write on public.case_schedules;
create policy case_schedules_write on public.case_schedules
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists case_recovery_select on public.case_recovery_activities;
create policy case_recovery_select on public.case_recovery_activities
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or (app.is_case_client(case_id) and client_visibility = 'client_visible')
);

drop policy if exists case_recovery_write on public.case_recovery_activities;
create policy case_recovery_write on public.case_recovery_activities
for all to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select to authenticated
using (recipient_profile_id = auth.uid() or app.is_platform_admin());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
for insert to authenticated
with check (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

drop policy if exists support_requests_select on public.support_access_requests;
create policy support_requests_select on public.support_access_requests
for select to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id));

drop policy if exists support_requests_insert on public.support_access_requests;
create policy support_requests_insert on public.support_access_requests
for insert to authenticated
with check (app.is_platform_admin() and requested_by = auth.uid());

drop policy if exists support_requests_update on public.support_access_requests;
create policy support_requests_update on public.support_access_requests
for update to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id))
with check (app.is_platform_admin() or app.is_org_manager(organization_id));
