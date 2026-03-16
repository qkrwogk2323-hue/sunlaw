-- P0-03 invitation rework

alter table public.invitations
  add column if not exists case_client_id uuid references public.case_clients(id) on delete set null,
  add column if not exists invited_name text,
  add column if not exists actor_category text,
  add column if not exists role_template_key text,
  add column if not exists case_scope_policy text,
  add column if not exists permissions_override jsonb not null default '{}'::jsonb,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_invitations_status_expires on public.invitations (status, expires_at);
create index if not exists idx_invitations_case_client on public.invitations (case_client_id, status);

alter table public.invitations
  drop constraint if exists invitations_staff_fields_check;

alter table public.invitations
  add constraint invitations_staff_fields_check
  check (
    (kind = 'staff_invite' and requested_role is not null and case_id is null)
    or
    (kind = 'client_invite' and case_id is not null)
  );

alter table public.invitations enable row level security;
alter table public.invitations force row level security;

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
with check (
  app.is_platform_admin() or app.is_org_manager(organization_id)
);

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations
for update to authenticated
using (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
)
with check (
  app.is_platform_admin()
  or app.is_org_manager(organization_id)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(email)
);

drop trigger if exists trg_invitations_updated_at on public.invitations;
create trigger trg_invitations_updated_at
before update on public.invitations
for each row execute procedure app.set_updated_at();
