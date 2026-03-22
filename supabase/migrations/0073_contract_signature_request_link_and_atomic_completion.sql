alter table public.case_requests
  add column if not exists fee_agreement_id uuid references public.fee_agreements(id) on delete set null;

create index if not exists idx_case_requests_fee_agreement_kind
  on public.case_requests (fee_agreement_id, request_kind, created_at desc);

with uniquely_matched_requests as (
  select
    r.id as request_id,
    min(fa.id) as agreement_id
  from public.case_requests r
  join public.fee_agreements fa
    on fa.case_id = r.case_id
   and r.title = '[계약] ' || fa.title || ' 서명 요청'
  where r.request_kind = 'signature_request'
    and r.fee_agreement_id is null
  group by r.id
  having count(*) = 1
)
update public.case_requests r
set fee_agreement_id = m.agreement_id
from uniquely_matched_requests m
where r.id = m.request_id;

create or replace function app.complete_portal_contract_signature(
  p_case_id uuid,
  p_agreement_id uuid,
  p_request_id uuid,
  p_checked_page_one boolean,
  p_checked_contract_body boolean,
  p_checked_final_consent boolean,
  p_actor_name text
)
returns table (
  agreement_id uuid,
  request_id uuid,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_case_client public.case_clients%rowtype;
  v_agreement public.fee_agreements%rowtype;
  v_terms jsonb;
  v_now timestamptz := now();
  v_next_terms jsonb;
  v_request_id uuid := p_request_id;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_case_client
  from public.case_clients
  where case_id = p_case_id
    and profile_id = v_actor_id
    and is_portal_enabled = true
  limit 1;

  if v_case_client.id is null then
    raise exception 'PORTAL_CONTRACT_ACCESS_DENIED';
  end if;

  select *
  into v_agreement
  from public.fee_agreements
  where id = p_agreement_id
    and case_id = p_case_id
    and bill_to_case_client_id = v_case_client.id
  for update;

  if v_agreement.id is null then
    raise exception 'PORTAL_CONTRACT_NOT_FOUND';
  end if;

  v_terms := coalesce(v_agreement.terms_json, '{}'::jsonb);

  if coalesce(v_terms->>'signature_request', 'false') <> 'true' then
    raise exception 'PORTAL_CONTRACT_SIGNATURE_NOT_REQUIRED';
  end if;

  if v_terms->>'signature_status' = 'completed' then
    raise exception 'PORTAL_CONTRACT_SIGNATURE_ALREADY_COMPLETED';
  end if;

  if v_request_id is null then
    select r.id
    into v_request_id
    from public.case_requests r
    where r.case_id = p_case_id
      and r.request_kind = 'signature_request'
      and r.client_visible = true
      and r.fee_agreement_id = p_agreement_id
    order by r.created_at desc
    limit 1
    for update;
  else
    perform 1
    from public.case_requests r
    where r.id = v_request_id
      and r.case_id = p_case_id
      and r.request_kind = 'signature_request'
      and r.client_visible = true
      and (r.fee_agreement_id = p_agreement_id or r.fee_agreement_id is null)
    for update;

    if not found then
      raise exception 'PORTAL_CONTRACT_REQUEST_NOT_FOUND';
    end if;
  end if;

  v_next_terms := jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            v_terms,
            '{signature_status}',
            to_jsonb('completed'::text),
            true
          ),
          '{signature_completed_at}',
          to_jsonb(v_now),
          true
        ),
        '{signature_completed_by_profile_id}',
        to_jsonb(v_actor_id),
        true
      ),
      '{signature_completed_by_name}',
      to_jsonb(coalesce(nullif(p_actor_name, ''), '의뢰인')),
      true
    ),
    '{signature_confirmed_via}',
    to_jsonb('portal'::text),
    true
  );

  v_next_terms := jsonb_set(
    v_next_terms,
    '{signature_logs}',
    coalesce(v_terms->'signature_logs', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'actor_profile_id', v_actor_id,
        'actor_name', coalesce(nullif(p_actor_name, ''), '의뢰인'),
        'confirmed_at', v_now,
        'checked_page_one', p_checked_page_one,
        'checked_contract_body', p_checked_contract_body,
        'checked_final_consent', p_checked_final_consent,
        'method', coalesce(v_terms->>'signature_method', 'platform_checkbox'),
        'via', 'portal'
      )
    ),
    true
  );

  update public.fee_agreements
  set terms_json = v_next_terms,
      updated_at = v_now
  where id = p_agreement_id;

  if v_request_id is not null then
    update public.case_requests
    set status = 'completed',
        resolved_at = v_now,
        fee_agreement_id = p_agreement_id
    where id = v_request_id;
  end if;

  insert into public.case_messages (
    organization_id,
    case_id,
    sender_profile_id,
    sender_role,
    body,
    is_internal
  )
  values (
    v_case_client.organization_id,
    p_case_id,
    v_actor_id,
    'client',
    '[계약 동의 완료] ' || v_agreement.title || E'\n' || coalesce(nullif(p_actor_name, ''), '의뢰인') || '님이 포털에서 계약 확인을 마쳤습니다.',
    false
  );

  return query
  select p_agreement_id, v_request_id, v_now;
end;
$$;
