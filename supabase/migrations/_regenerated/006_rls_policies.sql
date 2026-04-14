-- ============================================================
-- 006_rls_policies.sql
-- Regenerated squash — Batch 6: RLS enable + policies
-- Requires: tables (Batch 2) + functions (Batch 4) exist.
-- ============================================================

-- Enable RLS on all policied tables
alter table audit.change_log enable row level security;
alter table public.billing_entries enable row level security;
alter table public.billing_subscription_events enable row level security;
alter table public.case_clients enable row level security;
alter table public.case_document_reviews enable row level security;
alter table public.case_documents enable row level security;
alter table public.case_handlers enable row level security;
alter table public.case_hub_activity enable row level security;
alter table public.case_hub_members enable row level security;
alter table public.case_hub_organizations enable row level security;
alter table public.case_hubs enable row level security;
alter table public.case_messages enable row level security;
alter table public.case_module_catalog enable row level security;
alter table public.case_organizations enable row level security;
alter table public.case_parties enable row level security;
alter table public.case_party_private_profiles enable row level security;
alter table public.case_recovery_activities enable row level security;
alter table public.case_request_attachments enable row level security;
alter table public.case_requests enable row level security;
alter table public.case_schedules enable row level security;
alter table public.case_stage_template_steps enable row level security;
alter table public.case_stage_templates enable row level security;
alter table public.case_type_default_modules enable row level security;
alter table public.cases enable row level security;
alter table public.client_access_requests enable row level security;
alter table public.client_private_profiles enable row level security;
alter table public.client_service_requests enable row level security;
alter table public.client_temp_credentials enable row level security;
alter table public.collection_compensation_entries enable row level security;
alter table public.collection_compensation_plan_versions enable row level security;
alter table public.collection_compensation_plans enable row level security;
alter table public.collection_payouts enable row level security;
alter table public.collection_performance_daily enable row level security;
alter table public.content_resources enable row level security;
alter table public.document_ingestion_jobs enable row level security;
alter table public.feature_flags enable row level security;
alter table public.fee_agreements enable row level security;
alter table public.insolvency_client_action_items enable row level security;
alter table public.insolvency_client_action_packets enable row level security;
alter table public.insolvency_collaterals enable row level security;
alter table public.insolvency_creditor_addresses enable row level security;
alter table public.insolvency_creditors enable row level security;
alter table public.insolvency_filing_bundles enable row level security;
alter table public.insolvency_priority_claims enable row level security;
alter table public.insolvency_repayment_allocations enable row level security;
alter table public.insolvency_repayment_plans enable row level security;
alter table public.insolvency_ruleset_constants enable row level security;
alter table public.invitations enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoices enable row level security;
alter table public.kakao_notification_outbox enable row level security;
alter table public.member_private_profiles enable row level security;
alter table public.notification_channel_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.org_settlement_entries enable row level security;
alter table public.organization_collaboration_case_shares enable row level security;
alter table public.organization_collaboration_hubs enable row level security;
alter table public.organization_collaboration_messages enable row level security;
alter table public.organization_collaboration_reads enable row level security;
alter table public.organization_collaboration_requests enable row level security;
alter table public.organization_exit_requests enable row level security;
alter table public.organization_membership_permission_overrides enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_relations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_signup_requests enable row level security;
alter table public.organization_staff_temp_credentials enable row level security;
alter table public.organization_subscription_states enable row level security;
alter table public.organizations enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payments enable row level security;
alter table public.permission_template_items enable row level security;
alter table public.permission_templates enable row level security;
alter table public.platform_runtime_settings enable row level security;
alter table public.platform_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.rehabilitation_affidavits enable row level security;
alter table public.rehabilitation_applications enable row level security;
alter table public.rehabilitation_creditor_settings enable row level security;
alter table public.rehabilitation_creditors enable row level security;
alter table public.rehabilitation_family_members enable row level security;
alter table public.rehabilitation_income_settings enable row level security;
alter table public.rehabilitation_plan_sections enable row level security;
alter table public.rehabilitation_prohibition_orders enable row level security;
alter table public.rehabilitation_properties enable row level security;
alter table public.rehabilitation_property_deductions enable row level security;
alter table public.rehabilitation_secured_properties enable row level security;
alter table public.setting_catalog enable row level security;
alter table public.setting_change_logs enable row level security;
alter table public.support_access_requests enable row level security;
alter table storage.objects enable row level security;

drop policy if exists audit_select on audit.change_log;
create policy audit_select on audit.change_log for select to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists billing_entries_select on public.billing_entries;
create policy billing_entries_select on public.billing_entries for select to authenticated using (app.can_view_case_billing(case_id));

drop policy if exists billing_entries_write on public.billing_entries;
create policy billing_entries_write on public.billing_entries for all to authenticated using ((app.is_platform_admin() OR ((billing_owner_case_organization_id IS NOT NULL) AND app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = billing_entries.billing_owner_case_organization_id)), 'billing_issue'::text)))) with check ((app.is_platform_admin() OR ((billing_owner_case_organization_id IS NOT NULL) AND app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = billing_entries.billing_owner_case_organization_id)), 'billing_issue'::text))));

drop policy if exists billing_subscription_events_manage on public.billing_subscription_events;
create policy billing_subscription_events_manage on public.billing_subscription_events for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists billing_subscription_events_select on public.billing_subscription_events;
create policy billing_subscription_events_select on public.billing_subscription_events for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists case_clients_read on public.case_clients;
create policy case_clients_read on public.case_clients for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (profile_id = auth.uid())));

drop policy if exists case_clients_write on public.case_clients;
create policy case_clients_write on public.case_clients for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_document_reviews_case_access on public.case_document_reviews;
create policy case_document_reviews_case_access on public.case_document_reviews for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_documents_read on public.case_documents;
create policy case_documents_read on public.case_documents for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))));

drop policy if exists case_documents_write on public.case_documents;
create policy case_documents_write on public.case_documents for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_handlers_case_access on public.case_handlers;
create policy case_handlers_case_access on public.case_handlers for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_hub_activity_org_select on public.case_hub_activity;
create policy case_hub_activity_org_select on public.case_hub_activity for select to authenticated using ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)));

drop policy if exists case_hub_activity_service_role_all on public.case_hub_activity;
create policy case_hub_activity_service_role_all on public.case_hub_activity for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists case_hub_members_org_select on public.case_hub_members;
create policy case_hub_members_org_select on public.case_hub_members for select to authenticated using ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)));

drop policy if exists case_hub_members_service_role_all on public.case_hub_members;
create policy case_hub_members_service_role_all on public.case_hub_members for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists case_hub_organizations_select on public.case_hub_organizations;
create policy case_hub_organizations_select on public.case_hub_organizations for select to authenticated using ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)));

drop policy if exists case_hub_organizations_service_role_all on public.case_hub_organizations;
create policy case_hub_organizations_service_role_all on public.case_hub_organizations for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists case_hubs_org_member_select on public.case_hubs;
create policy case_hubs_org_member_select on public.case_hubs for select to authenticated using ((app.is_platform_admin() OR app.is_case_hub_org_member(id)));

drop policy if exists case_hubs_service_role_all on public.case_hubs;
create policy case_hubs_service_role_all on public.case_hubs for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists case_messages_insert on public.case_messages;
create policy case_messages_insert on public.case_messages for insert to authenticated with check (((sender_profile_id = auth.uid()) AND ((app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (is_internal = false)))));

drop policy if exists case_messages_read on public.case_messages;
create policy case_messages_read on public.case_messages for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (is_internal = false))));

drop policy if exists case_module_catalog_select on public.case_module_catalog;
create policy case_module_catalog_select on public.case_module_catalog for select to authenticated using (true);

drop policy if exists case_module_catalog_write on public.case_module_catalog;
create policy case_module_catalog_write on public.case_module_catalog for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists case_organizations_read on public.case_organizations;
create policy case_organizations_read on public.case_organizations for select to authenticated using ((app.is_platform_admin() OR app.can_access_case(case_id)));

drop policy if exists case_organizations_write on public.case_organizations;
create policy case_organizations_write on public.case_organizations for all to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists case_parties_case_access on public.case_parties;
create policy case_parties_case_access on public.case_parties for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_party_private_select on public.case_party_private_profiles;
create policy case_party_private_select on public.case_party_private_profiles for select to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists case_party_private_write on public.case_party_private_profiles;
create policy case_party_private_write on public.case_party_private_profiles for all to authenticated using (app.is_org_staff(organization_id)) with check (app.is_org_staff(organization_id));

drop policy if exists case_recovery_read on public.case_recovery_activities;
create policy case_recovery_read on public.case_recovery_activities for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))));

drop policy if exists case_recovery_write on public.case_recovery_activities;
create policy case_recovery_write on public.case_recovery_activities for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_request_attachments_insert on public.case_request_attachments;
create policy case_request_attachments_insert on public.case_request_attachments for insert to authenticated with check ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM case_requests r
  WHERE ((r.id = case_request_attachments.case_request_id) AND ((app.can_access_case(r.case_id) AND (NOT app.is_case_client(r.case_id))) OR (app.is_case_client(r.case_id) AND (r.client_visible = true))))))));

drop policy if exists case_request_attachments_read on public.case_request_attachments;
create policy case_request_attachments_read on public.case_request_attachments for select to authenticated using ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM case_requests r
  WHERE ((r.id = case_request_attachments.case_request_id) AND ((app.can_access_case(r.case_id) AND (NOT app.is_case_client(r.case_id))) OR (app.is_case_client(r.case_id) AND (r.client_visible = true))))))));

drop policy if exists case_requests_insert on public.case_requests;
create policy case_requests_insert on public.case_requests for insert to authenticated with check (((created_by = auth.uid()) AND ((app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (client_visible = true)))));

drop policy if exists case_requests_read on public.case_requests;
create policy case_requests_read on public.case_requests for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (client_visible = true))));

drop policy if exists case_requests_update on public.case_requests;
create policy case_requests_update on public.case_requests for update to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists case_schedules_read on public.case_schedules;
create policy case_schedules_read on public.case_schedules for select to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))));

drop policy if exists case_schedules_write on public.case_schedules;
create policy case_schedules_write on public.case_schedules for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists stage_template_steps_select on public.case_stage_template_steps;
create policy stage_template_steps_select on public.case_stage_template_steps for select to authenticated using ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND ((t.organization_id IS NULL) OR app.is_org_member(t.organization_id))))));

drop policy if exists stage_template_steps_write on public.case_stage_template_steps;
create policy stage_template_steps_write on public.case_stage_template_steps for all to authenticated using ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND (app.is_platform_admin() OR app.is_org_manager(t.organization_id)))))) with check ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND (app.is_platform_admin() OR app.is_org_manager(t.organization_id))))));

drop policy if exists stage_templates_select on public.case_stage_templates;
create policy stage_templates_select on public.case_stage_templates for select to authenticated using (((organization_id IS NULL) OR app.is_org_member(organization_id)));

drop policy if exists stage_templates_write on public.case_stage_templates;
create policy stage_templates_write on public.case_stage_templates for all to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists case_type_default_modules_select on public.case_type_default_modules;
create policy case_type_default_modules_select on public.case_type_default_modules for select to authenticated using (true);

drop policy if exists case_type_default_modules_write on public.case_type_default_modules;
create policy case_type_default_modules_write on public.case_type_default_modules for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists cases_insert on public.cases;
create policy cases_insert on public.cases for insert to authenticated with check ((app.is_org_staff(organization_id) AND (created_by = auth.uid())));

drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases for select to authenticated using (app.can_view_case(id, organization_id));

drop policy if exists cases_update on public.cases;
create policy cases_update on public.cases for update to authenticated using (app.is_org_staff(organization_id)) with check (app.is_org_staff(organization_id));

drop policy if exists client_access_requests_insert on public.client_access_requests;
create policy client_access_requests_insert on public.client_access_requests for insert to authenticated with check ((requester_profile_id = auth.uid()));

drop policy if exists client_access_requests_select on public.client_access_requests;
create policy client_access_requests_select on public.client_access_requests for select to authenticated using ((app.is_platform_admin() OR (requester_profile_id = auth.uid()) OR app.is_org_manager(target_organization_id)));

drop policy if exists client_access_requests_update on public.client_access_requests;
create policy client_access_requests_update on public.client_access_requests for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(target_organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(target_organization_id)));

drop policy if exists client_private_profiles_insert on public.client_private_profiles;
create policy client_private_profiles_insert on public.client_private_profiles for insert to authenticated with check (((profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists client_private_profiles_select on public.client_private_profiles;
create policy client_private_profiles_select on public.client_private_profiles for select to authenticated using (((profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists client_private_profiles_update on public.client_private_profiles;
create policy client_private_profiles_update on public.client_private_profiles for update to authenticated using (((profile_id = auth.uid()) OR app.is_platform_admin())) with check (((profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists client_service_requests_insert on public.client_service_requests;
create policy client_service_requests_insert on public.client_service_requests for insert to authenticated with check (((profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists client_service_requests_select on public.client_service_requests;
create policy client_service_requests_select on public.client_service_requests for select to authenticated using (((profile_id = auth.uid()) OR app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));

drop policy if exists client_service_requests_update on public.client_service_requests;
create policy client_service_requests_update on public.client_service_requests for update to authenticated using ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id)))) with check ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));

drop policy if exists client_temp_credentials_org_manager_select on public.client_temp_credentials;
create policy client_temp_credentials_org_manager_select on public.client_temp_credentials for select to authenticated using (((organization_id IS NOT NULL) AND app.is_org_manager(organization_id)));

drop policy if exists client_temp_credentials_self_select on public.client_temp_credentials;
create policy client_temp_credentials_self_select on public.client_temp_credentials for select to authenticated using ((profile_id = auth.uid()));

drop policy if exists comp_entries_select on public.collection_compensation_entries;
create policy comp_entries_select on public.collection_compensation_entries for select to authenticated using ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.is_org_member(co.organization_id))))));

drop policy if exists comp_entries_write on public.collection_compensation_entries;
create policy comp_entries_write on public.collection_compensation_entries for all to authenticated using ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_manage_plan'::text)))))) with check ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_manage_plan'::text))))));

drop policy if exists comp_plan_versions_select on public.collection_compensation_plan_versions;
create policy comp_plan_versions_select on public.collection_compensation_plan_versions for select to authenticated using ((EXISTS ( SELECT 1
   FROM collection_compensation_plans p
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
           FROM case_organizations
          WHERE (case_organizations.id = p.collection_org_case_organization_id))))))));

drop policy if exists comp_plan_versions_write on public.collection_compensation_plan_versions;
create policy comp_plan_versions_write on public.collection_compensation_plan_versions for all to authenticated using ((EXISTS ( SELECT 1
   FROM (collection_compensation_plans p
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_fix_plan'::text)))))) with check ((EXISTS ( SELECT 1
   FROM (collection_compensation_plans p
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_fix_plan'::text))))));

drop policy if exists comp_plans_select on public.collection_compensation_plans;
create policy comp_plans_select on public.collection_compensation_plans for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)))));

drop policy if exists comp_plans_write on public.collection_compensation_plans;
create policy comp_plans_write on public.collection_compensation_plans for all to authenticated using ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)), 'collection_compensation_manage_plan'::text))) with check ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)), 'collection_compensation_manage_plan'::text)));

drop policy if exists comp_payouts_select on public.collection_payouts;
create policy comp_payouts_select on public.collection_payouts for select to authenticated using ((EXISTS ( SELECT 1
   FROM collection_compensation_entries e
  WHERE (e.id = collection_payouts.collection_compensation_entry_id))));

drop policy if exists comp_payouts_write on public.collection_payouts;
create policy comp_payouts_write on public.collection_payouts for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists performance_daily_select on public.collection_performance_daily;
create policy performance_daily_select on public.collection_performance_daily for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_performance_daily.collection_org_case_organization_id)))));

drop policy if exists performance_daily_write on public.collection_performance_daily;
create policy performance_daily_write on public.collection_performance_daily for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists content_resources_select on public.content_resources;
create policy content_resources_select on public.content_resources for select to authenticated using (((organization_id IS NULL) OR app.is_org_member(organization_id) OR app.is_platform_admin()));

drop policy if exists content_resources_write on public.content_resources;
create policy content_resources_write on public.content_resources for all to authenticated using ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id)))) with check ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));

drop policy if exists ingestion_jobs_insert on public.document_ingestion_jobs;
create policy ingestion_jobs_insert on public.document_ingestion_jobs for insert to authenticated with check (app.is_org_staff(organization_id));

drop policy if exists ingestion_jobs_select on public.document_ingestion_jobs;
create policy ingestion_jobs_select on public.document_ingestion_jobs for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists ingestion_jobs_service_role on public.document_ingestion_jobs;
create policy ingestion_jobs_service_role on public.document_ingestion_jobs for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists ingestion_jobs_update on public.document_ingestion_jobs;
create policy ingestion_jobs_update on public.document_ingestion_jobs for update to authenticated using (app.is_org_staff(organization_id)) with check (app.is_org_staff(organization_id));

drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags for select to authenticated using (((organization_id IS NULL) OR app.is_org_member(organization_id) OR app.is_platform_admin()));

drop policy if exists feature_flags_write on public.feature_flags;
create policy feature_flags_write on public.feature_flags for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists fee_agreements_select on public.fee_agreements;
create policy fee_agreements_select on public.fee_agreements for select to authenticated using (app.can_view_case_billing(case_id));

drop policy if exists fee_agreements_write on public.fee_agreements;
create policy fee_agreements_write on public.fee_agreements for all to authenticated using ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = fee_agreements.billing_owner_case_organization_id)), 'billing_manage'::text))) with check ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = fee_agreements.billing_owner_case_organization_id)), 'billing_manage'::text)));

drop policy if exists action_items_read on public.insolvency_client_action_items;
create policy action_items_read on public.insolvency_client_action_items for select to authenticated using ((app.is_platform_admin() OR app.can_access_case(case_id)));

drop policy if exists action_items_service_role on public.insolvency_client_action_items;
create policy action_items_service_role on public.insolvency_client_action_items for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists action_items_staff_write on public.insolvency_client_action_items;
create policy action_items_staff_write on public.insolvency_client_action_items for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists action_packets_read on public.insolvency_client_action_packets;
create policy action_packets_read on public.insolvency_client_action_packets for select to authenticated using ((app.is_platform_admin() OR app.can_access_case(case_id)));

drop policy if exists action_packets_service_role on public.insolvency_client_action_packets;
create policy action_packets_service_role on public.insolvency_client_action_packets for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists action_packets_write on public.insolvency_client_action_packets;
create policy action_packets_write on public.insolvency_client_action_packets for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists insolvency_collaterals_case_access on public.insolvency_collaterals;
create policy insolvency_collaterals_case_access on public.insolvency_collaterals for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists insolvency_collaterals_service_role on public.insolvency_collaterals;
create policy insolvency_collaterals_service_role on public.insolvency_collaterals for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists insolvency_creditor_addresses_select on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_select on public.insolvency_creditor_addresses for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists insolvency_creditor_addresses_service_role on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_service_role on public.insolvency_creditor_addresses for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists insolvency_creditor_addresses_write on public.insolvency_creditor_addresses;
create policy insolvency_creditor_addresses_write on public.insolvency_creditor_addresses for all to authenticated using (app.is_org_staff(organization_id)) with check (app.is_org_staff(organization_id));

drop policy if exists insolvency_creditors_case_access on public.insolvency_creditors;
create policy insolvency_creditors_case_access on public.insolvency_creditors for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists insolvency_creditors_service_role on public.insolvency_creditors;
create policy insolvency_creditors_service_role on public.insolvency_creditors for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists filing_bundles_case_access on public.insolvency_filing_bundles;
create policy filing_bundles_case_access on public.insolvency_filing_bundles for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists filing_bundles_service_role on public.insolvency_filing_bundles;
create policy filing_bundles_service_role on public.insolvency_filing_bundles for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists priority_claims_case_access on public.insolvency_priority_claims;
create policy priority_claims_case_access on public.insolvency_priority_claims for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists priority_claims_service_role on public.insolvency_priority_claims;
create policy priority_claims_service_role on public.insolvency_priority_claims for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists repayment_allocations_select on public.insolvency_repayment_allocations;
create policy repayment_allocations_select on public.insolvency_repayment_allocations for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists repayment_allocations_service_role on public.insolvency_repayment_allocations;
create policy repayment_allocations_service_role on public.insolvency_repayment_allocations for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists repayment_allocations_write on public.insolvency_repayment_allocations;
create policy repayment_allocations_write on public.insolvency_repayment_allocations for all to authenticated using (app.is_org_staff(organization_id)) with check (app.is_org_staff(organization_id));

drop policy if exists repayment_plans_case_access on public.insolvency_repayment_plans;
create policy repayment_plans_case_access on public.insolvency_repayment_plans for all to authenticated using ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id))))) with check ((app.is_platform_admin() OR (app.can_access_case(case_id) AND (NOT app.is_case_client(case_id)))));

drop policy if exists repayment_plans_service_role on public.insolvency_repayment_plans;
create policy repayment_plans_service_role on public.insolvency_repayment_plans for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists ruleset_constants_select on public.insolvency_ruleset_constants;
create policy ruleset_constants_select on public.insolvency_ruleset_constants for select to authenticated using (true);

drop policy if exists ruleset_constants_write on public.insolvency_ruleset_constants;
create policy ruleset_constants_write on public.insolvency_ruleset_constants for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations for select to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text))));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text)))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text))));

drop policy if exists invoice_items_select on public.invoice_items;
create policy invoice_items_select on public.invoice_items for select to authenticated using ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND app.can_view_case_billing(i.case_id)))));

drop policy if exists invoice_items_write on public.invoice_items;
create policy invoice_items_write on public.invoice_items for all to authenticated using ((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN case_organizations co ON ((co.id = i.billing_owner_case_organization_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_issue'::text)))))) with check ((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN case_organizations co ON ((co.id = i.billing_owner_case_organization_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_issue'::text))))));

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (app.can_view_case_billing(case_id));

drop policy if exists invoices_write on public.invoices;
create policy invoices_write on public.invoices for all to authenticated using ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = invoices.billing_owner_case_organization_id)), 'billing_issue'::text))) with check ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = invoices.billing_owner_case_organization_id)), 'billing_issue'::text)));

drop policy if exists kakao_notification_outbox_select on public.kakao_notification_outbox;
create policy kakao_notification_outbox_select on public.kakao_notification_outbox for select to authenticated using (app.is_platform_admin());

drop policy if exists kakao_notification_outbox_write on public.kakao_notification_outbox;
create policy kakao_notification_outbox_write on public.kakao_notification_outbox for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists member_private_profiles_insert on public.member_private_profiles;
create policy member_private_profiles_insert on public.member_private_profiles for insert to public with check ((profile_id = auth.uid()));

drop policy if exists member_private_profiles_select on public.member_private_profiles;
create policy member_private_profiles_select on public.member_private_profiles for select to public using ((profile_id = auth.uid()));

drop policy if exists member_private_profiles_update on public.member_private_profiles;
create policy member_private_profiles_update on public.member_private_profiles for update to public using ((profile_id = auth.uid())) with check ((profile_id = auth.uid()));

drop policy if exists notification_channel_preferences_insert on public.notification_channel_preferences;
create policy notification_channel_preferences_insert on public.notification_channel_preferences for insert to authenticated with check ((profile_id = auth.uid()));

drop policy if exists notification_channel_preferences_select on public.notification_channel_preferences;
create policy notification_channel_preferences_select on public.notification_channel_preferences for select to authenticated using ((profile_id = auth.uid()));

drop policy if exists notification_channel_preferences_update on public.notification_channel_preferences;
create policy notification_channel_preferences_update on public.notification_channel_preferences for update to authenticated using ((profile_id = auth.uid())) with check ((profile_id = auth.uid()));

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated using (((recipient_profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check ((app.is_platform_admin() OR app.is_org_staff(organization_id)));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (((recipient_profile_id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using ((recipient_profile_id = auth.uid())) with check ((recipient_profile_id = auth.uid()));

drop policy if exists org_settlement_entries_select on public.org_settlement_entries;
create policy org_settlement_entries_select on public.org_settlement_entries for select to authenticated using ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM case_organizations co
  WHERE ((co.id = org_settlement_entries.source_case_organization_id) AND app.is_org_member(co.organization_id)))) OR (EXISTS ( SELECT 1
   FROM case_organizations co
  WHERE ((co.id = org_settlement_entries.target_case_organization_id) AND app.is_org_member(co.organization_id))))));

drop policy if exists org_settlement_entries_write on public.org_settlement_entries;
create policy org_settlement_entries_write on public.org_settlement_entries for all to authenticated using ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = org_settlement_entries.source_case_organization_id)), 'settlement_manage'::text))) with check ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = org_settlement_entries.source_case_organization_id)), 'settlement_manage'::text)));

drop policy if exists organization_collaboration_case_shares_select on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_select on public.organization_collaboration_case_shares for select to authenticated using ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_case_shares.hub_id) AND (app.is_org_member(hubs.primary_organization_id) OR app.is_org_member(hubs.partner_organization_id)))))));

drop policy if exists organization_collaboration_case_shares_write on public.organization_collaboration_case_shares;
create policy organization_collaboration_case_shares_write on public.organization_collaboration_case_shares for all to authenticated using ((app.is_platform_admin() OR app.is_org_manager(shared_by_organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(shared_by_organization_id)));

drop policy if exists organization_collaboration_hubs_select on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_select on public.organization_collaboration_hubs for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(primary_organization_id) OR app.is_org_member(partner_organization_id)));

drop policy if exists organization_collaboration_hubs_write on public.organization_collaboration_hubs;
create policy organization_collaboration_hubs_write on public.organization_collaboration_hubs for all to authenticated using ((app.is_platform_admin() OR app.is_org_manager(primary_organization_id) OR app.is_org_manager(partner_organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(primary_organization_id) OR app.is_org_manager(partner_organization_id)));

drop policy if exists organization_collaboration_messages_insert on public.organization_collaboration_messages;
create policy organization_collaboration_messages_insert on public.organization_collaboration_messages for insert to authenticated with check (((sender_profile_id = auth.uid()) AND app.is_org_member(organization_id) AND (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_messages.hub_id) AND ((hubs.primary_organization_id = organization_collaboration_messages.organization_id) OR (hubs.partner_organization_id = organization_collaboration_messages.organization_id)))))));

drop policy if exists organization_collaboration_messages_select on public.organization_collaboration_messages;
create policy organization_collaboration_messages_select on public.organization_collaboration_messages for select to authenticated using ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_messages.hub_id) AND (app.is_org_member(hubs.primary_organization_id) OR app.is_org_member(hubs.partner_organization_id)))))));

drop policy if exists organization_collaboration_reads_select on public.organization_collaboration_reads;
create policy organization_collaboration_reads_select on public.organization_collaboration_reads for select to authenticated using ((app.is_platform_admin() OR (profile_id = auth.uid()) OR app.is_org_member(organization_id)));

drop policy if exists organization_collaboration_reads_write on public.organization_collaboration_reads;
create policy organization_collaboration_reads_write on public.organization_collaboration_reads for all to authenticated using ((app.is_platform_admin() OR (profile_id = auth.uid()))) with check ((app.is_platform_admin() OR (profile_id = auth.uid())));

drop policy if exists organization_collaboration_requests_insert on public.organization_collaboration_requests;
create policy organization_collaboration_requests_insert on public.organization_collaboration_requests for insert to authenticated with check (((requested_by_profile_id = auth.uid()) AND app.is_org_manager(source_organization_id)));

drop policy if exists organization_collaboration_requests_select on public.organization_collaboration_requests;
create policy organization_collaboration_requests_select on public.organization_collaboration_requests for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(source_organization_id) OR app.is_org_member(target_organization_id)));

drop policy if exists organization_collaboration_requests_update on public.organization_collaboration_requests;
create policy organization_collaboration_requests_update on public.organization_collaboration_requests for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(source_organization_id) OR app.is_org_manager(target_organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(source_organization_id) OR app.is_org_manager(target_organization_id)));

drop policy if exists organization_exit_requests_insert on public.organization_exit_requests;
create policy organization_exit_requests_insert on public.organization_exit_requests for insert to authenticated with check ((app.is_platform_admin() OR (app.is_org_manager(organization_id) AND (requested_by_profile_id = auth.uid()))));

drop policy if exists organization_exit_requests_select on public.organization_exit_requests;
create policy organization_exit_requests_select on public.organization_exit_requests for select to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (requested_by_profile_id = auth.uid())));

drop policy if exists organization_exit_requests_update on public.organization_exit_requests;
create policy organization_exit_requests_update on public.organization_exit_requests for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists permission_overrides_select on public.organization_membership_permission_overrides;
create policy permission_overrides_select on public.organization_membership_permission_overrides for select to authenticated using ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id) OR (om.profile_id = auth.uid()))))));

drop policy if exists permission_overrides_write on public.organization_membership_permission_overrides;
create policy permission_overrides_write on public.organization_membership_permission_overrides for all to authenticated using ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id)))))) with check ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id))))));

drop policy if exists memberships_delete on public.organization_memberships;
create policy memberships_delete on public.organization_memberships for delete to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists memberships_insert on public.organization_memberships;
create policy memberships_insert on public.organization_memberships for insert to authenticated with check ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR ((profile_id = auth.uid()) AND (role = 'org_owner'::membership_role) AND (EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = organization_memberships.organization_id) AND (o.created_by = auth.uid())))))));

drop policy if exists memberships_select on public.organization_memberships;
create policy memberships_select on public.organization_memberships for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists memberships_update on public.organization_memberships;
create policy memberships_update on public.organization_memberships for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists organization_relations_select on public.organization_relations;
create policy organization_relations_select on public.organization_relations for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(source_organization_id) OR app.is_org_member(target_organization_id)));

drop policy if exists organization_relations_write on public.organization_relations;
create policy organization_relations_write on public.organization_relations for all to authenticated using ((app.is_platform_admin() OR app.is_org_manager(source_organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(source_organization_id)));

drop policy if exists organization_settings_select on public.organization_settings;
create policy organization_settings_select on public.organization_settings for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists organization_settings_write on public.organization_settings;
create policy organization_settings_write on public.organization_settings for all to authenticated using (app.setting_write_allowed(key, organization_id)) with check (app.setting_write_allowed(key, organization_id));

drop policy if exists signup_requests_insert on public.organization_signup_requests;
create policy signup_requests_insert on public.organization_signup_requests for insert to authenticated with check ((requester_profile_id = auth.uid()));

drop policy if exists signup_requests_select on public.organization_signup_requests;
create policy signup_requests_select on public.organization_signup_requests for select to authenticated using ((app.is_platform_admin() OR (requester_profile_id = auth.uid())));

drop policy if exists signup_requests_update on public.organization_signup_requests;
create policy signup_requests_update on public.organization_signup_requests for update to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists organization_staff_temp_credentials_org_manager_select on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_org_manager_select on public.organization_staff_temp_credentials for select to authenticated using (app.is_org_manager(organization_id));

drop policy if exists organization_staff_temp_credentials_self_select on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_self_select on public.organization_staff_temp_credentials for select to authenticated using ((profile_id = auth.uid()));

drop policy if exists organization_staff_temp_credentials_self_update on public.organization_staff_temp_credentials;
create policy organization_staff_temp_credentials_self_update on public.organization_staff_temp_credentials for update to authenticated using ((profile_id = auth.uid())) with check ((profile_id = auth.uid()));

drop policy if exists org_subscription_state_manage on public.organization_subscription_states;
create policy org_subscription_state_manage on public.organization_subscription_states for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists org_subscription_state_select on public.organization_subscription_states;
create policy org_subscription_state_select on public.organization_subscription_states for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(organization_id)));

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations for insert to authenticated with check ((created_by = auth.uid()));

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated using ((app.is_platform_admin() OR app.is_org_member(id)));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(id))) with check ((app.is_platform_admin() OR app.is_org_manager(id)));

drop policy if exists payment_allocations_select on public.payment_allocations;
create policy payment_allocations_select on public.payment_allocations for select to authenticated using ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND app.can_view_case_billing(p.case_id)))));

drop policy if exists payment_allocations_write on public.payment_allocations;
create policy payment_allocations_write on public.payment_allocations for all to authenticated using ((EXISTS ( SELECT 1
   FROM (payments p
     JOIN case_organizations co ON ((co.id = p.billing_owner_case_organization_id)))
  WHERE ((p.id = payment_allocations.payment_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_payment_confirm'::text)))))) with check ((EXISTS ( SELECT 1
   FROM (payments p
     JOIN case_organizations co ON ((co.id = p.billing_owner_case_organization_id)))
  WHERE ((p.id = payment_allocations.payment_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_payment_confirm'::text))))));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated using (app.can_view_case_billing(case_id));

drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments for all to authenticated using ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = payments.billing_owner_case_organization_id)), 'billing_payment_confirm'::text))) with check ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = payments.billing_owner_case_organization_id)), 'billing_payment_confirm'::text)));

drop policy if exists permission_template_items_select on public.permission_template_items;
create policy permission_template_items_select on public.permission_template_items for select to authenticated using (true);

drop policy if exists permission_template_items_write on public.permission_template_items;
create policy permission_template_items_write on public.permission_template_items for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists permission_templates_select on public.permission_templates;
create policy permission_templates_select on public.permission_templates for select to authenticated using (true);

drop policy if exists permission_templates_write on public.permission_templates;
create policy permission_templates_write on public.permission_templates for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists platform_runtime_settings_admin_select on public.platform_runtime_settings;
create policy platform_runtime_settings_admin_select on public.platform_runtime_settings for select to authenticated using ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status)))));

drop policy if exists platform_runtime_settings_admin_write on public.platform_runtime_settings;
create policy platform_runtime_settings_admin_write on public.platform_runtime_settings for all to authenticated using ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status))))) with check ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status)))));

drop policy if exists platform_runtime_settings_service_role_all on public.platform_runtime_settings;
create policy platform_runtime_settings_service_role_all on public.platform_runtime_settings for all to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));

drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated using (true);

drop policy if exists platform_settings_write on public.platform_settings;
create policy platform_settings_write on public.platform_settings for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (((id = auth.uid()) OR app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM (organization_memberships current_m
     JOIN organization_memberships target_m ON ((current_m.organization_id = target_m.organization_id)))
  WHERE ((current_m.profile_id = auth.uid()) AND (current_m.status = 'active'::membership_status) AND (target_m.profile_id = profiles.id) AND (target_m.status = 'active'::membership_status))))));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (((id = auth.uid()) OR app.is_platform_admin())) with check (((id = auth.uid()) OR app.is_platform_admin()));

drop policy if exists rehab_affidavit_case_access on public.rehabilitation_affidavits;
create policy rehab_affidavit_case_access on public.rehabilitation_affidavits for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_app_case_access on public.rehabilitation_applications;
create policy rehab_app_case_access on public.rehabilitation_applications for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_cred_settings_case_access on public.rehabilitation_creditor_settings;
create policy rehab_cred_settings_case_access on public.rehabilitation_creditor_settings for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_creditors_case_access on public.rehabilitation_creditors;
create policy rehab_creditors_case_access on public.rehabilitation_creditors for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_family_case_access on public.rehabilitation_family_members;
create policy rehab_family_case_access on public.rehabilitation_family_members for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_income_case_access on public.rehabilitation_income_settings;
create policy rehab_income_case_access on public.rehabilitation_income_settings for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_plan_case_access on public.rehabilitation_plan_sections;
create policy rehab_plan_case_access on public.rehabilitation_plan_sections for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_prohibition_case_access on public.rehabilitation_prohibition_orders;
create policy rehab_prohibition_case_access on public.rehabilitation_prohibition_orders for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_properties_case_access on public.rehabilitation_properties;
create policy rehab_properties_case_access on public.rehabilitation_properties for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_prop_deductions_case_access on public.rehabilitation_property_deductions;
create policy rehab_prop_deductions_case_access on public.rehabilitation_property_deductions for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists rehab_secured_case_access on public.rehabilitation_secured_properties;
create policy rehab_secured_case_access on public.rehabilitation_secured_properties for all to authenticated using (app.can_access_case(case_id)) with check (app.can_access_case(case_id));

drop policy if exists setting_catalog_select on public.setting_catalog;
create policy setting_catalog_select on public.setting_catalog for select to authenticated using (true);

drop policy if exists setting_change_logs_select on public.setting_change_logs;
create policy setting_change_logs_select on public.setting_change_logs for select to authenticated using ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));

drop policy if exists support_requests_insert on public.support_access_requests;
create policy support_requests_insert on public.support_access_requests for insert to authenticated with check ((app.is_platform_admin() AND (requested_by = auth.uid())));

drop policy if exists support_requests_select on public.support_access_requests;
create policy support_requests_select on public.support_access_requests for select to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists support_requests_update on public.support_access_requests;
create policy support_requests_update on public.support_access_requests for update to authenticated using ((app.is_platform_admin() OR app.is_org_manager(organization_id))) with check ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

drop policy if exists case_files_authenticated_select on storage.objects;
create policy case_files_authenticated_select on storage.objects for select to authenticated using (((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND (app.is_org_staff(((storage.foldername(name))[2])::uuid) OR ((array_length(storage.foldername(name), 1) >= 3) AND app.can_access_case(((storage.foldername(name))[3])::uuid)))));

drop policy if exists staff_can_delete_case_files on storage.objects;
create policy staff_can_delete_case_files on storage.objects for delete to authenticated using (((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND app.is_org_staff(((storage.foldername(name))[2])::uuid)));

drop policy if exists staff_can_update_case_files on storage.objects;
create policy staff_can_update_case_files on storage.objects for update to authenticated using (((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND app.is_org_staff(((storage.foldername(name))[2])::uuid))) with check (((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND app.is_org_staff(((storage.foldername(name))[2])::uuid)));

drop policy if exists staff_can_upload_case_files on storage.objects;
create policy staff_can_upload_case_files on storage.objects for insert to authenticated with check (((bucket_id = 'case-files'::text) AND ((storage.foldername(name))[1] = 'org'::text) AND app.is_org_staff(((storage.foldername(name))[2])::uuid)));
