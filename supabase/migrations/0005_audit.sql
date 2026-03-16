create table if not exists audit.change_log (
  id bigserial primary key,
  logged_at timestamptz not null default now(),
  schema_name text not null,
  table_name text not null,
  operation text not null,
  record_id text,
  organization_id uuid,
  case_id uuid,
  actor_user_id uuid,
  actor_email text,
  changed_fields text[] not null default '{}',
  old_values jsonb,
  new_values jsonb
);

create index if not exists idx_audit_org_logged_at on audit.change_log (organization_id, logged_at desc);
create index if not exists idx_audit_case_logged_at on audit.change_log (case_id, logged_at desc);
create index if not exists idx_audit_actor_logged_at on audit.change_log (actor_user_id, logged_at desc);

create or replace function audit.capture_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, audit, pg_temp
as $$
declare
  old_data jsonb;
  new_data jsonb;
  changed text[];
  record_id text;
  org_id uuid;
  case_id_value uuid;
begin
  if tg_op = 'INSERT' then
    old_data := null;
    new_data := to_jsonb(new);
    select coalesce(array_agg(key order by key), '{}'::text[]) into changed
    from jsonb_object_keys(new_data) as key;
  elsif tg_op = 'DELETE' then
    old_data := to_jsonb(old);
    new_data := null;
    select coalesce(array_agg(key order by key), '{}'::text[]) into changed
    from jsonb_object_keys(old_data) as key;
  else
    old_data := to_jsonb(old);
    new_data := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), '{}'::text[])
      into changed
    from jsonb_each(new_data) n
    left join jsonb_each(old_data) o using (key)
    where n.value is distinct from o.value;
  end if;

  record_id := coalesce(new_data ->> 'id', old_data ->> 'id');
  org_id := coalesce(nullif(new_data ->> 'organization_id', '')::uuid, nullif(old_data ->> 'organization_id', '')::uuid);
  case_id_value := coalesce(nullif(new_data ->> 'case_id', '')::uuid, nullif(old_data ->> 'case_id', '')::uuid);

  insert into audit.change_log (
    schema_name,
    table_name,
    operation,
    record_id,
    organization_id,
    case_id,
    actor_user_id,
    actor_email,
    changed_fields,
    old_values,
    new_values
  )
  values (
    tg_table_schema,
    tg_table_name,
    tg_op,
    record_id,
    org_id,
    case_id_value,
    auth.uid(),
    auth.jwt() ->> 'email',
    changed,
    old_data,
    new_data
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_organizations on public.organizations;
create trigger audit_organizations after insert or update or delete on public.organizations
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_memberships on public.organization_memberships;
create trigger audit_memberships after insert or update or delete on public.organization_memberships
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_cases on public.cases;
create trigger audit_cases after insert or update or delete on public.cases
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_handlers on public.case_handlers;
create trigger audit_case_handlers after insert or update or delete on public.case_handlers
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_clients on public.case_clients;
create trigger audit_case_clients after insert or update or delete on public.case_clients
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_parties on public.case_parties;
create trigger audit_case_parties after insert or update or delete on public.case_parties
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_documents on public.case_documents;
create trigger audit_case_documents after insert or update or delete on public.case_documents
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_document_reviews on public.case_document_reviews;
create trigger audit_case_document_reviews after insert or update or delete on public.case_document_reviews
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_schedules on public.case_schedules;
create trigger audit_case_schedules after insert or update or delete on public.case_schedules
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_recovery on public.case_recovery_activities;
create trigger audit_case_recovery after insert or update or delete on public.case_recovery_activities
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_notifications on public.notifications;
create trigger audit_notifications after insert or update or delete on public.notifications
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_support_requests on public.support_access_requests;
create trigger audit_support_requests after insert or update or delete on public.support_access_requests
for each row execute procedure audit.capture_row_change();

alter table audit.change_log enable row level security;
alter table audit.change_log force row level security;

drop policy if exists audit_select on audit.change_log;
create policy audit_select on audit.change_log
for select to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id));
