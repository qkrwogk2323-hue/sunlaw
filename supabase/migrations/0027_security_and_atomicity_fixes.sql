do $migration$
begin
  execute $sql$
    create or replace function app.add_case_party_atomic(
      p_organization_id uuid,
      p_case_id uuid,
      p_party_role public.party_role,
      p_entity_type public.entity_type,
      p_display_name text,
      p_company_name text,
      p_registration_number_masked text,
      p_resident_number_last4 text,
      p_phone text,
      p_email citext,
      p_address_summary text,
      p_notes text,
      p_is_primary boolean,
      p_resident_number_ciphertext text,
      p_registration_number_ciphertext text,
      p_address_detail_ciphertext text
    )
    returns uuid
    language plpgsql
    security definer
    set search_path = public
    as $function$
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
    $function$;
  $sql$;

  execute $sql$
    create or replace function app.link_case_client_atomic(
      p_organization_id uuid,
      p_case_id uuid,
      p_case_title text,
      p_target_profile_id uuid,
      p_client_name text,
      p_client_email_snapshot citext,
      p_relation_label text,
      p_portal_enabled boolean,
      p_fee_agreement_title text,
      p_fee_agreement_type public.billing_agreement_type,
      p_fee_agreement_amount numeric,
      p_billing_entry_title text,
      p_billing_entry_amount numeric,
      p_billing_entry_due_on date
    )
    returns table(case_client_id uuid, activated_profile_id uuid)
    language plpgsql
    security definer
    set search_path = public
    as $function$
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
    $function$;
  $sql$;

  execute $sql$
    create or replace function app.create_collection_compensation_plan_atomic(
      p_case_id uuid,
      p_organization_id uuid,
      p_target_kind public.compensation_target_kind,
      p_beneficiary_membership_id uuid,
      p_beneficiary_case_organization_id uuid,
      p_title text,
      p_description text,
      p_settlement_cycle text,
      p_fixed_amount numeric,
      p_rate numeric,
      p_base_metric text,
      p_effective_from date,
      p_rule_json jsonb
    )
    returns uuid
    language plpgsql
    security definer
    set search_path = public
    as $function$
    declare
      v_collection_org_case_organization_id uuid;
      v_plan_id uuid;
    begin
      if not app.is_org_staff(p_organization_id) or not app.has_permission(p_organization_id, 'collection_compensation_manage_plan') then
        raise exception 'insufficient privileges to manage collection compensation plans';
      end if;

      select co.id
      into v_collection_org_case_organization_id
      from public.case_organizations co
      where co.case_id = p_case_id
        and co.organization_id = p_organization_id
        and co.role in ('collection_org', 'managing_org')
      limit 1;

      if v_collection_org_case_organization_id is null then
        raise exception 'collection organization not found';
      end if;

      insert into public.collection_compensation_plans (
        case_id,
        collection_org_case_organization_id,
        target_kind,
        beneficiary_membership_id,
        beneficiary_case_organization_id,
        title,
        description,
        settlement_cycle,
        created_by,
        updated_by
      )
      values (
        p_case_id,
        v_collection_org_case_organization_id,
        p_target_kind,
        p_beneficiary_membership_id,
        p_beneficiary_case_organization_id,
        p_title,
        p_description,
        p_settlement_cycle,
        auth.uid(),
        auth.uid()
      )
      returning id into v_plan_id;

      insert into public.collection_compensation_plan_versions (
        collection_compensation_plan_id,
        status,
        fixed_amount,
        rate,
        base_metric,
        effective_from,
        rule_json
      )
      values (
        v_plan_id,
        'draft',
        p_fixed_amount,
        p_rate,
        p_base_metric,
        p_effective_from,
        coalesce(p_rule_json, '{}'::jsonb)
      );

      return v_plan_id;
    end;
    $function$;
  $sql$;

  execute 'drop policy if exists cases_insert on public.cases';

  execute $sql$
    create policy cases_insert on public.cases
    for insert to authenticated
    with check (
      app.is_org_staff(organization_id)
      and created_by = auth.uid()
      and app.has_permission(organization_id, 'case_create')
    )
  $sql$;

  execute 'drop policy if exists cases_update on public.cases';

  execute $sql$
    create policy cases_update on public.cases
    for update to authenticated
    using (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'case_edit')
        or app.has_permission(organization_id, 'case_stage_manage')
      )
    )
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'case_edit')
        or app.has_permission(organization_id, 'case_stage_manage')
      )
    )
  $sql$;

  execute 'drop policy if exists case_handlers_write on public.case_handlers';

  execute $sql$
    create policy case_handlers_write on public.case_handlers
    for all to authenticated
    using (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'case_create')
        or app.has_permission(organization_id, 'case_assign')
        or app.has_permission(organization_id, 'case_edit')
      )
    )
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'case_create')
        or app.has_permission(organization_id, 'case_assign')
        or app.has_permission(organization_id, 'case_edit')
      )
    )
  $sql$;

  execute 'drop policy if exists case_clients_write on public.case_clients';

  execute $sql$
    create policy case_clients_write on public.case_clients
    for all to authenticated
    using (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
    with check (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
  $sql$;

  execute 'drop policy if exists case_parties_write on public.case_parties';

  execute $sql$
    create policy case_parties_write on public.case_parties
    for all to authenticated
    using (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
    with check (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
  $sql$;

  execute 'drop policy if exists case_party_private_write on public.case_party_private_profiles';

  execute $sql$
    create policy case_party_private_write on public.case_party_private_profiles
    for all to authenticated
    using (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
    with check (app.is_org_staff(organization_id) and app.has_permission(organization_id, 'case_edit'))
  $sql$;

  execute 'drop policy if exists case_documents_write on public.case_documents';

  execute $sql$
    create policy case_documents_write on public.case_documents
    for all to authenticated
    using (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'document_create')
        or app.has_permission(organization_id, 'document_edit')
        or app.has_permission(organization_id, 'document_approve')
      )
    )
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'document_create')
        or app.has_permission(organization_id, 'document_edit')
        or app.has_permission(organization_id, 'document_approve')
      )
    )
  $sql$;

  execute 'drop policy if exists case_document_reviews_insert on public.case_document_reviews';

  execute $sql$
    create policy case_document_reviews_insert on public.case_document_reviews
    for insert to authenticated
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'document_create')
        or app.has_permission(organization_id, 'document_approve')
      )
    )
  $sql$;

  execute 'drop policy if exists case_schedules_write on public.case_schedules';

  execute $sql$
    create policy case_schedules_write on public.case_schedules
    for all to authenticated
    using (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'schedule_create')
        or app.has_permission(organization_id, 'schedule_edit')
        or app.has_permission(organization_id, 'schedule_manage')
        or app.has_permission(organization_id, 'billing_manage')
        or app.has_permission(organization_id, 'case_create')
      )
    )
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'schedule_create')
        or app.has_permission(organization_id, 'schedule_edit')
        or app.has_permission(organization_id, 'schedule_manage')
        or app.has_permission(organization_id, 'billing_manage')
        or app.has_permission(organization_id, 'case_create')
      )
    )
  $sql$;

  execute 'drop policy if exists case_recovery_write on public.case_recovery_activities';

  execute $sql$
    create policy case_recovery_write on public.case_recovery_activities
    for all to authenticated
    using (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'collection_contact_manage')
        or app.has_permission(organization_id, 'collection_manage')
      )
    )
    with check (
      app.is_org_staff(organization_id)
      and (
        app.has_permission(organization_id, 'collection_contact_manage')
        or app.has_permission(organization_id, 'collection_manage')
      )
    )
  $sql$;

  execute 'drop policy if exists case_organizations_write on public.case_organizations';

  execute $sql$
    create policy case_organizations_write on public.case_organizations
    for all to authenticated
    using (
      app.is_platform_admin()
      or exists (
        select 1
        from public.cases c
        where c.id = case_id
          and c.lifecycle_status <> 'soft_deleted'
          and app.is_org_staff(c.organization_id)
          and (
            app.has_permission(c.organization_id, 'case_create')
            or app.has_permission(c.organization_id, 'case_assign')
          )
      )
    )
    with check (
      app.is_platform_admin()
      or exists (
        select 1
        from public.cases c
        where c.id = case_id
          and c.lifecycle_status <> 'soft_deleted'
          and app.is_org_staff(c.organization_id)
          and (
            app.has_permission(c.organization_id, 'case_create')
            or app.has_permission(c.organization_id, 'case_assign')
          )
      )
    )
  $sql$;

  execute 'drop policy if exists billing_entries_write on public.billing_entries';

  execute $sql$
    create policy billing_entries_write on public.billing_entries
    for all to authenticated using (
      app.is_platform_admin()
      or (
        billing_owner_case_organization_id is not null
        and app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
      )
    )
    with check (
      app.is_platform_admin()
      or (
        billing_owner_case_organization_id is not null
        and app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
      )
    )
  $sql$;

  execute 'drop policy if exists fee_agreements_write on public.fee_agreements';

  execute $sql$
    create policy fee_agreements_write on public.fee_agreements
    for all to authenticated using (
      app.is_platform_admin()
      or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
    )
    with check (
      app.is_platform_admin()
      or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
    )
  $sql$;

  execute 'drop policy if exists invoices_write on public.invoices';

  execute $sql$
    create policy invoices_write on public.invoices
    for all to authenticated using (
      app.is_platform_admin()
      or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
    )
    with check (
      app.is_platform_admin()
      or app.has_permission((select organization_id from public.case_organizations where id = billing_owner_case_organization_id), 'billing_manage')
    )
  $sql$;

  execute 'drop policy if exists invoice_items_write on public.invoice_items';

  execute $sql$
    create policy invoice_items_write on public.invoice_items
    for all to authenticated using (
      exists (
        select 1
        from public.invoices i
        join public.case_organizations co on co.id = i.billing_owner_case_organization_id
        where i.id = invoice_id
          and (
            app.is_platform_admin()
            or app.has_permission(co.organization_id, 'billing_manage')
          )
      )
    )
    with check (
      exists (
        select 1
        from public.invoices i
        join public.case_organizations co on co.id = i.billing_owner_case_organization_id
        where i.id = invoice_id
          and (
            app.is_platform_admin()
            or app.has_permission(co.organization_id, 'billing_manage')
          )
      )
    )
  $sql$;

  execute 'drop policy if exists comp_plan_versions_write on public.collection_compensation_plan_versions';

  execute $sql$
    create policy comp_plan_versions_write on public.collection_compensation_plan_versions
    for all to authenticated using (
      exists (
        select 1
        from public.collection_compensation_plans p
        join public.case_organizations co on co.id = p.collection_org_case_organization_id
        where p.id = collection_compensation_plan_id
          and (
            app.is_platform_admin()
            or app.has_permission(co.organization_id, 'collection_compensation_manage_plan')
          )
      )
    )
    with check (
      exists (
        select 1
        from public.collection_compensation_plans p
        join public.case_organizations co on co.id = p.collection_org_case_organization_id
        where p.id = collection_compensation_plan_id
          and (
            app.is_platform_admin()
            or app.has_permission(co.organization_id, 'collection_compensation_manage_plan')
          )
      )
    )
  $sql$;

  insert into public.permission_template_items (template_key, permission_key)
  values
    ('admin_general', 'schedule_manage'),
    ('admin_general', 'billing_manage'),
    ('admin_general', 'collection_manage'),
    ('office_manager', 'schedule_manage'),
    ('office_manager', 'billing_manage')
  on conflict (template_key, permission_key) do nothing;
end;
$migration$;