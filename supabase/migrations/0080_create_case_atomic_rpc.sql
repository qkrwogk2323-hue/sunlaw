-- Migration 0080: Atomic case creation RPC
--
-- Replaces the compensating-delete pattern in createCaseCoreWrite() with a proper
-- PL/pgSQL function that runs all three inserts (cases, case_handlers,
-- case_organizations) inside a single transaction. On any error the whole
-- transaction is rolled back — no partial rows, no race conditions.

create or replace function public.create_case_atomic(
  p_organization_id   uuid,
  p_reference_no      text,
  p_title             text,
  p_case_type         text,
  p_stage_template_key text,
  p_stage_key         text,
  p_module_flags      jsonb,
  p_principal_amount  numeric,
  p_opened_on         date,
  p_court_name        text,
  p_case_number       text,
  p_summary           text,
  p_actor_id          uuid,
  p_actor_name        text,
  p_can_manage_collection boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
begin
  -- 1. Insert case
  insert into public.cases (
    organization_id,
    reference_no,
    title,
    case_type,
    case_status,
    stage_template_key,
    stage_key,
    module_flags,
    principal_amount,
    opened_on,
    court_name,
    case_number,
    summary,
    created_by,
    updated_by
  ) values (
    p_organization_id,
    p_reference_no,
    p_title,
    p_case_type,
    'intake',
    p_stage_template_key,
    p_stage_key,
    p_module_flags,
    p_principal_amount,
    p_opened_on,
    p_court_name,
    p_case_number,
    p_summary,
    p_actor_id,
    p_actor_id
  )
  returning id into v_case_id;

  -- 2. Insert case handler (creator as manager)
  insert into public.case_handlers (
    organization_id,
    case_id,
    profile_id,
    handler_name,
    role
  ) values (
    p_organization_id,
    v_case_id,
    p_actor_id,
    p_actor_name,
    'case_manager'
  );

  -- 3. Insert case organization (lead managing org)
  insert into public.case_organizations (
    organization_id,
    case_id,
    role,
    status,
    access_scope,
    billing_scope,
    communication_scope,
    is_lead,
    can_submit_legal_requests,
    can_receive_legal_requests,
    can_manage_collection,
    can_view_client_messages,
    created_by,
    updated_by
  ) values (
    p_organization_id,
    v_case_id,
    'managing_org',
    'active',
    'full',
    'direct_client_billing',
    'client_visible',
    true,
    true,
    true,
    p_can_manage_collection,
    true,
    p_actor_id,
    p_actor_id
  );

  return v_case_id;
end;
$$;

-- Only platform admins and service role can call this directly;
-- application always calls via authenticated server actions (RLS is still active
-- on the underlying tables).
revoke all on function public.create_case_atomic from public;
grant execute on function public.create_case_atomic to authenticated;
grant execute on function public.create_case_atomic to service_role;
