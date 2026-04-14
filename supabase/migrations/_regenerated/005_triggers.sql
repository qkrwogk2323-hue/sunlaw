-- ============================================================
-- 005_triggers.sql
-- Regenerated squash — Batch 5: triggers
-- Requires: all tables (Batch 2) + all functions (Batch 4) to exist.
-- Uses DROP IF EXISTS + CREATE for idempotency.
-- ============================================================

drop trigger if exists audit_billing_entries on public.billing_entries;
CREATE TRIGGER audit_billing_entries AFTER INSERT OR DELETE OR UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_billing_entries_updated_at on public.billing_entries;
CREATE TRIGGER trg_billing_entries_updated_at BEFORE UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_billing_subscription_events on public.billing_subscription_events;
CREATE TRIGGER audit_billing_subscription_events AFTER INSERT OR DELETE OR UPDATE ON public.billing_subscription_events FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_clients on public.case_clients;
CREATE TRIGGER audit_case_clients AFTER INSERT OR DELETE OR UPDATE ON public.case_clients FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_clients_cleanup_hub_links on public.case_clients;
CREATE TRIGGER trg_case_clients_cleanup_hub_links AFTER UPDATE OF link_status, profile_id, last_linked_hub_id ON public.case_clients FOR EACH ROW EXECUTE FUNCTION app.cleanup_case_hub_client_links();

drop trigger if exists trg_case_clients_link_lifecycle on public.case_clients;
CREATE TRIGGER trg_case_clients_link_lifecycle BEFORE UPDATE OF link_status, orphan_reason, relink_policy, last_linked_hub_id ON public.case_clients FOR EACH ROW EXECUTE FUNCTION app.handle_case_client_link_lifecycle();

drop trigger if exists trg_case_clients_updated_at on public.case_clients;
CREATE TRIGGER trg_case_clients_updated_at BEFORE UPDATE ON public.case_clients FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_document_reviews on public.case_document_reviews;
CREATE TRIGGER audit_case_document_reviews AFTER INSERT OR DELETE OR UPDATE ON public.case_document_reviews FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_documents on public.case_documents;
CREATE TRIGGER audit_case_documents AFTER INSERT OR DELETE OR UPDATE ON public.case_documents FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_documents_mark_stale on public.case_documents;
CREATE TRIGGER trg_case_documents_mark_stale BEFORE UPDATE ON public.case_documents FOR EACH ROW EXECUTE FUNCTION app.mark_document_stale();

drop trigger if exists trg_case_documents_review_guard on public.case_documents;
CREATE TRIGGER trg_case_documents_review_guard BEFORE UPDATE ON public.case_documents FOR EACH ROW EXECUTE FUNCTION app.guard_document_review_update();

drop trigger if exists trg_case_documents_updated_at on public.case_documents;
CREATE TRIGGER trg_case_documents_updated_at BEFORE UPDATE ON public.case_documents FOR EACH ROW EXECUTE FUNCTION app.set_updated_at_and_row_version();

drop trigger if exists audit_case_handlers on public.case_handlers;
CREATE TRIGGER audit_case_handlers AFTER INSERT OR DELETE OR UPDATE ON public.case_handlers FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_handlers_updated_at on public.case_handlers;
CREATE TRIGGER trg_case_handlers_updated_at BEFORE UPDATE ON public.case_handlers FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_hub_activity on public.case_hub_activity;
CREATE TRIGGER audit_case_hub_activity AFTER INSERT OR DELETE OR UPDATE ON public.case_hub_activity FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_hub_members on public.case_hub_members;
CREATE TRIGGER audit_case_hub_members AFTER INSERT OR DELETE OR UPDATE ON public.case_hub_members FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_hub_organizations on public.case_hub_organizations;
CREATE TRIGGER audit_case_hub_organizations AFTER INSERT OR DELETE OR UPDATE ON public.case_hub_organizations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_hub_organizations_updated_at on public.case_hub_organizations;
CREATE TRIGGER trg_case_hub_organizations_updated_at BEFORE UPDATE ON public.case_hub_organizations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_hubs on public.case_hubs;
CREATE TRIGGER audit_case_hubs AFTER INSERT OR DELETE OR UPDATE ON public.case_hubs FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_hub_sync_from_hubs on public.case_hubs;
CREATE TRIGGER trg_case_hub_sync_from_hubs AFTER INSERT OR UPDATE OF case_id, organization_id, lifecycle_status ON public.case_hubs FOR EACH ROW EXECUTE FUNCTION app.case_hub_sync_from_hubs();

drop trigger if exists trg_case_hubs_sync_primary_case_client on public.case_hubs;
CREATE TRIGGER trg_case_hubs_sync_primary_case_client BEFORE INSERT OR UPDATE OF case_id, primary_client_id, primary_case_client_id ON public.case_hubs FOR EACH ROW EXECUTE FUNCTION app.sync_case_hub_primary_case_client();

drop trigger if exists audit_case_messages on public.case_messages;
CREATE TRIGGER audit_case_messages AFTER INSERT OR DELETE OR UPDATE ON public.case_messages FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_messages_updated_at on public.case_messages;
CREATE TRIGGER trg_case_messages_updated_at BEFORE UPDATE ON public.case_messages FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_module_catalog on public.case_module_catalog;
CREATE TRIGGER audit_case_module_catalog AFTER INSERT OR DELETE OR UPDATE ON public.case_module_catalog FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_organizations on public.case_organizations;
CREATE TRIGGER audit_case_organizations AFTER INSERT OR DELETE OR UPDATE ON public.case_organizations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_hub_sync_from_case_organizations on public.case_organizations;
CREATE TRIGGER trg_case_hub_sync_from_case_organizations AFTER INSERT OR DELETE OR UPDATE OF organization_id, role, status, access_scope, case_id ON public.case_organizations FOR EACH ROW EXECUTE FUNCTION app.case_hub_sync_from_case_organizations();

drop trigger if exists trg_case_organizations_updated_at on public.case_organizations;
CREATE TRIGGER trg_case_organizations_updated_at BEFORE UPDATE ON public.case_organizations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_parties on public.case_parties;
CREATE TRIGGER audit_case_parties AFTER INSERT OR DELETE OR UPDATE ON public.case_parties FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_parties_updated_at on public.case_parties;
CREATE TRIGGER trg_case_parties_updated_at BEFORE UPDATE ON public.case_parties FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_party_private_profiles on public.case_party_private_profiles;
CREATE TRIGGER audit_case_party_private_profiles AFTER INSERT OR DELETE OR UPDATE ON public.case_party_private_profiles FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_party_private_updated_at on public.case_party_private_profiles;
CREATE TRIGGER trg_case_party_private_updated_at BEFORE UPDATE ON public.case_party_private_profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_recovery on public.case_recovery_activities;
CREATE TRIGGER audit_case_recovery AFTER INSERT OR DELETE OR UPDATE ON public.case_recovery_activities FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_recovery_updated_at on public.case_recovery_activities;
CREATE TRIGGER trg_case_recovery_updated_at BEFORE UPDATE ON public.case_recovery_activities FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_request_attachments on public.case_request_attachments;
CREATE TRIGGER audit_case_request_attachments AFTER INSERT OR DELETE OR UPDATE ON public.case_request_attachments FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_case_requests on public.case_requests;
CREATE TRIGGER audit_case_requests AFTER INSERT OR DELETE OR UPDATE ON public.case_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_requests_updated_at on public.case_requests;
CREATE TRIGGER trg_case_requests_updated_at BEFORE UPDATE ON public.case_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_schedules on public.case_schedules;
CREATE TRIGGER audit_case_schedules AFTER INSERT OR DELETE OR UPDATE ON public.case_schedules FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_case_schedules_updated_at on public.case_schedules;
CREATE TRIGGER trg_case_schedules_updated_at BEFORE UPDATE ON public.case_schedules FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_stage_template_steps on public.case_stage_template_steps;
CREATE TRIGGER audit_stage_template_steps AFTER INSERT OR DELETE OR UPDATE ON public.case_stage_template_steps FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_stage_templates on public.case_stage_templates;
CREATE TRIGGER audit_stage_templates AFTER INSERT OR DELETE OR UPDATE ON public.case_stage_templates FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_stage_templates_updated_at on public.case_stage_templates;
CREATE TRIGGER trg_stage_templates_updated_at BEFORE UPDATE ON public.case_stage_templates FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_case_type_default_modules on public.case_type_default_modules;
CREATE TRIGGER audit_case_type_default_modules AFTER INSERT OR DELETE OR UPDATE ON public.case_type_default_modules FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_cases on public.cases;
CREATE TRIGGER audit_cases AFTER INSERT OR DELETE OR UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_cases_updated_at on public.cases;
CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION app.set_updated_at_and_row_version();

drop trigger if exists audit_client_access_requests on public.client_access_requests;
CREATE TRIGGER audit_client_access_requests AFTER INSERT OR DELETE OR UPDATE ON public.client_access_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_client_access_requests_updated_at on public.client_access_requests;
CREATE TRIGGER trg_client_access_requests_updated_at BEFORE UPDATE ON public.client_access_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_client_private_profiles on public.client_private_profiles;
CREATE TRIGGER audit_client_private_profiles AFTER INSERT OR DELETE OR UPDATE ON public.client_private_profiles FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_client_private_profiles_updated_at on public.client_private_profiles;
CREATE TRIGGER trg_client_private_profiles_updated_at BEFORE UPDATE ON public.client_private_profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_client_service_requests on public.client_service_requests;
CREATE TRIGGER audit_client_service_requests AFTER INSERT OR DELETE OR UPDATE ON public.client_service_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_client_service_requests_updated_at on public.client_service_requests;
CREATE TRIGGER trg_client_service_requests_updated_at BEFORE UPDATE ON public.client_service_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_client_temp_credentials on public.client_temp_credentials;
CREATE TRIGGER audit_client_temp_credentials AFTER INSERT OR DELETE OR UPDATE ON public.client_temp_credentials FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_client_temp_credentials_updated_at on public.client_temp_credentials;
CREATE TRIGGER trg_client_temp_credentials_updated_at BEFORE UPDATE ON public.client_temp_credentials FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_collection_comp_entries on public.collection_compensation_entries;
CREATE TRIGGER audit_collection_comp_entries AFTER INSERT OR DELETE OR UPDATE ON public.collection_compensation_entries FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_comp_entries_updated_at on public.collection_compensation_entries;
CREATE TRIGGER trg_comp_entries_updated_at BEFORE UPDATE ON public.collection_compensation_entries FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_collection_comp_plan_versions on public.collection_compensation_plan_versions;
CREATE TRIGGER audit_collection_comp_plan_versions AFTER INSERT OR DELETE OR UPDATE ON public.collection_compensation_plan_versions FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_collection_compensation_plans on public.collection_compensation_plans;
CREATE TRIGGER audit_collection_compensation_plans AFTER INSERT OR DELETE OR UPDATE ON public.collection_compensation_plans FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_comp_plans_updated_at on public.collection_compensation_plans;
CREATE TRIGGER trg_comp_plans_updated_at BEFORE UPDATE ON public.collection_compensation_plans FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_collection_payouts on public.collection_payouts;
CREATE TRIGGER audit_collection_payouts AFTER INSERT OR DELETE OR UPDATE ON public.collection_payouts FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_collection_performance_daily on public.collection_performance_daily;
CREATE TRIGGER audit_collection_performance_daily AFTER INSERT OR DELETE OR UPDATE ON public.collection_performance_daily FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_content_resources on public.content_resources;
CREATE TRIGGER audit_content_resources AFTER INSERT OR DELETE OR UPDATE ON public.content_resources FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_document_ingestion_jobs on public.document_ingestion_jobs;
CREATE TRIGGER audit_document_ingestion_jobs AFTER INSERT OR DELETE OR UPDATE ON public.document_ingestion_jobs FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_ingestion_jobs_updated_at on public.document_ingestion_jobs;
CREATE TRIGGER trg_ingestion_jobs_updated_at BEFORE UPDATE ON public.document_ingestion_jobs FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_feature_flags on public.feature_flags;
CREATE TRIGGER audit_feature_flags AFTER INSERT OR DELETE OR UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_fee_agreements on public.fee_agreements;
CREATE TRIGGER audit_fee_agreements AFTER INSERT OR DELETE OR UPDATE ON public.fee_agreements FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_fee_agreements_updated_at on public.fee_agreements;
CREATE TRIGGER trg_fee_agreements_updated_at BEFORE UPDATE ON public.fee_agreements FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_items on public.insolvency_client_action_items;
CREATE TRIGGER audit_insolvency_client_action_items AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_client_action_items FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_action_items_updated_at on public.insolvency_client_action_items;
CREATE TRIGGER trg_action_items_updated_at BEFORE UPDATE ON public.insolvency_client_action_items FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_client_action_packets on public.insolvency_client_action_packets;
CREATE TRIGGER audit_insolvency_client_action_packets AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_client_action_packets FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_action_packets_updated_at on public.insolvency_client_action_packets;
CREATE TRIGGER trg_action_packets_updated_at BEFORE UPDATE ON public.insolvency_client_action_packets FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_collaterals on public.insolvency_collaterals;
CREATE TRIGGER audit_insolvency_collaterals AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_collaterals FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_insolvency_collaterals_updated_at on public.insolvency_collaterals;
CREATE TRIGGER trg_insolvency_collaterals_updated_at BEFORE UPDATE ON public.insolvency_collaterals FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_creditor_addresses on public.insolvency_creditor_addresses;
CREATE TRIGGER audit_insolvency_creditor_addresses AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_creditor_addresses FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_insolvency_creditor_addresses_updated_at on public.insolvency_creditor_addresses;
CREATE TRIGGER trg_insolvency_creditor_addresses_updated_at BEFORE UPDATE ON public.insolvency_creditor_addresses FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_creditors on public.insolvency_creditors;
CREATE TRIGGER audit_insolvency_creditors AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_creditors FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_insolvency_creditors_updated_at on public.insolvency_creditors;
CREATE TRIGGER trg_insolvency_creditors_updated_at BEFORE UPDATE ON public.insolvency_creditors FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_filing_bundles on public.insolvency_filing_bundles;
CREATE TRIGGER audit_insolvency_filing_bundles AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_filing_bundles FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_filing_bundles_updated_at on public.insolvency_filing_bundles;
CREATE TRIGGER trg_filing_bundles_updated_at BEFORE UPDATE ON public.insolvency_filing_bundles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_priority_claims on public.insolvency_priority_claims;
CREATE TRIGGER audit_insolvency_priority_claims AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_priority_claims FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_priority_claims_updated_at on public.insolvency_priority_claims;
CREATE TRIGGER trg_priority_claims_updated_at BEFORE UPDATE ON public.insolvency_priority_claims FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_repayment_allocations on public.insolvency_repayment_allocations;
CREATE TRIGGER audit_insolvency_repayment_allocations AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_repayment_allocations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_repayment_allocations_updated_at on public.insolvency_repayment_allocations;
CREATE TRIGGER trg_repayment_allocations_updated_at BEFORE UPDATE ON public.insolvency_repayment_allocations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_repayment_plans on public.insolvency_repayment_plans;
CREATE TRIGGER audit_insolvency_repayment_plans AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_repayment_plans FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_repayment_plans_updated_at on public.insolvency_repayment_plans;
CREATE TRIGGER trg_repayment_plans_updated_at BEFORE UPDATE ON public.insolvency_repayment_plans FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_insolvency_ruleset_constants on public.insolvency_ruleset_constants;
CREATE TRIGGER audit_insolvency_ruleset_constants AFTER INSERT OR DELETE OR UPDATE ON public.insolvency_ruleset_constants FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_invitations on public.invitations;
CREATE TRIGGER audit_invitations AFTER INSERT OR DELETE OR UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_invitations_updated_at on public.invitations;
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_invoice_items on public.invoice_items;
CREATE TRIGGER audit_invoice_items AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_invoices on public.invoices;
CREATE TRIGGER audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_invoices_updated_at on public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_kakao_notification_outbox on public.kakao_notification_outbox;
CREATE TRIGGER audit_kakao_notification_outbox AFTER INSERT OR DELETE OR UPDATE ON public.kakao_notification_outbox FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_member_private_profiles on public.member_private_profiles;
CREATE TRIGGER audit_member_private_profiles AFTER INSERT OR DELETE OR UPDATE ON public.member_private_profiles FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_member_private_profiles_updated_at on public.member_private_profiles;
CREATE TRIGGER trg_member_private_profiles_updated_at BEFORE UPDATE ON public.member_private_profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_notification_channel_preferences on public.notification_channel_preferences;
CREATE TRIGGER audit_notification_channel_preferences AFTER INSERT OR DELETE OR UPDATE ON public.notification_channel_preferences FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_notification_channel_preferences_updated_at on public.notification_channel_preferences;
CREATE TRIGGER trg_notification_channel_preferences_updated_at BEFORE UPDATE ON public.notification_channel_preferences FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_notifications on public.notifications;
CREATE TRIGGER audit_notifications AFTER INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_notifications_enqueue_kakao_outbox on public.notifications;
CREATE TRIGGER trg_notifications_enqueue_kakao_outbox AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION app.enqueue_kakao_notification_for_eligible();

drop trigger if exists trg_notifications_sync_model on public.notifications;
CREATE TRIGGER trg_notifications_sync_model BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION app.sync_notification_model();

drop trigger if exists audit_org_settlement_entries on public.org_settlement_entries;
CREATE TRIGGER audit_org_settlement_entries AFTER INSERT OR DELETE OR UPDATE ON public.org_settlement_entries FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_settlement_entries_updated_at on public.org_settlement_entries;
CREATE TRIGGER trg_org_settlement_entries_updated_at BEFORE UPDATE ON public.org_settlement_entries FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_org_collab_case_shares on public.organization_collaboration_case_shares;
CREATE TRIGGER audit_org_collab_case_shares AFTER INSERT OR DELETE OR UPDATE ON public.organization_collaboration_case_shares FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_collaboration_case_shares_updated_at on public.organization_collaboration_case_shares;
CREATE TRIGGER trg_org_collaboration_case_shares_updated_at BEFORE UPDATE ON public.organization_collaboration_case_shares FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_org_collab_hubs on public.organization_collaboration_hubs;
CREATE TRIGGER audit_org_collab_hubs AFTER INSERT OR DELETE OR UPDATE ON public.organization_collaboration_hubs FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_collaboration_hubs_updated_at on public.organization_collaboration_hubs;
CREATE TRIGGER trg_org_collaboration_hubs_updated_at BEFORE UPDATE ON public.organization_collaboration_hubs FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_org_collab_messages on public.organization_collaboration_messages;
CREATE TRIGGER audit_org_collab_messages AFTER INSERT OR DELETE OR UPDATE ON public.organization_collaboration_messages FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_org_collab_reads on public.organization_collaboration_reads;
CREATE TRIGGER audit_org_collab_reads AFTER INSERT OR DELETE OR UPDATE ON public.organization_collaboration_reads FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_collaboration_reads_updated_at on public.organization_collaboration_reads;
CREATE TRIGGER trg_org_collaboration_reads_updated_at BEFORE UPDATE ON public.organization_collaboration_reads FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_org_collab_requests on public.organization_collaboration_requests;
CREATE TRIGGER audit_org_collab_requests AFTER INSERT OR DELETE OR UPDATE ON public.organization_collaboration_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_collaboration_requests_updated_at on public.organization_collaboration_requests;
CREATE TRIGGER trg_org_collaboration_requests_updated_at BEFORE UPDATE ON public.organization_collaboration_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_organization_exit_requests on public.organization_exit_requests;
CREATE TRIGGER audit_organization_exit_requests AFTER INSERT OR DELETE OR UPDATE ON public.organization_exit_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_exit_requests_updated_at on public.organization_exit_requests;
CREATE TRIGGER trg_org_exit_requests_updated_at BEFORE UPDATE ON public.organization_exit_requests FOR EACH ROW EXECUTE FUNCTION touch_org_exit_requests_updated_at();

drop trigger if exists audit_membership_permission_overrides on public.organization_membership_permission_overrides;
CREATE TRIGGER audit_membership_permission_overrides AFTER INSERT OR DELETE OR UPDATE ON public.organization_membership_permission_overrides FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_memberships on public.organization_memberships;
CREATE TRIGGER audit_memberships AFTER INSERT OR DELETE OR UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_memberships_updated_at on public.organization_memberships;
CREATE TRIGGER trg_org_memberships_updated_at BEFORE UPDATE ON public.organization_memberships FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_organization_relations on public.organization_relations;
CREATE TRIGGER audit_organization_relations AFTER INSERT OR DELETE OR UPDATE ON public.organization_relations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_organization_settings on public.organization_settings;
CREATE TRIGGER audit_organization_settings AFTER INSERT OR DELETE OR UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_signup_requests on public.organization_signup_requests;
CREATE TRIGGER audit_signup_requests AFTER INSERT OR DELETE OR UPDATE ON public.organization_signup_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_signup_requests_updated_at on public.organization_signup_requests;
CREATE TRIGGER trg_signup_requests_updated_at BEFORE UPDATE ON public.organization_signup_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_organization_staff_temp_credentials on public.organization_staff_temp_credentials;
CREATE TRIGGER audit_organization_staff_temp_credentials AFTER INSERT OR DELETE OR UPDATE ON public.organization_staff_temp_credentials FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_organization_staff_temp_credentials_updated_at on public.organization_staff_temp_credentials;
CREATE TRIGGER trg_organization_staff_temp_credentials_updated_at BEFORE UPDATE ON public.organization_staff_temp_credentials FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_organization_subscription_states on public.organization_subscription_states;
CREATE TRIGGER audit_organization_subscription_states AFTER INSERT OR DELETE OR UPDATE ON public.organization_subscription_states FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_org_subscription_state_events on public.organization_subscription_states;
CREATE TRIGGER trg_org_subscription_state_events AFTER INSERT OR UPDATE ON public.organization_subscription_states FOR EACH ROW EXECUTE FUNCTION app.log_subscription_state_change();

drop trigger if exists trg_org_subscription_states_updated_at on public.organization_subscription_states;
CREATE TRIGGER trg_org_subscription_states_updated_at BEFORE UPDATE ON public.organization_subscription_states FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_organizations on public.organizations;
CREATE TRIGGER audit_organizations AFTER INSERT OR DELETE OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_organizations_updated_at on public.organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists trg_platform_registry_drift_guard on public.organizations;
CREATE TRIGGER trg_platform_registry_drift_guard BEFORE UPDATE OF kind, is_platform_root, lifecycle_status ON public.organizations FOR EACH ROW EXECUTE FUNCTION app.prevent_platform_registry_drift();

drop trigger if exists audit_payment_allocations on public.payment_allocations;
CREATE TRIGGER audit_payment_allocations AFTER INSERT OR DELETE OR UPDATE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_payments on public.payments;
CREATE TRIGGER audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_payments_updated_at on public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_permission_template_items on public.permission_template_items;
CREATE TRIGGER audit_permission_template_items AFTER INSERT OR DELETE OR UPDATE ON public.permission_template_items FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_permission_templates on public.permission_templates;
CREATE TRIGGER audit_permission_templates AFTER INSERT OR DELETE OR UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_platform_runtime_settings on public.platform_runtime_settings;
CREATE TRIGGER audit_platform_runtime_settings AFTER INSERT OR DELETE OR UPDATE ON public.platform_runtime_settings FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_platform_runtime_registry_sync on public.platform_runtime_settings;
CREATE TRIGGER trg_platform_runtime_registry_sync BEFORE INSERT OR UPDATE ON public.platform_runtime_settings FOR EACH ROW EXECUTE FUNCTION app.sync_platform_runtime_registry();

drop trigger if exists trg_platform_runtime_settings_updated_at on public.platform_runtime_settings;
CREATE TRIGGER trg_platform_runtime_settings_updated_at BEFORE UPDATE ON public.platform_runtime_settings FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists audit_platform_settings on public.platform_settings;
CREATE TRIGGER audit_platform_settings AFTER INSERT OR DELETE OR UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_profiles on public.profiles;
CREATE TRIGGER audit_profiles AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_profiles_updated_at on public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists trg_rehab_affidavits_fill_org on public.rehabilitation_affidavits;
CREATE TRIGGER trg_rehab_affidavits_fill_org BEFORE INSERT ON public.rehabilitation_affidavits FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_cred_settings_fill_org on public.rehabilitation_creditor_settings;
CREATE TRIGGER trg_rehab_cred_settings_fill_org BEFORE INSERT ON public.rehabilitation_creditor_settings FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_family_fill_org on public.rehabilitation_family_members;
CREATE TRIGGER trg_rehab_family_fill_org BEFORE INSERT ON public.rehabilitation_family_members FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_income_fill_org on public.rehabilitation_income_settings;
CREATE TRIGGER trg_rehab_income_fill_org BEFORE INSERT ON public.rehabilitation_income_settings FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_plan_fill_org on public.rehabilitation_plan_sections;
CREATE TRIGGER trg_rehab_plan_fill_org BEFORE INSERT ON public.rehabilitation_plan_sections FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_prohibition_updated_at on public.rehabilitation_prohibition_orders;
CREATE TRIGGER trg_rehab_prohibition_updated_at BEFORE UPDATE ON public.rehabilitation_prohibition_orders FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

drop trigger if exists trg_rehab_properties_fill_org on public.rehabilitation_properties;
CREATE TRIGGER trg_rehab_properties_fill_org BEFORE INSERT ON public.rehabilitation_properties FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_prop_deductions_fill_org on public.rehabilitation_property_deductions;
CREATE TRIGGER trg_rehab_prop_deductions_fill_org BEFORE INSERT ON public.rehabilitation_property_deductions FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists trg_rehab_secured_fill_org on public.rehabilitation_secured_properties;
CREATE TRIGGER trg_rehab_secured_fill_org BEFORE INSERT ON public.rehabilitation_secured_properties FOR EACH ROW EXECUTE FUNCTION app.fill_organization_id_from_case();

drop trigger if exists audit_setting_catalog on public.setting_catalog;
CREATE TRIGGER audit_setting_catalog AFTER INSERT OR DELETE OR UPDATE ON public.setting_catalog FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_setting_change_logs on public.setting_change_logs;
CREATE TRIGGER audit_setting_change_logs AFTER INSERT OR DELETE OR UPDATE ON public.setting_change_logs FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists audit_support_requests on public.support_access_requests;
CREATE TRIGGER audit_support_requests AFTER INSERT OR DELETE OR UPDATE ON public.support_access_requests FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change();

drop trigger if exists trg_support_requests_updated_at on public.support_access_requests;
CREATE TRIGGER trg_support_requests_updated_at BEFORE UPDATE ON public.support_access_requests FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ------------------------------------------------------------
-- Auth schema trigger (profile sync on user signup)
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION app.handle_new_user();
