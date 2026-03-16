-- Security and portal minimum-privilege hotfixes

alter table public.invitations alter column share_token drop not null;

create index if not exists idx_invitations_token_hash_status on public.invitations (token_hash, status);

-- Portal users should not read handler, participant, or org participation tables broadly
drop policy if exists case_handlers_select on public.case_handlers;
create policy case_handlers_select on public.case_handlers
for select to authenticated
using (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists case_clients_select on public.case_clients;
create policy case_clients_select on public.case_clients
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or profile_id = auth.uid()
);

drop policy if exists case_parties_select on public.case_parties;
create policy case_parties_select on public.case_parties
for select to authenticated
using (app.is_platform_admin() or app.is_org_staff(organization_id));

drop policy if exists case_organizations_select on public.case_organizations;
create policy case_organizations_select on public.case_organizations
for select to authenticated
using (app.is_platform_admin() or app.is_org_member(organization_id));

-- Client-created requests should not be fully mutable after creation
drop policy if exists case_requests_update on public.case_requests;
create policy case_requests_update on public.case_requests
for update to authenticated
using (app.is_org_staff(organization_id))
with check (app.is_org_staff(organization_id));

-- Client attachments are allowed only for client-visible requests on their own case
drop policy if exists case_request_files_select on public.case_request_attachments;
create policy case_request_files_select on public.case_request_attachments
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_staff(organization_id)
  or exists (
    select 1
    from public.case_requests r
    where r.id = case_request_id
      and r.client_visible = true
      and app.is_case_client(case_id)
  )
);

drop policy if exists case_request_files_insert on public.case_request_attachments;
create policy case_request_files_insert on public.case_request_attachments
for insert to authenticated
with check (
  app.is_org_staff(organization_id)
  or exists (
    select 1
    from public.case_requests r
    where r.id = case_request_id
      and r.client_visible = true
      and app.is_case_client(case_id)
  )
);
