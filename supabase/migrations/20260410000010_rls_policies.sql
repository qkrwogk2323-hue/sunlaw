-- ===============================================================================
-- 010_rls_policies.sql
-- Row Level Security (RLS) Policies for all tables
-- ===============================================================================

-- SECTION 1: Enable RLS on all tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_handlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hub_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hub_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hub_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_module_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_party_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_recovery_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_stage_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_stage_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_type_default_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_temp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_performance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_client_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_client_action_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_collaterals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_filing_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_priority_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_repayment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_repayment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_ruleset_constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kakao_notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channel_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settlement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_case_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_exit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_membership_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_staff_temp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscription_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_runtime_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_affidavits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_creditor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_income_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_property_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_secured_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setting_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setting_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_requests ENABLE ROW LEVEL SECURITY;

-- SECTION 2: Force RLS on sensitive tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.billing_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscription_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_document_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_handlers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_hub_organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_module_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_parties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_party_private_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_recovery_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_request_attachments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_stage_template_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_stage_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.case_type_default_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_access_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_private_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_temp_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_plan_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_compensation_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_payouts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_performance_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE public.content_resources FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_ingestion_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fee_agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_client_action_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_client_action_packets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_collaterals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_filing_bundles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_priority_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_repayment_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_repayment_plans FORCE ROW LEVEL SECURITY;
ALTER TABLE public.insolvency_ruleset_constants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.member_private_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channel_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.org_settlement_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_case_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_hubs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_reads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_collaboration_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_membership_permission_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_signup_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_staff_temp_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscription_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permission_template_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_affidavits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_creditor_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_creditors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_family_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_income_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_plan_sections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_properties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_property_deductions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_secured_properties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.setting_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.setting_change_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_requests FORCE ROW LEVEL SECURITY;

-- SECTION 3: RLS Policies by Table
-- -----------------------------------------------------------------------------

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: billing_entries
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS billing_entries_select ON public.billing_entries;

CREATE POLICY billing_entries_select ON public.billing_entries
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.can_view_case_billing(case_id))
;

DROP POLICY IF EXISTS billing_entries_write ON public.billing_entries;

CREATE POLICY billing_entries_write ON public.billing_entries
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR ((billing_owner_case_organization_id IS NOT NULL) AND app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = billing_entries.billing_owner_case_organization_id)), 'billing_issue'::text))))
  WITH CHECK ((app.is_platform_admin() OR ((billing_owner_case_organization_id IS NOT NULL) AND app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = billing_entries.billing_owner_case_organization_id)), 'billing_issue'::text))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: billing_subscription_events
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS billing_subscription_events_manage ON public.billing_subscription_events;

CREATE POLICY billing_subscription_events_manage ON public.billing_subscription_events
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());

DROP POLICY IF EXISTS billing_subscription_events_select ON public.billing_subscription_events;

CREATE POLICY billing_subscription_events_select ON public.billing_subscription_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_clients
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_clients_select ON public.case_clients;

CREATE POLICY case_clients_select ON public.case_clients
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (profile_id = auth.uid())))
;

DROP POLICY IF EXISTS case_clients_write ON public.case_clients;

CREATE POLICY case_clients_write ON public.case_clients
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_document_reviews
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_document_reviews_insert ON public.case_document_reviews;

CREATE POLICY case_document_reviews_insert ON public.case_document_reviews
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (app.is_org_staff(organization_id));

DROP POLICY IF EXISTS case_document_reviews_select ON public.case_document_reviews;

CREATE POLICY case_document_reviews_select ON public.case_document_reviews
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id)))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_documents
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_documents_select ON public.case_documents;

CREATE POLICY case_documents_select ON public.case_documents
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))))
;

DROP POLICY IF EXISTS case_documents_write ON public.case_documents;

CREATE POLICY case_documents_write ON public.case_documents
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_handlers
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_handlers_select ON public.case_handlers;

CREATE POLICY case_handlers_select ON public.case_handlers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id)))
;

DROP POLICY IF EXISTS case_handlers_write ON public.case_handlers;

CREATE POLICY case_handlers_write ON public.case_handlers
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_hub_activity
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_hub_activity_org_select ON public.case_hub_activity;

CREATE POLICY case_hub_activity_org_select ON public.case_hub_activity
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)))
;

DROP POLICY IF EXISTS case_hub_activity_service_role_all ON public.case_hub_activity;

CREATE POLICY case_hub_activity_service_role_all ON public.case_hub_activity
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_hub_members
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_hub_members_org_select ON public.case_hub_members;

CREATE POLICY case_hub_members_org_select ON public.case_hub_members
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)))
;

DROP POLICY IF EXISTS case_hub_members_service_role_all ON public.case_hub_members;

CREATE POLICY case_hub_members_service_role_all ON public.case_hub_members
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_hub_organizations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_hub_organizations_select ON public.case_hub_organizations;

CREATE POLICY case_hub_organizations_select ON public.case_hub_organizations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_case_hub_org_member(hub_id)))
;

DROP POLICY IF EXISTS case_hub_organizations_service_role_all ON public.case_hub_organizations;

CREATE POLICY case_hub_organizations_service_role_all ON public.case_hub_organizations
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_hubs
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_hubs_org_member_select ON public.case_hubs;

CREATE POLICY case_hubs_org_member_select ON public.case_hubs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_case_hub_org_member(id)))
;

DROP POLICY IF EXISTS case_hubs_service_role_all ON public.case_hubs;

CREATE POLICY case_hubs_service_role_all ON public.case_hubs
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_messages
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_messages_insert ON public.case_messages;

CREATE POLICY case_messages_insert ON public.case_messages
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((sender_profile_id = auth.uid()) AND (app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (is_internal = false)))));

DROP POLICY IF EXISTS case_messages_select ON public.case_messages;

CREATE POLICY case_messages_select ON public.case_messages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (is_internal = false))))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_module_catalog
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_module_catalog_select ON public.case_module_catalog;

CREATE POLICY case_module_catalog_select ON public.case_module_catalog
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS case_module_catalog_write ON public.case_module_catalog;

CREATE POLICY case_module_catalog_write ON public.case_module_catalog
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_organizations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_organizations_select ON public.case_organizations;

CREATE POLICY case_organizations_select ON public.case_organizations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS case_organizations_write ON public.case_organizations;

CREATE POLICY case_organizations_write ON public.case_organizations
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_parties
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_parties_select ON public.case_parties;

CREATE POLICY case_parties_select ON public.case_parties
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id)))
;

DROP POLICY IF EXISTS case_parties_write ON public.case_parties;

CREATE POLICY case_parties_write ON public.case_parties
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_party_private_profiles
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_party_private_select ON public.case_party_private_profiles;

CREATE POLICY case_party_private_select ON public.case_party_private_profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
;

DROP POLICY IF EXISTS case_party_private_write ON public.case_party_private_profiles;

CREATE POLICY case_party_private_write ON public.case_party_private_profiles
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_recovery_activities
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_recovery_select ON public.case_recovery_activities;

CREATE POLICY case_recovery_select ON public.case_recovery_activities
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))))
;

DROP POLICY IF EXISTS case_recovery_write ON public.case_recovery_activities;

CREATE POLICY case_recovery_write ON public.case_recovery_activities
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_request_attachments
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_request_files_insert ON public.case_request_attachments;

CREATE POLICY case_request_files_insert ON public.case_request_attachments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_org_staff(organization_id) OR (EXISTS ( SELECT 1
   FROM case_requests r
  WHERE ((r.id = case_request_attachments.case_request_id) AND (r.client_visible = true) AND app.is_case_client(r.case_id))))));

DROP POLICY IF EXISTS case_request_files_select ON public.case_request_attachments;

CREATE POLICY case_request_files_select ON public.case_request_attachments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (EXISTS ( SELECT 1
   FROM case_requests r
  WHERE ((r.id = case_request_attachments.case_request_id) AND (r.client_visible = true) AND app.is_case_client(r.case_id))))))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_requests_insert ON public.case_requests;

CREATE POLICY case_requests_insert ON public.case_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((created_by = auth.uid()) AND (app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (client_visible = true)))));

DROP POLICY IF EXISTS case_requests_select ON public.case_requests;

CREATE POLICY case_requests_select ON public.case_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (client_visible = true))))
;

DROP POLICY IF EXISTS case_requests_update ON public.case_requests;

CREATE POLICY case_requests_update ON public.case_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_schedules
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_schedules_select ON public.case_schedules;

CREATE POLICY case_schedules_select ON public.case_schedules
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_staff(organization_id) OR (app.is_case_client(case_id) AND (client_visibility = 'client_visible'::client_visibility))))
;

DROP POLICY IF EXISTS case_schedules_write ON public.case_schedules;

CREATE POLICY case_schedules_write ON public.case_schedules
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_stage_template_steps
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS stage_template_steps_select ON public.case_stage_template_steps;

CREATE POLICY stage_template_steps_select ON public.case_stage_template_steps
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND ((t.organization_id IS NULL) OR app.is_org_member(t.organization_id))))))
;

DROP POLICY IF EXISTS stage_template_steps_write ON public.case_stage_template_steps;

CREATE POLICY stage_template_steps_write ON public.case_stage_template_steps
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND (app.is_platform_admin() OR app.is_org_manager(t.organization_id))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM case_stage_templates t
  WHERE ((t.id = case_stage_template_steps.template_id) AND (app.is_platform_admin() OR app.is_org_manager(t.organization_id))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_stage_templates
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS stage_templates_select ON public.case_stage_templates;

CREATE POLICY stage_templates_select ON public.case_stage_templates
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((organization_id IS NULL) OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS stage_templates_write ON public.case_stage_templates;

CREATE POLICY stage_templates_write ON public.case_stage_templates
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: case_type_default_modules
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS case_type_default_modules_select ON public.case_type_default_modules;

CREATE POLICY case_type_default_modules_select ON public.case_type_default_modules
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS case_type_default_modules_write ON public.case_type_default_modules;

CREATE POLICY case_type_default_modules_write ON public.case_type_default_modules
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: cases
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS cases_insert ON public.cases;

CREATE POLICY cases_insert ON public.cases
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_org_staff(organization_id) AND (created_by = auth.uid())));

DROP POLICY IF EXISTS cases_select ON public.cases;

CREATE POLICY cases_select ON public.cases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.can_view_case(id, organization_id))
;

DROP POLICY IF EXISTS cases_update ON public.cases;

CREATE POLICY cases_update ON public.cases
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: client_access_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS client_access_requests_insert ON public.client_access_requests;

CREATE POLICY client_access_requests_insert ON public.client_access_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((requester_profile_id = auth.uid()));

DROP POLICY IF EXISTS client_access_requests_select ON public.client_access_requests;

CREATE POLICY client_access_requests_select ON public.client_access_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (requester_profile_id = auth.uid()) OR app.is_org_manager(target_organization_id)))
;

DROP POLICY IF EXISTS client_access_requests_update ON public.client_access_requests;

CREATE POLICY client_access_requests_update ON public.client_access_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(target_organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(target_organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: client_private_profiles
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS client_private_profiles_insert ON public.client_private_profiles;

CREATE POLICY client_private_profiles_insert ON public.client_private_profiles
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((profile_id = auth.uid()) OR app.is_platform_admin()));

DROP POLICY IF EXISTS client_private_profiles_select ON public.client_private_profiles;

CREATE POLICY client_private_profiles_select ON public.client_private_profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((profile_id = auth.uid()) OR app.is_platform_admin()))
;

DROP POLICY IF EXISTS client_private_profiles_update ON public.client_private_profiles;

CREATE POLICY client_private_profiles_update ON public.client_private_profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((profile_id = auth.uid()) OR app.is_platform_admin()))
  WITH CHECK (((profile_id = auth.uid()) OR app.is_platform_admin()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: client_service_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS client_service_requests_insert ON public.client_service_requests;

CREATE POLICY client_service_requests_insert ON public.client_service_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((profile_id = auth.uid()) OR app.is_platform_admin()));

DROP POLICY IF EXISTS client_service_requests_select ON public.client_service_requests;

CREATE POLICY client_service_requests_select ON public.client_service_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((profile_id = auth.uid()) OR app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))))
;

DROP POLICY IF EXISTS client_service_requests_update ON public.client_service_requests;

CREATE POLICY client_service_requests_update ON public.client_service_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))))
  WITH CHECK ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: client_temp_credentials
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS client_temp_credentials_org_manager_select ON public.client_temp_credentials;

CREATE POLICY client_temp_credentials_org_manager_select ON public.client_temp_credentials
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((organization_id IS NOT NULL) AND app.is_org_manager(organization_id)))
;

DROP POLICY IF EXISTS client_temp_credentials_self_select ON public.client_temp_credentials;

CREATE POLICY client_temp_credentials_self_select ON public.client_temp_credentials
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: collection_compensation_entries
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS comp_entries_select ON public.collection_compensation_entries;

CREATE POLICY comp_entries_select ON public.collection_compensation_entries
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.is_org_member(co.organization_id))))))
;

DROP POLICY IF EXISTS comp_entries_write ON public.collection_compensation_entries;

CREATE POLICY comp_entries_write ON public.collection_compensation_entries
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_manage_plan'::text))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((collection_compensation_plan_versions v
     JOIN collection_compensation_plans p ON ((p.id = v.collection_compensation_plan_id)))
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((v.id = collection_compensation_entries.collection_compensation_plan_version_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_manage_plan'::text))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: collection_compensation_plan_versions
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS comp_plan_versions_select ON public.collection_compensation_plan_versions;

CREATE POLICY comp_plan_versions_select ON public.collection_compensation_plan_versions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM collection_compensation_plans p
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
           FROM case_organizations
          WHERE (case_organizations.id = p.collection_org_case_organization_id))))))))
;

DROP POLICY IF EXISTS comp_plan_versions_write ON public.collection_compensation_plan_versions;

CREATE POLICY comp_plan_versions_write ON public.collection_compensation_plan_versions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (collection_compensation_plans p
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_fix_plan'::text))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (collection_compensation_plans p
     JOIN case_organizations co ON ((co.id = p.collection_org_case_organization_id)))
  WHERE ((p.id = collection_compensation_plan_versions.collection_compensation_plan_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'collection_compensation_fix_plan'::text))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: collection_compensation_plans
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS comp_plans_select ON public.collection_compensation_plans;

CREATE POLICY comp_plans_select ON public.collection_compensation_plans
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)))))
;

DROP POLICY IF EXISTS comp_plans_write ON public.collection_compensation_plans;

CREATE POLICY comp_plans_write ON public.collection_compensation_plans
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)), 'collection_compensation_manage_plan'::text)))
  WITH CHECK ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_compensation_plans.collection_org_case_organization_id)), 'collection_compensation_manage_plan'::text)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: collection_payouts
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS comp_payouts_select ON public.collection_payouts;

CREATE POLICY comp_payouts_select ON public.collection_payouts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM collection_compensation_entries e
  WHERE (e.id = collection_payouts.collection_compensation_entry_id))))
;

DROP POLICY IF EXISTS comp_payouts_write ON public.collection_payouts;

CREATE POLICY comp_payouts_write ON public.collection_payouts
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: collection_performance_daily
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS performance_daily_select ON public.collection_performance_daily;

CREATE POLICY performance_daily_select ON public.collection_performance_daily
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = collection_performance_daily.collection_org_case_organization_id)))))
;

DROP POLICY IF EXISTS performance_daily_write ON public.collection_performance_daily;

CREATE POLICY performance_daily_write ON public.collection_performance_daily
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: content_resources
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS content_resources_select ON public.content_resources;

CREATE POLICY content_resources_select ON public.content_resources
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((organization_id IS NULL) OR app.is_org_member(organization_id) OR app.is_platform_admin()))
;

DROP POLICY IF EXISTS content_resources_write ON public.content_resources;

CREATE POLICY content_resources_write ON public.content_resources
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))))
  WITH CHECK ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: document_ingestion_jobs
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ingestion_jobs_insert ON public.document_ingestion_jobs;

CREATE POLICY ingestion_jobs_insert ON public.document_ingestion_jobs
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (app.is_org_staff(organization_id));

DROP POLICY IF EXISTS ingestion_jobs_select ON public.document_ingestion_jobs;

CREATE POLICY ingestion_jobs_select ON public.document_ingestion_jobs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS ingestion_jobs_service_role ON public.document_ingestion_jobs;

CREATE POLICY ingestion_jobs_service_role ON public.document_ingestion_jobs
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS ingestion_jobs_update ON public.document_ingestion_jobs;

CREATE POLICY ingestion_jobs_update ON public.document_ingestion_jobs
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: feature_flags
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;

CREATE POLICY feature_flags_select ON public.feature_flags
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((organization_id IS NULL) OR app.is_org_member(organization_id) OR app.is_platform_admin()))
;

DROP POLICY IF EXISTS feature_flags_write ON public.feature_flags;

CREATE POLICY feature_flags_write ON public.feature_flags
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: fee_agreements
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS fee_agreements_select ON public.fee_agreements;

CREATE POLICY fee_agreements_select ON public.fee_agreements
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.can_view_case_billing(case_id))
;

DROP POLICY IF EXISTS fee_agreements_write ON public.fee_agreements;

CREATE POLICY fee_agreements_write ON public.fee_agreements
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = fee_agreements.billing_owner_case_organization_id)), 'billing_manage'::text)))
  WITH CHECK ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = fee_agreements.billing_owner_case_organization_id)), 'billing_manage'::text)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_client_action_items
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS action_items_select ON public.insolvency_client_action_items;

CREATE POLICY action_items_select ON public.insolvency_client_action_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id) OR app.is_case_client(case_id)))
;

DROP POLICY IF EXISTS action_items_service_role ON public.insolvency_client_action_items;

CREATE POLICY action_items_service_role ON public.insolvency_client_action_items
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS action_items_staff_write ON public.insolvency_client_action_items;

CREATE POLICY action_items_staff_write ON public.insolvency_client_action_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_client_action_packets
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS action_packets_select ON public.insolvency_client_action_packets;

CREATE POLICY action_packets_select ON public.insolvency_client_action_packets
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id) OR app.is_case_client(case_id)))
;

DROP POLICY IF EXISTS action_packets_service_role ON public.insolvency_client_action_packets;

CREATE POLICY action_packets_service_role ON public.insolvency_client_action_packets
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS action_packets_write ON public.insolvency_client_action_packets;

CREATE POLICY action_packets_write ON public.insolvency_client_action_packets
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_collaterals
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS insolvency_collaterals_select ON public.insolvency_collaterals;

CREATE POLICY insolvency_collaterals_select ON public.insolvency_collaterals
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS insolvency_collaterals_service_role ON public.insolvency_collaterals;

CREATE POLICY insolvency_collaterals_service_role ON public.insolvency_collaterals
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS insolvency_collaterals_write ON public.insolvency_collaterals;

CREATE POLICY insolvency_collaterals_write ON public.insolvency_collaterals
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_filing_bundles
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS filing_bundles_select ON public.insolvency_filing_bundles;

CREATE POLICY filing_bundles_select ON public.insolvency_filing_bundles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS filing_bundles_service_role ON public.insolvency_filing_bundles;

CREATE POLICY filing_bundles_service_role ON public.insolvency_filing_bundles
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS filing_bundles_write ON public.insolvency_filing_bundles;

CREATE POLICY filing_bundles_write ON public.insolvency_filing_bundles
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_priority_claims
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS priority_claims_select ON public.insolvency_priority_claims;

CREATE POLICY priority_claims_select ON public.insolvency_priority_claims
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS priority_claims_service_role ON public.insolvency_priority_claims;

CREATE POLICY priority_claims_service_role ON public.insolvency_priority_claims
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS priority_claims_write ON public.insolvency_priority_claims;

CREATE POLICY priority_claims_write ON public.insolvency_priority_claims
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_repayment_allocations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS repayment_allocations_select ON public.insolvency_repayment_allocations;

CREATE POLICY repayment_allocations_select ON public.insolvency_repayment_allocations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS repayment_allocations_service_role ON public.insolvency_repayment_allocations;

CREATE POLICY repayment_allocations_service_role ON public.insolvency_repayment_allocations
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS repayment_allocations_write ON public.insolvency_repayment_allocations;

CREATE POLICY repayment_allocations_write ON public.insolvency_repayment_allocations
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_repayment_plans
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS repayment_plans_select ON public.insolvency_repayment_plans;

CREATE POLICY repayment_plans_select ON public.insolvency_repayment_plans
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS repayment_plans_service_role ON public.insolvency_repayment_plans;

CREATE POLICY repayment_plans_service_role ON public.insolvency_repayment_plans
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS repayment_plans_write ON public.insolvency_repayment_plans;

CREATE POLICY repayment_plans_write ON public.insolvency_repayment_plans
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_org_staff(organization_id))
  WITH CHECK (app.is_org_staff(organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: insolvency_ruleset_constants
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS ruleset_constants_select ON public.insolvency_ruleset_constants;

CREATE POLICY ruleset_constants_select ON public.insolvency_ruleset_constants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS ruleset_constants_write ON public.insolvency_ruleset_constants;

CREATE POLICY ruleset_constants_write ON public.insolvency_ruleset_constants
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: invitations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS invitations_insert ON public.invitations;

CREATE POLICY invitations_insert ON public.invitations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));

DROP POLICY IF EXISTS invitations_select ON public.invitations;

CREATE POLICY invitations_select ON public.invitations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text))))
;

DROP POLICY IF EXISTS invitations_update ON public.invitations;

CREATE POLICY invitations_update ON public.invitations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text))))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)) = lower((email)::text))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: invoice_items
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS invoice_items_select ON public.invoice_items;

CREATE POLICY invoice_items_select ON public.invoice_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_items.invoice_id) AND app.can_view_case_billing(i.case_id)))))
;

DROP POLICY IF EXISTS invoice_items_write ON public.invoice_items;

CREATE POLICY invoice_items_write ON public.invoice_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN case_organizations co ON ((co.id = i.billing_owner_case_organization_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_issue'::text))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (invoices i
     JOIN case_organizations co ON ((co.id = i.billing_owner_case_organization_id)))
  WHERE ((i.id = invoice_items.invoice_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_issue'::text))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: invoices
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS invoices_select ON public.invoices;

CREATE POLICY invoices_select ON public.invoices
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.can_view_case_billing(case_id))
;

DROP POLICY IF EXISTS invoices_write ON public.invoices;

CREATE POLICY invoices_write ON public.invoices
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = invoices.billing_owner_case_organization_id)), 'billing_issue'::text)))
  WITH CHECK ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = invoices.billing_owner_case_organization_id)), 'billing_issue'::text)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: kakao_notification_outbox
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS kakao_notification_outbox_select ON public.kakao_notification_outbox;

CREATE POLICY kakao_notification_outbox_select ON public.kakao_notification_outbox
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.is_platform_admin())
;

DROP POLICY IF EXISTS kakao_notification_outbox_write ON public.kakao_notification_outbox;

CREATE POLICY kakao_notification_outbox_write ON public.kakao_notification_outbox
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: member_private_profiles
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS member_private_profiles_insert ON public.member_private_profiles;

CREATE POLICY member_private_profiles_insert ON public.member_private_profiles
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((profile_id = auth.uid()));

DROP POLICY IF EXISTS member_private_profiles_select ON public.member_private_profiles;

CREATE POLICY member_private_profiles_select ON public.member_private_profiles
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((profile_id = auth.uid()))
;

DROP POLICY IF EXISTS member_private_profiles_update ON public.member_private_profiles;

CREATE POLICY member_private_profiles_update ON public.member_private_profiles
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: notification_channel_preferences
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS notification_channel_preferences_insert ON public.notification_channel_preferences;

CREATE POLICY notification_channel_preferences_insert ON public.notification_channel_preferences
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((profile_id = auth.uid()));

DROP POLICY IF EXISTS notification_channel_preferences_select ON public.notification_channel_preferences;

CREATE POLICY notification_channel_preferences_select ON public.notification_channel_preferences
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()))
;

DROP POLICY IF EXISTS notification_channel_preferences_update ON public.notification_channel_preferences;

CREATE POLICY notification_channel_preferences_update ON public.notification_channel_preferences
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: notifications
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS notifications_delete ON public.notifications;

CREATE POLICY notifications_delete ON public.notifications
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((recipient_profile_id = auth.uid()) OR app.is_platform_admin()))
;

DROP POLICY IF EXISTS notifications_insert ON public.notifications;

CREATE POLICY notifications_insert ON public.notifications
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_platform_admin() OR app.is_org_staff(organization_id)));

DROP POLICY IF EXISTS notifications_select ON public.notifications;

CREATE POLICY notifications_select ON public.notifications
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((recipient_profile_id = auth.uid()) OR app.is_platform_admin()))
;

DROP POLICY IF EXISTS notifications_update ON public.notifications;

CREATE POLICY notifications_update ON public.notifications
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((recipient_profile_id = auth.uid()))
  WITH CHECK ((recipient_profile_id = auth.uid()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: org_settlement_entries
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS org_settlement_entries_select ON public.org_settlement_entries;

CREATE POLICY org_settlement_entries_select ON public.org_settlement_entries
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM case_organizations co
  WHERE ((co.id = org_settlement_entries.source_case_organization_id) AND app.is_org_member(co.organization_id)))) OR (EXISTS ( SELECT 1
   FROM case_organizations co
  WHERE ((co.id = org_settlement_entries.target_case_organization_id) AND app.is_org_member(co.organization_id))))))
;

DROP POLICY IF EXISTS org_settlement_entries_write ON public.org_settlement_entries;

CREATE POLICY org_settlement_entries_write ON public.org_settlement_entries
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = org_settlement_entries.source_case_organization_id)), 'settlement_manage'::text)))
  WITH CHECK ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = org_settlement_entries.source_case_organization_id)), 'settlement_manage'::text)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_collaboration_case_shares
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_collaboration_case_shares_select ON public.organization_collaboration_case_shares;

CREATE POLICY organization_collaboration_case_shares_select ON public.organization_collaboration_case_shares
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_case_shares.hub_id) AND (app.is_org_member(hubs.primary_organization_id) OR app.is_org_member(hubs.partner_organization_id)))))))
;

DROP POLICY IF EXISTS organization_collaboration_case_shares_write ON public.organization_collaboration_case_shares;

CREATE POLICY organization_collaboration_case_shares_write ON public.organization_collaboration_case_shares
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(shared_by_organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(shared_by_organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_collaboration_hubs
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_collaboration_hubs_select ON public.organization_collaboration_hubs;

CREATE POLICY organization_collaboration_hubs_select ON public.organization_collaboration_hubs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(primary_organization_id) OR app.is_org_member(partner_organization_id)))
;

DROP POLICY IF EXISTS organization_collaboration_hubs_write ON public.organization_collaboration_hubs;

CREATE POLICY organization_collaboration_hubs_write ON public.organization_collaboration_hubs
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(primary_organization_id) OR app.is_org_manager(partner_organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(primary_organization_id) OR app.is_org_manager(partner_organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_collaboration_messages
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_collaboration_messages_insert ON public.organization_collaboration_messages;

CREATE POLICY organization_collaboration_messages_insert ON public.organization_collaboration_messages
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((sender_profile_id = auth.uid()) AND app.is_org_member(organization_id) AND (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_messages.hub_id) AND ((hubs.primary_organization_id = organization_collaboration_messages.organization_id) OR (hubs.partner_organization_id = organization_collaboration_messages.organization_id)))))));

DROP POLICY IF EXISTS organization_collaboration_messages_select ON public.organization_collaboration_messages;

CREATE POLICY organization_collaboration_messages_select ON public.organization_collaboration_messages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM organization_collaboration_hubs hubs
  WHERE ((hubs.id = organization_collaboration_messages.hub_id) AND (app.is_org_member(hubs.primary_organization_id) OR app.is_org_member(hubs.partner_organization_id)))))))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_collaboration_reads
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_collaboration_reads_select ON public.organization_collaboration_reads;

CREATE POLICY organization_collaboration_reads_select ON public.organization_collaboration_reads
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (profile_id = auth.uid()) OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS organization_collaboration_reads_write ON public.organization_collaboration_reads;

CREATE POLICY organization_collaboration_reads_write ON public.organization_collaboration_reads
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR (profile_id = auth.uid())))
  WITH CHECK ((app.is_platform_admin() OR (profile_id = auth.uid())));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_collaboration_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_collaboration_requests_insert ON public.organization_collaboration_requests;

CREATE POLICY organization_collaboration_requests_insert ON public.organization_collaboration_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((requested_by_profile_id = auth.uid()) AND app.is_org_manager(source_organization_id)));

DROP POLICY IF EXISTS organization_collaboration_requests_select ON public.organization_collaboration_requests;

CREATE POLICY organization_collaboration_requests_select ON public.organization_collaboration_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(source_organization_id) OR app.is_org_member(target_organization_id)))
;

DROP POLICY IF EXISTS organization_collaboration_requests_update ON public.organization_collaboration_requests;

CREATE POLICY organization_collaboration_requests_update ON public.organization_collaboration_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(source_organization_id) OR app.is_org_manager(target_organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(source_organization_id) OR app.is_org_manager(target_organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_exit_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_exit_requests_insert ON public.organization_exit_requests;

CREATE POLICY organization_exit_requests_insert ON public.organization_exit_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_platform_admin() OR (app.is_org_manager(organization_id) AND (requested_by_profile_id = auth.uid()))));

DROP POLICY IF EXISTS organization_exit_requests_select ON public.organization_exit_requests;

CREATE POLICY organization_exit_requests_select ON public.organization_exit_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR (requested_by_profile_id = auth.uid())))
;

DROP POLICY IF EXISTS organization_exit_requests_update ON public.organization_exit_requests;

CREATE POLICY organization_exit_requests_update ON public.organization_exit_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_membership_permission_overrides
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS permission_overrides_select ON public.organization_membership_permission_overrides;

CREATE POLICY permission_overrides_select ON public.organization_membership_permission_overrides
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id) OR (om.profile_id = auth.uid()))))))
;

DROP POLICY IF EXISTS permission_overrides_write ON public.organization_membership_permission_overrides;

CREATE POLICY permission_overrides_write ON public.organization_membership_permission_overrides
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_memberships om
  WHERE ((om.id = organization_membership_permission_overrides.organization_membership_id) AND (app.is_platform_admin() OR app.is_org_manager(om.organization_id))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_memberships
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS memberships_delete ON public.organization_memberships;

CREATE POLICY memberships_delete ON public.organization_memberships
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
;

DROP POLICY IF EXISTS memberships_insert ON public.organization_memberships;

CREATE POLICY memberships_insert ON public.organization_memberships
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id) OR ((profile_id = auth.uid()) AND (role = 'org_owner'::membership_role) AND (EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = organization_memberships.organization_id) AND (o.created_by = auth.uid())))))));

DROP POLICY IF EXISTS memberships_select ON public.organization_memberships;

CREATE POLICY memberships_select ON public.organization_memberships
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS memberships_update ON public.organization_memberships;

CREATE POLICY memberships_update ON public.organization_memberships
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_relations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_relations_select ON public.organization_relations;

CREATE POLICY organization_relations_select ON public.organization_relations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(source_organization_id) OR app.is_org_member(target_organization_id)))
;

DROP POLICY IF EXISTS organization_relations_write ON public.organization_relations;

CREATE POLICY organization_relations_write ON public.organization_relations
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(source_organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(source_organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_settings
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_settings_select ON public.organization_settings;

CREATE POLICY organization_settings_select ON public.organization_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;

DROP POLICY IF EXISTS organization_settings_write ON public.organization_settings;

CREATE POLICY organization_settings_write ON public.organization_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.setting_write_allowed(key, organization_id))
  WITH CHECK (app.setting_write_allowed(key, organization_id));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_signup_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS signup_requests_insert ON public.organization_signup_requests;

CREATE POLICY signup_requests_insert ON public.organization_signup_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((requester_profile_id = auth.uid()));

DROP POLICY IF EXISTS signup_requests_select ON public.organization_signup_requests;

CREATE POLICY signup_requests_select ON public.organization_signup_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR (requester_profile_id = auth.uid())))
;

DROP POLICY IF EXISTS signup_requests_update ON public.organization_signup_requests;

CREATE POLICY signup_requests_update ON public.organization_signup_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_staff_temp_credentials
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organization_staff_temp_credentials_org_manager_select ON public.organization_staff_temp_credentials;

CREATE POLICY organization_staff_temp_credentials_org_manager_select ON public.organization_staff_temp_credentials
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.is_org_manager(organization_id))
;

DROP POLICY IF EXISTS organization_staff_temp_credentials_self_select ON public.organization_staff_temp_credentials;

CREATE POLICY organization_staff_temp_credentials_self_select ON public.organization_staff_temp_credentials
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((profile_id = auth.uid()))
;

DROP POLICY IF EXISTS organization_staff_temp_credentials_self_update ON public.organization_staff_temp_credentials;

CREATE POLICY organization_staff_temp_credentials_self_update ON public.organization_staff_temp_credentials
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organization_subscription_states
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS org_subscription_state_manage ON public.organization_subscription_states;

CREATE POLICY org_subscription_state_manage ON public.organization_subscription_states
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());

DROP POLICY IF EXISTS org_subscription_state_select ON public.organization_subscription_states;

CREATE POLICY org_subscription_state_select ON public.organization_subscription_states
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(organization_id)))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: organizations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS organizations_insert ON public.organizations;

CREATE POLICY organizations_insert ON public.organizations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((created_by = auth.uid()));

DROP POLICY IF EXISTS organizations_select ON public.organizations;

CREATE POLICY organizations_select ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_member(id)))
;

DROP POLICY IF EXISTS organizations_update ON public.organizations;

CREATE POLICY organizations_update ON public.organizations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: payment_allocations
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS payment_allocations_select ON public.payment_allocations;

CREATE POLICY payment_allocations_select ON public.payment_allocations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND app.can_view_case_billing(p.case_id)))))
;

DROP POLICY IF EXISTS payment_allocations_write ON public.payment_allocations;

CREATE POLICY payment_allocations_write ON public.payment_allocations
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (payments p
     JOIN case_organizations co ON ((co.id = p.billing_owner_case_organization_id)))
  WHERE ((p.id = payment_allocations.payment_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_payment_confirm'::text))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (payments p
     JOIN case_organizations co ON ((co.id = p.billing_owner_case_organization_id)))
  WHERE ((p.id = payment_allocations.payment_id) AND (app.is_platform_admin() OR app.has_permission(co.organization_id, 'billing_payment_confirm'::text))))));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: payments
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS payments_select ON public.payments;

CREATE POLICY payments_select ON public.payments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (app.can_view_case_billing(case_id))
;

DROP POLICY IF EXISTS payments_write ON public.payments;

CREATE POLICY payments_write ON public.payments
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = payments.billing_owner_case_organization_id)), 'billing_payment_confirm'::text)))
  WITH CHECK ((app.is_platform_admin() OR app.has_permission(( SELECT case_organizations.organization_id
   FROM case_organizations
  WHERE (case_organizations.id = payments.billing_owner_case_organization_id)), 'billing_payment_confirm'::text)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: permission_template_items
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS permission_template_items_select ON public.permission_template_items;

CREATE POLICY permission_template_items_select ON public.permission_template_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS permission_template_items_write ON public.permission_template_items;

CREATE POLICY permission_template_items_write ON public.permission_template_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: permission_templates
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS permission_templates_select ON public.permission_templates;

CREATE POLICY permission_templates_select ON public.permission_templates
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS permission_templates_write ON public.permission_templates;

CREATE POLICY permission_templates_write ON public.permission_templates
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: platform_runtime_settings
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS platform_runtime_settings_admin_select ON public.platform_runtime_settings;

CREATE POLICY platform_runtime_settings_admin_select ON public.platform_runtime_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status)))))
;

DROP POLICY IF EXISTS platform_runtime_settings_admin_write ON public.platform_runtime_settings;

CREATE POLICY platform_runtime_settings_admin_write ON public.platform_runtime_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (organization_memberships om
     JOIN organizations o ON ((o.id = om.organization_id)))
  WHERE ((om.organization_id = platform_runtime_settings.platform_organization_id) AND (om.profile_id = auth.uid()) AND (om.status = 'active'::membership_status) AND (om.role = ANY (ARRAY['org_owner'::membership_role, 'org_manager'::membership_role])) AND (o.kind = 'platform_management'::organization_kind) AND (o.lifecycle_status <> 'soft_deleted'::lifecycle_status)))));

DROP POLICY IF EXISTS platform_runtime_settings_service_role_all ON public.platform_runtime_settings;

CREATE POLICY platform_runtime_settings_service_role_all ON public.platform_runtime_settings
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: platform_settings
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;

CREATE POLICY platform_settings_select ON public.platform_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

DROP POLICY IF EXISTS platform_settings_write ON public.platform_settings;

CREATE POLICY platform_settings_write ON public.platform_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (app.is_platform_admin())
  WITH CHECK (app.is_platform_admin());


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: profiles
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((id = auth.uid()) OR app.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM (organization_memberships current_m
     JOIN organization_memberships target_m ON ((current_m.organization_id = target_m.organization_id)))
  WHERE ((current_m.profile_id = auth.uid()) AND (current_m.status = 'active'::membership_status) AND (target_m.profile_id = profiles.id) AND (target_m.status = 'active'::membership_status))))))
;

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

CREATE POLICY profiles_update_self ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((id = auth.uid()) OR app.is_platform_admin()))
  WITH CHECK (((id = auth.uid()) OR app.is_platform_admin()));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: setting_catalog
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS setting_catalog_select ON public.setting_catalog;

CREATE POLICY setting_catalog_select ON public.setting_catalog
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: setting_change_logs
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS setting_change_logs_select ON public.setting_change_logs;

CREATE POLICY setting_change_logs_select ON public.setting_change_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR ((organization_id IS NOT NULL) AND app.is_org_manager(organization_id))))
;


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: support_access_requests
-- ────────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS support_requests_insert ON public.support_access_requests;

CREATE POLICY support_requests_insert ON public.support_access_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((app.is_platform_admin() AND (requested_by = auth.uid())));

DROP POLICY IF EXISTS support_requests_select ON public.support_access_requests;

CREATE POLICY support_requests_select ON public.support_access_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
;

DROP POLICY IF EXISTS support_requests_update ON public.support_access_requests;

CREATE POLICY support_requests_update ON public.support_access_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((app.is_platform_admin() OR app.is_org_manager(organization_id)))
  WITH CHECK ((app.is_platform_admin() OR app.is_org_manager(organization_id)));


-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_applications
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_app_org_member ON public.rehabilitation_applications
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_creditor_settings
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_cred_settings_org_member ON public.rehabilitation_creditor_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_secured_properties
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_secured_org_member ON public.rehabilitation_secured_properties
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_creditors
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_creditors_org_member ON public.rehabilitation_creditors
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_properties
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_properties_org_member ON public.rehabilitation_properties
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_property_deductions
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_prop_deductions_org_member ON public.rehabilitation_property_deductions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_family_members
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_family_org_member ON public.rehabilitation_family_members
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_income_settings
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_income_org_member ON public.rehabilitation_income_settings
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_affidavits
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_affidavit_org_member ON public.rehabilitation_affidavits
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────────
-- Table: rehabilitation_plan_sections
-- ────────────────────────────────────────────────────────────────────────────────

CREATE POLICY rehab_plan_org_member ON public.rehabilitation_plan_sections
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM public.cases c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE om.profile_id = auth.uid()
    )
  );

