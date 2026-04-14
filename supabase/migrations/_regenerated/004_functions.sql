-- ============================================================
-- 004_functions.sql
-- Regenerated squash — Batch 4: user functions
-- Strategy: plpgsql functions first (body validation deferred),
--           then sql functions in alphabetical order.
-- All referenced tables already exist (Batch 2). FKs already set (Batch 3).
-- ============================================================

-- Disable function body validation during creation. This is the standard
-- pg_dump approach: allows inter-function forward references (e.g. one sql
-- function calling another sql function defined later in this file) to be
-- resolved at runtime rather than CREATE time.

-- app.add_case_party_atomic [plpgsql]
CREATE OR REPLACE FUNCTION app.add_case_party_atomic(p_organization_id uuid, p_case_id uuid, p_party_role party_role, p_entity_type entity_type, p_display_name text, p_company_name text, p_registration_number_masked text, p_resident_number_last4 text, p_phone text, p_email citext, p_address_summary text, p_notes text, p_is_primary boolean, p_resident_number_ciphertext text, p_registration_number_ciphertext text, p_address_detail_ciphertext text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
    declare
      v_party_id uuid;
    begin
      if not app.is_org_staff(p_organization_id) or not app.has_permission(p_organization_id, 'case_edit') then
        raise exception 'insufficient privileges to add case party';
      end if;

      if not exists (
        select 1
        from public.cases
        where id = p_case_id
          and organization_id = p_organization_id
          and lifecycle_status <> 'soft_deleted'
      ) then
        raise exception 'case not found';
      end if;

      insert into public.case_parties (
        organization_id,
        case_id,
        party_role,
        entity_type,
        display_name,
        company_name,
        registration_number_masked,
        resident_number_last4,
        phone,
        email,
        address_summary,
        notes,
        is_primary,
        created_by,
        updated_by
      )
      values (
        p_organization_id,
        p_case_id,
        p_party_role,
        p_entity_type,
        p_display_name,
        p_company_name,
        p_registration_number_masked,
        p_resident_number_last4,
        p_phone,
        p_email,
        p_address_summary,
        p_notes,
        p_is_primary,
        auth.uid(),
        auth.uid()
      )
      returning id into v_party_id;

      if p_resident_number_ciphertext is not null
        or p_registration_number_ciphertext is not null
        or p_address_detail_ciphertext is not null then
        insert into public.case_party_private_profiles (
          organization_id,
          case_id,
          case_party_id,
          resident_number_ciphertext,
          registration_number_ciphertext,
          address_detail_ciphertext,
          created_by,
          updated_by
        )
        values (
          p_organization_id,
          p_case_id,
          v_party_id,
          p_resident_number_ciphertext,
          p_registration_number_ciphertext,
          p_address_detail_ciphertext,
          auth.uid(),
          auth.uid()
        );
      end if;

      return v_party_id;
    end;
    $$
;

-- app.approve_organization_signup_request_atomic [plpgsql]
CREATE OR REPLACE FUNCTION app.approve_organization_signup_request_atomic(p_request_id uuid, p_reviewer_profile_id uuid, p_review_note text DEFAULT NULL::text)
 RETURNS TABLE(organization_id uuid, request_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
    declare
      v_request public.organization_signup_requests;
      v_existing_organization public.organizations;
      v_created_organization public.organizations;
      v_slug_base text;
      v_slug text;
      v_enabled_modules jsonb;
      v_reviewed_at timestamptz := now();
      v_requested_modules jsonb;
      v_requests_collections boolean := false;
      v_requests_client_portal boolean := false;
    begin
      select *
        into v_request
        from public.organization_signup_requests
       where id = p_request_id
       for update;

      if v_request.id is null then
        raise exception 'organization signup request not found';
      end if;

      if v_request.status = 'approved' and v_request.approved_organization_id is not null then
        return query
        select v_request.approved_organization_id, v_request.status::text;
        return;
      end if;

      if v_request.status not in ('pending', 'approved') then
        raise exception 'organization signup request is not approvable';
      end if;

      if v_request.approval_locked_by_profile_id is not null
         and v_request.approval_locked_by_profile_id <> p_reviewer_profile_id then
        raise exception 'organization signup request is locked by another reviewer';
      end if;

      select *
        into v_existing_organization
        from public.organizations
       where source_signup_request_id = p_request_id
       limit 1;

      if v_existing_organization.id is null and v_request.approved_organization_id is not null then
        select *
          into v_existing_organization
          from public.organizations
         where id = v_request.approved_organization_id
         limit 1;
      end if;

      if v_existing_organization.id is null then
        v_slug_base := regexp_replace(lower(coalesce(v_request.organization_name, 'org')), '[^a-z0-9]+', '-', 'g');
        v_slug_base := trim(both '-' from v_slug_base);
        if v_slug_base = '' then
          v_slug_base := 'org';
        end if;

        v_slug := v_slug_base || '-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 6);
        v_requested_modules := coalesce(v_request.requested_modules, '[]'::jsonb);

        if jsonb_typeof(v_requested_modules) = 'array' then
          select exists(
                   select 1
                   from jsonb_array_elements_text(v_requested_modules) as requested_module(value)
                   where requested_module.value = 'collections'
                 ),
                 exists(
                   select 1
                   from jsonb_array_elements_text(v_requested_modules) as requested_module(value)
                   where requested_module.value = 'client_portal'
                 )
            into v_requests_collections, v_requests_client_portal;
        end if;

        if v_request.requested_modules is null then
          v_requests_client_portal := true;
        end if;

        v_enabled_modules := jsonb_build_object(
          'billing', true,
          'collections', v_request.organization_kind in ('collection_company', 'mixed_practice') or v_requests_collections,
          'client_portal', v_requests_client_portal,
          'reports', true
        );

        insert into public.organizations (
          slug,
          name,
          kind,
          business_number,
          representative_name,
          representative_title,
          email,
          phone,
          website_url,
          enabled_modules,
          onboarding_status,
          created_by,
          source_signup_request_id
        )
        values (
          v_slug,
          v_request.organization_name,
          v_request.organization_kind,
          v_request.business_number,
          v_request.representative_name,
          v_request.representative_title,
          v_request.requester_email,
          v_request.contact_phone,
          v_request.website_url,
          v_enabled_modules,
          'approved',
          v_request.requester_profile_id,
          p_request_id
        )
        returning * into v_created_organization;

        v_existing_organization := v_created_organization;
      end if;

      insert into public.organization_memberships (
        organization_id,
        profile_id,
        role,
        status,
        actor_category,
        permission_template_key,
        case_scope_policy,
        title,
        is_primary,
        permissions
      )
      values (
        v_existing_organization.id,
        v_request.requester_profile_id,
        'org_owner',
        'active',
        'admin',
        'admin_general',
        'all_org_cases',
        '대표 관리자',
        true,
        '{}'::jsonb
      )
      on conflict on constraint organization_memberships_organization_id_profile_id_key
      do update
         set role = excluded.role,
             status = excluded.status,
             actor_category = excluded.actor_category,
             permission_template_key = excluded.permission_template_key,
             case_scope_policy = excluded.case_scope_policy,
             title = excluded.title,
             is_primary = excluded.is_primary,
             permissions = excluded.permissions;

      update public.profiles
         set default_organization_id = v_existing_organization.id
       where id = v_request.requester_profile_id;

      update public.organization_signup_requests
         set status = 'approved',
             reviewed_by = p_reviewer_profile_id,
             reviewed_note = nullif(p_review_note, ''),
             reviewed_at = v_reviewed_at,
             approved_organization_id = v_existing_organization.id,
             approval_locked_by_profile_id = null,
             approval_locked_at = null
       where id = p_request_id;

      return query
      select v_existing_organization.id, 'approved'::text;
    end;
    $$
;

-- app.assert_valid_platform_organization [plpgsql]
CREATE OR REPLACE FUNCTION app.assert_valid_platform_organization(target_organization_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  v_org public.organizations%rowtype;
begin
  select *
    into v_org
  from public.organizations
  where id = target_organization_id;

  if not found then
    raise exception 'platform governance guard failed: organization % not found', target_organization_id;
  end if;

  if v_org.lifecycle_status = 'soft_deleted' then
    raise exception 'platform governance guard failed: organization % is soft deleted', target_organization_id;
  end if;

  return target_organization_id;
end;
$$
;

-- app.cancel_organization_signup_request_atomic [plpgsql]
CREATE OR REPLACE FUNCTION app.cancel_organization_signup_request_atomic(p_request_id uuid)
 RETURNS organization_signup_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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
    $$
;

-- app.case_hub_sync_from_case_organizations [plpgsql]
CREATE OR REPLACE FUNCTION app.case_hub_sync_from_case_organizations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  affected_case uuid;
begin
  affected_case := coalesce(new.case_id, old.case_id);
  if affected_case is not null then
    perform app.sync_case_hub_organizations_for_case(affected_case);
  end if;
  return coalesce(new, old);
end;
$$
;

-- app.case_hub_sync_from_hubs [plpgsql]
CREATE OR REPLACE FUNCTION app.case_hub_sync_from_hubs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  perform app.sync_case_hub_organizations(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$
;

-- app.cleanup_case_hub_client_links [plpgsql]
CREATE OR REPLACE FUNCTION app.cleanup_case_hub_client_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  if new.link_status in ('unlinked', 'orphan_review') then
    update public.case_hubs
       set primary_case_client_id = null,
           primary_client_id = null,
           updated_at = now()
     where primary_case_client_id = new.id;
  elsif new.link_status = 'linked' and new.last_linked_hub_id is not null then
    update public.case_hubs
       set primary_case_client_id = new.id,
           primary_client_id = coalesce(new.profile_id, primary_client_id),
           updated_at = now()
     where id = new.last_linked_hub_id
       and primary_case_client_id is null;
  end if;

  return new;
end;
$$
;

-- app.enqueue_kakao_notification_for_eligible [plpgsql]
CREATE OR REPLACE FUNCTION app.enqueue_kakao_notification_for_eligible()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  pref record;
  has_kakao_identity boolean := false;
  entity text := coalesce(new.entity_type, new.action_entity_type, 'collaboration');
begin
  if coalesce(new.recipient_profile_id, null) is null then
    return new;
  end if;

  select exists (
    select 1
    from auth.identities i
    where i.user_id = new.recipient_profile_id
      and i.provider = 'kakao'
  ) into has_kakao_identity;

  if not has_kakao_identity then
    return new;
  end if;

  select *
  into pref
  from public.notification_channel_preferences p
  where p.profile_id = new.recipient_profile_id;

  if pref is null then
    insert into public.notification_channel_preferences (profile_id)
    values (new.recipient_profile_id)
    on conflict (profile_id) do nothing;

    select *
    into pref
    from public.notification_channel_preferences p
    where p.profile_id = new.recipient_profile_id;
  end if;

  if coalesce(pref.kakao_enabled, false) = false then
    return new;
  end if;

  if coalesce(pref.kakao_important_only, true) = true and coalesce(new.priority, 'normal') <> 'urgent' then
    return new;
  end if;

  if entity = 'case' and coalesce(pref.allow_case, true) = false then
    return new;
  end if;
  if entity = 'schedule' and coalesce(pref.allow_schedule, true) = false then
    return new;
  end if;
  if entity = 'client' and coalesce(pref.allow_client, true) = false then
    return new;
  end if;
  if entity = 'collaboration' and coalesce(pref.allow_collaboration, true) = false then
    return new;
  end if;

  insert into public.kakao_notification_outbox (
    notification_id,
    recipient_profile_id,
    payload,
    status
  ) values (
    new.id,
    new.recipient_profile_id,
    jsonb_build_object(
      'title', new.title,
      'body', new.body,
      'destination_url', coalesce(new.destination_url, new.action_href, '/notifications'),
      'priority', coalesce(new.priority, 'normal')
    ),
    'pending'
  );

  return new;
end;
$$
;

-- app.fill_organization_id_from_case [plpgsql]
CREATE OR REPLACE FUNCTION app.fill_organization_id_from_case()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.case_id IS NOT NULL THEN
    SELECT c.organization_id INTO NEW.organization_id FROM public.cases c WHERE c.id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$
;

-- app.guard_document_review_update [plpgsql]
CREATE OR REPLACE FUNCTION app.guard_document_review_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  if new.approval_status in ('approved', 'rejected') and not app.is_org_manager(new.organization_id) then
    raise exception 'Only org owner or manager can approve or reject documents';
  end if;
  return new;
end;
$$
;

-- app.handle_case_client_link_lifecycle [plpgsql]
CREATE OR REPLACE FUNCTION app.handle_case_client_link_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  if new.link_status = 'pending_unlink' and old.link_status <> 'pending_unlink' then
    new.detached_at := coalesce(new.detached_at, now());
  end if;

  if new.link_status = 'orphan_review' and old.link_status <> 'orphan_review' then
    new.orphaned_at := coalesce(new.orphaned_at, now());
    new.review_deadline := coalesce(new.review_deadline, now() + interval '7 days');
  end if;

  if new.link_status = 'linked' then
    new.detached_at := null;
    new.orphaned_at := null;
    new.review_deadline := null;
    new.orphan_reason := null;
  end if;

  return new;
end;
$$
;

-- app.handle_new_user [plpgsql]
CREATE OR REPLACE FUNCTION app.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$
;

-- app.is_org_manager [plpgsql]
CREATE OR REPLACE FUNCTION app.is_org_manager(target_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org and m.profile_id = auth.uid() and m.status = 'active'
      and m.role in ('org_owner', 'org_manager')
  );
end;
$$
;

-- app.is_org_member [plpgsql]
CREATE OR REPLACE FUNCTION app.is_org_member(target_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_org and m.profile_id = auth.uid() and m.status = 'active'
  );
end;
$$
;

-- app.is_org_staff [plpgsql]
CREATE OR REPLACE FUNCTION app.is_org_staff(target_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return app.is_org_member(target_org);
end;
$$
;

-- app.is_platform_admin [plpgsql]
CREATE OR REPLACE FUNCTION app.is_platform_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return exists (
    select 1
    from public.platform_runtime_settings prs
    join public.organization_memberships om on om.organization_id = prs.platform_organization_id
    join public.organizations o on o.id = prs.platform_organization_id
    where prs.singleton = true and om.profile_id = auth.uid() and om.status = 'active'
      and om.role in ('org_owner', 'org_manager')
      and o.kind = 'platform_management' and o.lifecycle_status <> 'soft_deleted'
  );
end;
$$
;

-- app.link_case_client_atomic [plpgsql]
CREATE OR REPLACE FUNCTION app.link_case_client_atomic(p_organization_id uuid, p_case_id uuid, p_case_title text, p_target_profile_id uuid, p_client_name text, p_client_email_snapshot citext, p_relation_label text, p_portal_enabled boolean, p_fee_agreement_title text, p_fee_agreement_type billing_agreement_type, p_fee_agreement_amount numeric, p_billing_entry_title text, p_billing_entry_amount numeric, p_billing_entry_due_on date)
 RETURNS TABLE(case_client_id uuid, activated_profile_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
    declare
      v_case_client_id uuid;
      v_billing_owner_case_organization_id uuid;
      v_activated_profile_id uuid := null;
      v_financial_access_required boolean := p_fee_agreement_title is not null or (p_billing_entry_title is not null and p_billing_entry_amount is not null);
      v_due_at timestamptz;
    begin
      if not app.is_org_staff(p_organization_id) or not app.has_permission(p_organization_id, 'case_edit') then
        raise exception 'insufficient privileges to link client';
      end if;

      if v_financial_access_required and not app.has_permission(p_organization_id, 'billing_manage') then
        raise exception 'billing_manage permission is required for financial records';
      end if;

      if not exists (
        select 1
        from public.cases
        where id = p_case_id
          and organization_id = p_organization_id
          and lifecycle_status <> 'soft_deleted'
      ) then
        raise exception 'case not found';
      end if;

      insert into public.case_clients (
        organization_id,
        case_id,
        profile_id,
        client_name,
        client_email_snapshot,
        relation_label,
        is_portal_enabled,
        created_by,
        updated_by
      )
      values (
        p_organization_id,
        p_case_id,
        p_target_profile_id,
        p_client_name,
        p_client_email_snapshot,
        p_relation_label,
        coalesce(p_target_profile_id is not null and p_portal_enabled, false),
        auth.uid(),
        auth.uid()
      )
      returning id into v_case_client_id;

      select id
      into v_billing_owner_case_organization_id
      from public.case_organizations
      where case_id = p_case_id
        and organization_id = p_organization_id
        and role = 'managing_org'
      limit 1;

      if p_fee_agreement_title is not null then
        insert into public.fee_agreements (
          organization_id,
          case_id,
          bill_to_party_kind,
          bill_to_case_client_id,
          bill_to_case_organization_id,
          billing_owner_case_organization_id,
          agreement_type,
          title,
          description,
          fixed_amount,
          rate,
          effective_from,
          effective_to,
          is_active,
          terms_json,
          created_by,
          updated_by
        )
        values (
          p_organization_id,
          p_case_id,
          'case_client',
          v_case_client_id,
          null,
          v_billing_owner_case_organization_id,
          p_fee_agreement_type,
          p_fee_agreement_title,
          concat(p_client_email_snapshot, case when p_relation_label is not null and p_relation_label <> '' then ' · ' || p_relation_label else '' end),
          p_fee_agreement_amount,
          null,
          current_date,
          null,
          true,
          null,
          auth.uid(),
          auth.uid()
        );
      end if;

      if p_billing_entry_title is not null and p_billing_entry_amount is not null then
        insert into public.billing_entries (
          organization_id,
          case_id,
          bill_to_party_kind,
          bill_to_case_client_id,
          bill_to_case_organization_id,
          billing_owner_case_organization_id,
          entry_kind,
          title,
          amount,
          tax_amount,
          due_on,
          status,
          notes,
          created_by,
          updated_by
        )
        values (
          p_organization_id,
          p_case_id,
          'case_client',
          v_case_client_id,
          null,
          v_billing_owner_case_organization_id,
          'retainer_fee',
          p_billing_entry_title,
          p_billing_entry_amount,
          0,
          p_billing_entry_due_on,
          'draft',
          concat(p_client_email_snapshot, case when p_relation_label is not null and p_relation_label <> '' then ' · ' || p_relation_label else '' end),
          auth.uid(),
          auth.uid()
        );

        if p_billing_entry_due_on is not null then
          v_due_at := (p_billing_entry_due_on::text || 'T09:00:00+09:00')::timestamptz;

          insert into public.case_schedules (
            organization_id,
            case_id,
            title,
            schedule_kind,
            scheduled_start,
            scheduled_end,
            location,
            notes,
            client_visibility,
            is_important,
            created_by,
            created_by_name,
            updated_by
          )
          values (
            p_organization_id,
            p_case_id,
            p_billing_entry_title,
            'deadline',
            v_due_at,
            null,
            null,
            p_client_email_snapshot || ' 연결과 함께 비용 항목이 등록되었습니다.',
            'internal_only',
            true,
            auth.uid(),
            null,
            auth.uid()
          );
        end if;
      end if;

      if p_target_profile_id is not null and p_portal_enabled then
        update public.profiles
        set is_client_account = true,
            client_account_status = 'active',
            client_account_status_changed_at = now(),
            client_account_status_reason = p_case_title || ' 사건 포털 연결 활성화',
            client_last_approved_at = now()
        where id = p_target_profile_id;

        v_activated_profile_id := p_target_profile_id;
      end if;

      return query select v_case_client_id, v_activated_profile_id;
    end;
    $$
;

-- app.log_subscription_state_change [plpgsql]
CREATE OR REPLACE FUNCTION app.log_subscription_state_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  if tg_op = 'INSERT' then
    insert into public.billing_subscription_events (
      organization_id,
      state,
      event_type,
      event_reason,
      created_by
    ) values (
      new.organization_id,
      new.state,
      'state_initialized',
      new.lock_reason,
      new.updated_by
    );
    return new;
  end if;

  if old.state is distinct from new.state
    or old.lock_reason is distinct from new.lock_reason
    or old.plan_code is distinct from new.plan_code then
    insert into public.billing_subscription_events (
      organization_id,
      state,
      event_type,
      event_reason,
      metadata,
      created_by
    ) values (
      new.organization_id,
      new.state,
      'state_changed',
      new.lock_reason,
      jsonb_build_object(
        'previous_state', old.state,
        'plan_code', new.plan_code
      ),
      new.updated_by
    );
  end if;

  return new;
end;
$$
;

-- app.mark_document_stale [plpgsql]
CREATE OR REPLACE FUNCTION app.mark_document_stale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  if old.approval_status = 'approved' and (
    new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.content_markdown is distinct from old.content_markdown
    or new.storage_path is distinct from old.storage_path
    or new.client_visibility is distinct from old.client_visibility
  ) then
    new.approval_status = 'stale';
    new.reviewed_by = null;
    new.reviewed_by_name = null;
    new.reviewed_at = null;
    new.review_note = null;
  end if;
  return new;
end;
$$
;

-- app.prevent_platform_registry_drift [plpgsql]
CREATE OR REPLACE FUNCTION app.prevent_platform_registry_drift()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  v_platform_org_id uuid;
begin
  v_platform_org_id := app.current_platform_organization_id();

  if v_platform_org_id is null then
    return new;
  end if;

  if new.id = v_platform_org_id then
    if new.lifecycle_status = 'soft_deleted' then
      raise exception 'platform governance drift blocked: runtime platform organization cannot be soft deleted while registered';
    end if;

    if new.kind <> 'platform_management' then
      raise exception 'platform governance drift blocked: runtime platform organization kind must remain platform_management';
    end if;

    if new.is_platform_root is distinct from true then
      raise exception 'platform governance drift blocked: runtime platform organization must remain is_platform_root = true';
    end if;
  elsif new.is_platform_root = true then
    raise exception 'platform governance drift blocked: only the runtime registry organization may hold is_platform_root = true';
  end if;

  return new;
end;
$$
;

-- app.set_updated_at [plpgsql]
CREATE OR REPLACE FUNCTION app.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$
;

-- app.set_updated_at_and_row_version [plpgsql]
CREATE OR REPLACE FUNCTION app.set_updated_at_and_row_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  if row(new.*) is distinct from row(old.*) then
    new.row_version = old.row_version + 1;
  end if;
  return new;
end;
$$
;

-- app.sync_case_hub_organizations [plpgsql]
CREATE OR REPLACE FUNCTION app.sync_case_hub_organizations(target_hub uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  hub_row record;
begin
  select id, case_id, organization_id, lifecycle_status
    into hub_row
  from public.case_hubs
  where id = target_hub;

  if not found then
    return;
  end if;

  -- 허브가 비활성이면 모든 bridge row를 unlinked 처리
  if hub_row.lifecycle_status <> 'active' then
    update public.case_hub_organizations
       set status = 'unlinked',
           unlinked_at = coalesce(unlinked_at, now()),
           updated_at  = now()
     where hub_id = target_hub
       and status <> 'unlinked';
    return;
  end if;

  -- case_organizations → case_hub_organizations upsert (role별 1행)
  insert into public.case_hub_organizations (
    hub_id,
    organization_id,
    source_case_organization_id,
    hub_role,
    access_scope,
    status,
    linked_at,
    unlinked_at,
    created_by,
    updated_by
  )
  select
    target_hub,
    co.organization_id,
    co.id,
    co.role,
    co.access_scope,
    'active',
    coalesce(co.updated_at, co.created_at, now()),
    null,
    co.created_by,
    co.updated_by
  from public.case_organizations co
  where co.case_id = hub_row.case_id
    and co.status = 'active'
  on conflict (hub_id, organization_id, hub_role) do update
    set source_case_organization_id = excluded.source_case_organization_id,
        access_scope  = excluded.access_scope,
        status        = 'active',
        unlinked_at   = null,
        updated_by    = coalesce(excluded.updated_by, case_hub_organizations.updated_by),
        updated_at    = now();

  -- managing_org가 case_organizations에 없으면 bridge에서도 보장
  insert into public.case_hub_organizations (
    hub_id,
    organization_id,
    source_case_organization_id,
    hub_role,
    access_scope,
    status,
    linked_at,
    unlinked_at
  )
  values (
    target_hub,
    hub_row.organization_id,
    null,
    'managing_org',
    'full',
    'active',
    now(),
    null
  )
  on conflict (hub_id, organization_id, hub_role) do update
    set access_scope  = 'full',
        status        = 'active',
        unlinked_at   = null,
        updated_at    = now();

  -- 더 이상 case_organizations에 없는 조직 row → unlinked 처리
  -- (managing_org row는 case_hubs.organization_id 기준이므로 제외)
  update public.case_hub_organizations cho
     set status      = 'unlinked',
         unlinked_at = coalesce(cho.unlinked_at, now()),
         updated_at  = now()
   where cho.hub_id = target_hub
     and cho.organization_id <> hub_row.organization_id
     and cho.status <> 'unlinked'
     and not exists (
       select 1
       from public.case_organizations co
       where co.case_id  = hub_row.case_id
         and co.organization_id = cho.organization_id
         and co.role     = cho.hub_role
         and co.status   = 'active'
     );
end;
$$
;

-- app.sync_case_hub_organizations_for_case [plpgsql]
CREATE OR REPLACE FUNCTION app.sync_case_hub_organizations_for_case(target_case uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  hub_item record;
begin
  for hub_item in
    select id
    from public.case_hubs
    where case_id = target_case
  loop
    perform app.sync_case_hub_organizations(hub_item.id);
  end loop;
end;
$$
;

-- app.sync_case_hub_primary_case_client [plpgsql]
CREATE OR REPLACE FUNCTION app.sync_case_hub_primary_case_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  matched_case_client_id uuid;
  matched_profile_id uuid;
  matched_case_client record;
begin
  if new.primary_case_client_id is null and new.primary_client_id is not null then
    select cc.id
      into matched_case_client_id
      from public.case_clients cc
     where cc.case_id = new.case_id
       and cc.profile_id = new.primary_client_id
       and cc.link_status in ('linked', 'pending_unlink')
     order by cc.created_at asc, cc.id asc
     limit 1;

    new.primary_case_client_id := matched_case_client_id;
  end if;

  if new.primary_case_client_id is not null then
    select cc.id, cc.case_id, cc.profile_id, cc.link_status
      into matched_case_client
      from public.case_clients cc
     where cc.id = new.primary_case_client_id;

    if matched_case_client.id is null then
      raise exception '대표 의뢰인 연결을 찾을 수 없습니다.';
    end if;

    if matched_case_client.case_id <> new.case_id then
      raise exception '대표 의뢰인은 같은 사건의 case_clients row여야 합니다.';
    end if;

    if matched_case_client.link_status not in ('linked', 'pending_unlink') then
      raise exception '대표 의뢰인은 linked 또는 pending_unlink 상태여야 합니다.';
    end if;

    matched_profile_id := matched_case_client.profile_id;
    if matched_profile_id is not null then
      new.primary_client_id := matched_profile_id;
    end if;
  end if;

  return new;
end;
$$
;

-- app.sync_notification_model [plpgsql]
CREATE OR REPLACE FUNCTION app.sync_notification_model()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  -- derive canonical fields from legacy fields when missing
  if new.notification_type is null or btrim(new.notification_type) = '' then
    new.notification_type := coalesce(new.kind::text, 'generic');
  end if;

  if new.entity_type is null or btrim(new.entity_type) = '' then
    new.entity_type := case
      when new.action_entity_type in ('case', 'case_document') then 'case'
      when new.action_entity_type = 'schedule' or new.kind = 'schedule_due' then 'schedule'
      when new.action_entity_type = 'client' then 'client'
      else 'collaboration'
    end;
  end if;

  if new.entity_id is null then
    new.entity_id := coalesce(new.action_target_id::text, new.case_id::text);
  end if;

  if new.priority is null or btrim(new.priority) = '' then
    new.priority := case when new.requires_action = true then 'urgent' else 'normal' end;
  end if;

  if new.destination_type is null or btrim(new.destination_type) = '' then
    new.destination_type := 'internal_route';
  end if;

  if new.destination_url is null or btrim(new.destination_url) = '' then
    new.destination_url := coalesce(new.action_href, case when new.case_id is not null then '/cases/' || new.case_id::text else '/dashboard' end);
  end if;

  if new.destination_params is null then
    new.destination_params := '{}'::jsonb;
  end if;

  if tg_op = 'INSERT' then
    if new.status is null or btrim(new.status) = '' then
      if new.deleted_at is not null then
        new.status := 'deleted';
      elsif new.trashed_at is not null then
        new.status := 'archived';
      elsif new.resolved_at is not null then
        new.status := 'resolved';
      elsif new.read_at is not null then
        new.status := 'read';
      else
        new.status := 'active';
      end if;
    end if;
  else
    -- allowed transitions only
    if old.status <> new.status then
      if not (
        (old.status = 'active' and new.status in ('read', 'resolved')) or
        (old.status = 'read' and new.status = 'resolved') or
        (old.status = 'resolved' and new.status = 'archived') or
        (old.status = 'archived' and new.status = 'deleted')
      ) then
        raise exception 'invalid notification status transition: % -> %', old.status, new.status;
      end if;
    end if;
  end if;

  -- synchronize legacy timestamps
  if new.status = 'read' and new.read_at is null then
    new.read_at := now();
  end if;

  if new.status = 'resolved' and new.resolved_at is null then
    new.resolved_at := now();
  end if;

  if new.status = 'archived' then
    if new.trashed_at is null then
      new.trashed_at := now();
    end if;
    if new.archived_at is null then
      new.archived_at := now();
    end if;
  end if;

  if new.status = 'deleted' and new.deleted_at is null then
    new.deleted_at := now();
  end if;

  return new;
end;
$$
;

-- app.sync_platform_runtime_registry [plpgsql]
CREATE OR REPLACE FUNCTION app.sync_platform_runtime_registry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  perform app.assert_valid_platform_organization(new.platform_organization_id);

  update public.organizations
  set kind = 'platform_management'
  where id = new.platform_organization_id
    and kind <> 'platform_management';

  update public.organizations
  set is_platform_root = (id = new.platform_organization_id)
  where is_platform_root is distinct from (id = new.platform_organization_id);

  return new;
end;
$$
;

-- audit.capture_row_change [plpgsql]
CREATE OR REPLACE FUNCTION audit.capture_row_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
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
$$
;

-- public.create_case_atomic [plpgsql]
CREATE OR REPLACE FUNCTION public.create_case_atomic(p_organization_id uuid, p_reference_no text, p_title text, p_case_type text, p_stage_template_key text, p_stage_key text, p_module_flags jsonb, p_principal_amount numeric, p_opened_on date, p_court_name text, p_case_number text, p_summary text, p_actor_id uuid, p_actor_name text, p_can_manage_collection boolean, p_insolvency_subtype text DEFAULT NULL::text, p_client_name text DEFAULT NULL::text, p_client_role text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
declare
  v_case_id uuid;
begin
  insert into public.cases (
    organization_id, reference_no, title, case_type, case_status,
    stage_template_key, stage_key, module_flags, principal_amount,
    opened_on, court_name, case_number, summary,
    insolvency_subtype,
    created_by, updated_by
  ) values (
    p_organization_id, p_reference_no, p_title, p_case_type::public.case_type, 'intake',
    p_stage_template_key, p_stage_key, p_module_flags, p_principal_amount,
    p_opened_on, p_court_name, p_case_number, p_summary,
    nullif(p_insolvency_subtype, '')::public.insolvency_subtype,
    p_actor_id, p_actor_id
  )
  returning id into v_case_id;

  insert into public.case_handlers (
    organization_id, case_id, profile_id, handler_name, role,
    created_by, updated_by
  ) values (
    p_organization_id, v_case_id, p_actor_id, coalesce(p_actor_name, '담당자'), 'case_manager',
    p_actor_id, p_actor_id
  );

  insert into public.case_organizations (
    organization_id, case_id, role, status, access_scope, billing_scope,
    communication_scope, is_lead, can_submit_legal_requests,
    can_receive_legal_requests, can_manage_collection, can_view_client_messages,
    created_by, updated_by
  ) values (
    p_organization_id, v_case_id, 'managing_org', 'active', 'full',
    'direct_client_billing', 'client_visible', true, true, true,
    p_can_manage_collection, true, p_actor_id, p_actor_id
  );

  if p_client_name is not null and length(btrim(p_client_name)) > 0 then
    insert into public.case_clients (
      organization_id, case_id, client_name, relation_label,
      is_portal_enabled, link_status,
      created_by, updated_by
    ) values (
      p_organization_id, v_case_id, btrim(p_client_name),
      coalesce(nullif(btrim(p_client_role), ''), '의뢰인'),
      false, 'linked',
      p_actor_id, p_actor_id
    );
  end if;

  return v_case_id;
end;
$$
;

-- public.touch_org_exit_requests_updated_at [plpgsql]
CREATE OR REPLACE FUNCTION public.touch_org_exit_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$
;

-- app.can_access_case [sql]
CREATE OR REPLACE FUNCTION app.can_access_case(target_case uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (SELECT
    app.is_platform_admin()
    OR app.is_case_client(target_case)
    OR EXISTS (
      SELECT 1
      FROM public.cases c
      JOIN public.organization_memberships om
        ON om.organization_id = c.organization_id
       AND om.profile_id = auth.uid()
       AND om.status = 'active'
      WHERE c.id = target_case
        AND (
          om.role IN ('org_owner', 'org_manager')
          OR COALESCE(om.case_scope_policy, 'assigned_cases_only') = 'all_org_cases'
          OR EXISTS (
            SELECT 1
            FROM public.case_handlers ch
            WHERE ch.case_id = target_case
              AND ch.profile_id = auth.uid()
          )
        )
    ));
end;
$$
;

-- app.can_view_case [sql]
CREATE OR REPLACE FUNCTION app.can_view_case(target_case uuid, target_org uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select app.is_platform_admin()
      or app.is_org_staff(target_org)
      or app.is_case_client(target_case));
end;
$$
;

-- app.can_view_case_billing [sql]
CREATE OR REPLACE FUNCTION app.can_view_case_billing(target_case uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select (
    app.is_platform_admin()
    or exists (
      select 1
      from public.case_organizations co
      join public.organization_memberships om
        on om.organization_id = co.organization_id
       and om.profile_id = auth.uid()
       and om.status = 'active'
      where co.case_id = target_case
        and co.status = 'active'
        and co.billing_scope <> 'none'
        and app.has_permission(co.organization_id, 'billing_view')
    )
    or exists (
      select 1
      from public.case_clients cc
      where cc.case_id = target_case
        and cc.profile_id = auth.uid()
        and cc.is_portal_enabled = true
    )
  ));
end;
$$
;

-- app.case_has_module [sql]
CREATE OR REPLACE FUNCTION app.case_has_module(target_case uuid, module_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select coalesce(
    (select (c.module_flags ->> module_key)::boolean from public.cases c where c.id = target_case),
    false
  ));
end;
$$
;

-- app.current_platform_organization_id [sql]
CREATE OR REPLACE FUNCTION app.current_platform_organization_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select prs.platform_organization_id
  from public.platform_runtime_settings prs
  where prs.singleton = true
  limit 1);
end;
$$
;

-- app.default_stage_template [sql]
CREATE OR REPLACE FUNCTION app.default_stage_template(case_type_value case_type)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $$
begin
  return (select case
    when case_type_value = 'debt_collection' then 'collection-default'
    when case_type_value = 'civil' then 'civil-default'
    when case_type_value = 'criminal' then 'criminal-default'
    else 'general-default'
  end);
end;
$$
;

-- app.has_permission [sql]
CREATE OR REPLACE FUNCTION app.has_permission(target_org uuid, permission_key text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (with membership as (
    select id, role, permissions, permission_template_key
    from public.organization_memberships
    where organization_id = target_org
      and profile_id = auth.uid()
      and status = 'active'
    limit 1
  ),
  template_match as (
    select exists (
      select 1
      from membership m
      join public.permission_template_items pti
        on pti.template_key = m.permission_template_key
      where pti.permission_key = $2
    ) as allowed
  ),
  override_match as (
    select o.effect
    from membership m
    join public.organization_membership_permission_overrides o
      on o.organization_membership_id = m.id
    where o.permission_key = $2
    limit 1
  )
  select case
    when app.is_platform_admin() then true
    when exists (select 1 from membership where role = 'org_owner') then true
    when exists (select 1 from override_match where effect = 'deny') then false
    when exists (select 1 from override_match where effect = 'grant') then true
    when exists (
      select 1
      from membership
      where permissions ? $2
    ) then coalesce(
      (
        select (permissions ->> $2)::boolean
        from membership
      ),
      false
    )
    else coalesce((select allowed from template_match), false)
  end);
end;
$$
;

-- app.has_platform_admin_scenario_access [sql]
CREATE OR REPLACE FUNCTION app.has_platform_admin_scenario_access(target_profile uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select false);
end;
$$
;

-- app.has_platform_admin_security_access [sql]
CREATE OR REPLACE FUNCTION app.has_platform_admin_security_access(target_profile uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select app.is_platform_admin());
end;
$$
;

-- app.is_case_client [sql]
CREATE OR REPLACE FUNCTION app.is_case_client(target_case uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select exists (
    select 1
    from public.case_clients c
    where c.case_id = target_case
      and c.profile_id = auth.uid()
      and c.is_portal_enabled = true
  ));
end;
$$
;

-- app.is_case_hub_org_member [sql]
CREATE OR REPLACE FUNCTION app.is_case_hub_org_member(target_hub uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select exists (
    select 1
    from public.case_hub_organizations cho
    join public.organization_memberships om
      on om.organization_id = cho.organization_id
     and om.profile_id = auth.uid()
     and om.status = 'active'
    where cho.hub_id = target_hub
      and cho.status = 'active'
  ));
end;
$$
;

-- app.is_case_org_member [sql]
CREATE OR REPLACE FUNCTION app.is_case_org_member(target_case uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select exists (
    select 1
    from public.case_organizations co
    join public.organization_memberships om
      on om.organization_id = co.organization_id
     and om.profile_id = auth.uid()
     and om.status = 'active'
    where co.case_id = target_case
      and co.status = 'active'
  ));
end;
$$
;

-- app.is_platform_admin_profile [sql]
CREATE OR REPLACE FUNCTION app.is_platform_admin_profile(target_profile uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select exists (
    select 1
    from public.profiles p
    where p.id = target_profile
      and p.platform_role = 'platform_admin'
      and p.is_active = true
  ));
end;
$$
;

-- app.setting_write_allowed [sql]
CREATE OR REPLACE FUNCTION app.setting_write_allowed(target_key text, target_org uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $$
begin
  return (select exists (
    select 1
    from public.setting_catalog c
    where c.key = target_key
      and (
        app.is_platform_admin() and c.editable_by_platform_admin = true
        or (
          target_org is not null
          and app.is_org_manager(target_org)
          and c.editable_by_org_admin = true
        )
      )
  ));
end;
$$
;

-- public.approve_organization_signup_request_atomic [sql]
CREATE OR REPLACE FUNCTION public.approve_organization_signup_request_atomic(p_request_id uuid, p_reviewer_profile_id uuid, p_review_note text DEFAULT NULL::text)
 RETURNS TABLE(organization_id uuid, request_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  return query select *
      from app.approve_organization_signup_request_atomic(
        p_request_id,
        p_reviewer_profile_id,
        p_review_note
      );
end;
$$
;

-- public.cancel_organization_signup_request_atomic [sql]
CREATE OR REPLACE FUNCTION public.cancel_organization_signup_request_atomic(p_request_id uuid)
 RETURNS organization_signup_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
begin
  return (select *
      from app.cancel_organization_signup_request_atomic(p_request_id));
end;
$$
;
