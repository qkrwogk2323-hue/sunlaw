alter table public.organization_signup_requests
  add column if not exists approval_locked_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists approval_locked_at timestamptz;

alter table public.organizations
  add column if not exists source_signup_request_id uuid references public.organization_signup_requests(id) on delete set null;

create unique index if not exists uq_organizations_source_signup_request
on public.organizations (source_signup_request_id)
where source_signup_request_id is not null;

drop policy if exists signup_requests_update on public.organization_signup_requests;
create policy signup_requests_update on public.organization_signup_requests
for update to authenticated
using (app.is_platform_admin())
with check (app.is_platform_admin());

do $migration$
begin
  execute $sql$
    create or replace function app.cancel_organization_signup_request_atomic(p_request_id uuid)
    returns public.organization_signup_requests
    language plpgsql
    security definer
    set search_path = public
    as $function$
    declare
      v_request public.organization_signup_requests;
    begin
      update public.organization_signup_requests
         set status = 'cancelled',
             reviewed_note = '신청자 취소',
             reviewed_at = now(),
             approval_locked_by_profile_id = null,
             approval_locked_at = null
       where id = p_request_id
         and requester_profile_id = auth.uid()
         and status = 'pending'
      returning * into v_request;

      if v_request.id is null then
        raise exception 'organization signup request is not cancellable';
      end if;

      return v_request;
    end;
    $function$;
  $sql$;
end
$migration$;

grant execute on function app.cancel_organization_signup_request_atomic(uuid) to authenticated;