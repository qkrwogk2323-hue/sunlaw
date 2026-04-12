-- billing_entries
CREATE INDEX IF NOT EXISTS idx_billing_entries_case_status ON public.billing_entries USING btree (case_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_entries_case_v2 ON public.billing_entries USING btree (case_id, status, created_at DESC);

-- billing_subscription_events
CREATE INDEX IF NOT EXISTS idx_billing_subscription_events_org ON public.billing_subscription_events USING btree (organization_id, created_at DESC);

-- case_clients
CREATE UNIQUE INDEX IF NOT EXISTS case_clients_case_id_client_email_snapshot_key ON public.case_clients USING btree (case_id, client_email_snapshot);
CREATE INDEX IF NOT EXISTS idx_case_clients_case ON public.case_clients USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_case_clients_case_link_status ON public.case_clients USING btree (case_id, link_status);
CREATE INDEX IF NOT EXISTS idx_case_clients_last_linked_hub_id ON public.case_clients USING btree (last_linked_hub_id) WHERE (last_linked_hub_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_case_clients_orphan_review_deadline ON public.case_clients USING btree (review_deadline) WHERE (link_status = 'orphan_review'::case_client_link_status);
CREATE INDEX IF NOT EXISTS idx_case_clients_profile ON public.case_clients USING btree (profile_id);

-- case_document_reviews
CREATE INDEX IF NOT EXISTS idx_case_document_reviews_case ON public.case_document_reviews USING btree (case_id, created_at DESC);

-- case_documents
CREATE INDEX IF NOT EXISTS idx_case_documents_case ON public.case_documents USING btree (case_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_documents_status ON public.case_documents USING btree (organization_id, approval_status);

-- case_handlers
CREATE UNIQUE INDEX IF NOT EXISTS case_handlers_case_id_profile_id_role_key ON public.case_handlers USING btree (case_id, profile_id, role);
CREATE INDEX IF NOT EXISTS idx_case_handlers_case ON public.case_handlers USING btree (case_id);

-- case_hub_activity
CREATE INDEX IF NOT EXISTS idx_case_hub_activity_created ON public.case_hub_activity USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_hub_activity_hub_id ON public.case_hub_activity USING btree (hub_id);

-- case_hub_members
CREATE UNIQUE INDEX IF NOT EXISTS case_hub_members_hub_id_profile_id_key ON public.case_hub_members USING btree (hub_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_case_hub_members_hub_id ON public.case_hub_members USING btree (hub_id);
CREATE INDEX IF NOT EXISTS idx_case_hub_members_profile ON public.case_hub_members USING btree (profile_id);

-- case_hub_organizations
CREATE UNIQUE INDEX IF NOT EXISTS case_hub_organizations_hub_org_role_uniq ON public.case_hub_organizations USING btree (hub_id, organization_id, hub_role);
CREATE INDEX IF NOT EXISTS idx_case_hub_organizations_case_org ON public.case_hub_organizations USING btree (source_case_organization_id);
CREATE INDEX IF NOT EXISTS idx_case_hub_organizations_hub ON public.case_hub_organizations USING btree (hub_id, status);
CREATE INDEX IF NOT EXISTS idx_case_hub_organizations_org ON public.case_hub_organizations USING btree (organization_id, status);

-- case_hubs
CREATE UNIQUE INDEX IF NOT EXISTS case_hubs_case_id_key ON public.case_hubs USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_case_hubs_case_id ON public.case_hubs USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_case_hubs_lifecycle ON public.case_hubs USING btree (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_case_hubs_organization_id ON public.case_hubs USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_case_hubs_primary_case_client_id ON public.case_hubs USING btree (primary_case_client_id) WHERE (primary_case_client_id IS NOT NULL);

-- case_messages
CREATE INDEX IF NOT EXISTS idx_case_messages_case_created ON public.case_messages USING btree (case_id, created_at DESC);

-- case_organizations
CREATE UNIQUE INDEX IF NOT EXISTS case_organizations_case_id_organization_id_role_key ON public.case_organizations USING btree (case_id, organization_id, role);
CREATE INDEX IF NOT EXISTS idx_case_organizations_case ON public.case_organizations USING btree (case_id, status, role);
CREATE INDEX IF NOT EXISTS idx_case_organizations_instructed_by ON public.case_organizations USING btree (instructed_by_case_organization_id);
CREATE INDEX IF NOT EXISTS idx_case_organizations_org ON public.case_organizations USING btree (organization_id, status, role);

-- case_parties
CREATE INDEX IF NOT EXISTS idx_case_parties_case ON public.case_parties USING btree (case_id);

-- case_party_private_profiles
CREATE UNIQUE INDEX IF NOT EXISTS case_party_private_profiles_case_party_id_key ON public.case_party_private_profiles USING btree (case_party_id);

-- case_recovery_activities
CREATE INDEX IF NOT EXISTS idx_case_recovery_case ON public.case_recovery_activities USING btree (case_id, occurred_at DESC);

-- case_requests
CREATE INDEX IF NOT EXISTS idx_case_requests_assigned ON public.case_requests USING btree (assigned_to, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_requests_case_status ON public.case_requests USING btree (case_id, status, created_at DESC);

-- case_schedules
CREATE INDEX IF NOT EXISTS idx_case_schedules_case ON public.case_schedules USING btree (case_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_case_schedules_org_due ON public.case_schedules USING btree (organization_id, scheduled_start);

-- case_stage_template_steps
CREATE UNIQUE INDEX IF NOT EXISTS case_stage_template_steps_template_id_sequence_no_key ON public.case_stage_template_steps USING btree (template_id, sequence_no);
CREATE UNIQUE INDEX IF NOT EXISTS case_stage_template_steps_template_id_step_key_key ON public.case_stage_template_steps USING btree (template_id, step_key);

-- case_stage_templates
CREATE UNIQUE INDEX IF NOT EXISTS case_stage_templates_organization_id_template_key_key ON public.case_stage_templates USING btree (organization_id, template_key);

-- case_type_default_modules
CREATE UNIQUE INDEX IF NOT EXISTS case_type_default_modules_case_type_module_key_key ON public.case_type_default_modules USING btree (case_type, module_key);

-- cases
CREATE UNIQUE INDEX IF NOT EXISTS cases_organization_id_reference_no_key ON public.cases USING btree (organization_id, reference_no);
CREATE INDEX IF NOT EXISTS idx_cases_org ON public.cases USING btree (organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases USING btree (organization_id, case_status);

-- client_access_requests
CREATE INDEX IF NOT EXISTS idx_client_access_requests_requester_status ON public.client_access_requests USING btree (requester_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_access_requests_target_status ON public.client_access_requests USING btree (target_organization_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_access_requests_pending ON public.client_access_requests USING btree (target_organization_id, requester_profile_id) WHERE (status = 'pending'::client_access_request_status);

-- client_private_profiles
CREATE INDEX IF NOT EXISTS idx_client_private_profiles_created_at ON public.client_private_profiles USING btree (created_at DESC);

-- client_service_requests
CREATE INDEX IF NOT EXISTS idx_client_service_requests_org_status ON public.client_service_requests USING btree (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_service_requests_profile_status ON public.client_service_requests USING btree (profile_id, status, created_at DESC);

-- client_temp_credentials
CREATE INDEX IF NOT EXISTS client_temp_credentials_case_idx ON public.client_temp_credentials USING btree (case_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS client_temp_credentials_login_email_key ON public.client_temp_credentials USING btree (login_email);
CREATE UNIQUE INDEX IF NOT EXISTS client_temp_credentials_login_id_normalized_key ON public.client_temp_credentials USING btree (login_id_normalized);
CREATE INDEX IF NOT EXISTS client_temp_credentials_org_idx ON public.client_temp_credentials USING btree (organization_id, created_at DESC);

-- collection_compensation_entries
CREATE INDEX IF NOT EXISTS idx_comp_entries_case_period ON public.collection_compensation_entries USING btree (case_id, period_start DESC);

-- collection_compensation_plan_versions
CREATE UNIQUE INDEX IF NOT EXISTS collection_compensation_plan__collection_compensation_plan__key ON public.collection_compensation_plan_versions USING btree (collection_compensation_plan_id, status, effective_from);

-- collection_compensation_plans
CREATE INDEX IF NOT EXISTS idx_comp_plans_case ON public.collection_compensation_plans USING btree (case_id, is_active);

-- collection_performance_daily
CREATE UNIQUE INDEX IF NOT EXISTS collection_performance_daily_case_id_collection_org_case_or_key ON public.collection_performance_daily USING btree (case_id, collection_org_case_organization_id, organization_membership_id, performance_date);
CREATE INDEX IF NOT EXISTS idx_performance_daily_date ON public.collection_performance_daily USING btree (performance_date DESC);

-- content_resources
CREATE UNIQUE INDEX IF NOT EXISTS uq_content_resources_published ON public.content_resources USING btree (namespace, resource_key, locale, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), status);

-- feature_flags
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_flag_key_organization_id_key ON public.feature_flags USING btree (flag_key, organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_org_key ON public.feature_flags USING btree (organization_id, flag_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_scope ON public.feature_flags USING btree (flag_key, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- fee_agreements
CREATE INDEX IF NOT EXISTS idx_fee_agreements_case ON public.fee_agreements USING btree (case_id, is_active);

-- insolvency_repayment_allocations
CREATE UNIQUE INDEX IF NOT EXISTS insolvency_repayment_allocations_plan_id_creditor_id_key ON public.insolvency_repayment_allocations USING btree (plan_id, creditor_id);

-- insolvency_repayment_plans
CREATE UNIQUE INDEX IF NOT EXISTS insolvency_repayment_plans_case_id_version_number_key ON public.insolvency_repayment_plans USING btree (case_id, version_number);

-- insolvency_ruleset_constants
CREATE UNIQUE INDEX IF NOT EXISTS insolvency_ruleset_constants_ruleset_key_effective_from_key ON public.insolvency_ruleset_constants USING btree (ruleset_key, effective_from);

-- invitations
CREATE INDEX IF NOT EXISTS idx_invitations_case_client ON public.invitations USING btree (case_client_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_case_status ON public.invitations USING btree (case_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON public.invitations USING btree (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON public.invitations USING btree (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash_status ON public.invitations USING btree (token_hash, status);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_share_token_key ON public.invitations USING btree (share_token);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_key ON public.invitations USING btree (token_hash);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_case_status ON public.invoices USING btree (case_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_no_key ON public.invoices USING btree (invoice_no);

-- kakao_notification_outbox
CREATE INDEX IF NOT EXISTS kakao_notification_outbox_status_idx ON public.kakao_notification_outbox USING btree (status, created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications USING btree (recipient_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_action_pending_idx ON public.notifications USING btree (recipient_profile_id, organization_id, action_entity_type, action_target_id) WHERE ((requires_action = true) AND (resolved_at IS NULL));
CREATE INDEX IF NOT EXISTS notifications_destination_idx ON public.notifications USING btree (recipient_profile_id, destination_url, created_at DESC) WHERE (status = ANY (ARRAY['active'::text, 'read'::text]));
CREATE INDEX IF NOT EXISTS notifications_queue_entity_idx ON public.notifications USING btree (recipient_profile_id, entity_type, entity_id, created_at DESC) WHERE (status <> 'deleted'::text);
CREATE INDEX IF NOT EXISTS notifications_queue_status_priority_idx ON public.notifications USING btree (recipient_profile_id, status, priority, created_at DESC) WHERE (status = ANY (ARRAY['active'::text, 'read'::text, 'resolved'::text, 'archived'::text]));
CREATE INDEX IF NOT EXISTS notifications_recipient_active_idx ON public.notifications USING btree (recipient_profile_id, created_at DESC) WHERE (trashed_at IS NULL);
CREATE INDEX IF NOT EXISTS notifications_recipient_trash_idx ON public.notifications USING btree (recipient_profile_id, trashed_at DESC) WHERE (trashed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS notifications_snooze_queue_idx ON public.notifications USING btree (recipient_profile_id, snoozed_until, created_at DESC) WHERE (trashed_at IS NULL);

-- org_settlement_entries
CREATE INDEX IF NOT EXISTS idx_org_settlement_case_status ON public.org_settlement_entries USING btree (case_id, status, created_at DESC);

-- organization_collaboration_case_shares
CREATE INDEX IF NOT EXISTS idx_org_collaboration_case_shares_hub_created_at ON public.organization_collaboration_case_shares USING btree (hub_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS organization_collaboration_case_shares_hub_id_case_id_key ON public.organization_collaboration_case_shares USING btree (hub_id, case_id);

-- organization_collaboration_hubs
CREATE INDEX IF NOT EXISTS idx_org_collaboration_hubs_partner_status ON public.organization_collaboration_hubs USING btree (partner_organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_collaboration_hubs_primary_status ON public.organization_collaboration_hubs USING btree (primary_organization_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_collaboration_hubs_active_pair ON public.organization_collaboration_hubs USING btree (LEAST(primary_organization_id, partner_organization_id), GREATEST(primary_organization_id, partner_organization_id)) WHERE (status = 'active'::text);

-- organization_collaboration_messages
CREATE INDEX IF NOT EXISTS idx_org_collaboration_messages_hub_created_at ON public.organization_collaboration_messages USING btree (hub_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_collaboration_messages_org_created_at ON public.organization_collaboration_messages USING btree (organization_id, created_at DESC);

-- organization_collaboration_reads
CREATE INDEX IF NOT EXISTS idx_org_collaboration_reads_hub_profile ON public.organization_collaboration_reads USING btree (hub_id, profile_id, last_read_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS organization_collaboration_reads_hub_id_profile_id_key ON public.organization_collaboration_reads USING btree (hub_id, profile_id);

-- organization_collaboration_requests
CREATE INDEX IF NOT EXISTS idx_org_collaboration_requests_source_status ON public.organization_collaboration_requests USING btree (source_organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_collaboration_requests_target_status ON public.organization_collaboration_requests USING btree (target_organization_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_collaboration_requests_pending_pair ON public.organization_collaboration_requests USING btree (source_organization_id, target_organization_id) WHERE (status = 'pending'::collaboration_request_status);

-- organization_exit_requests
CREATE INDEX IF NOT EXISTS idx_org_exit_requests_org ON public.organization_exit_requests USING btree (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_exit_requests_status ON public.organization_exit_requests USING btree (status, created_at DESC);

-- organization_membership_permission_overrides
CREATE UNIQUE INDEX IF NOT EXISTS organization_membership_permi_organization_membership_id_pe_key ON public.organization_membership_permission_overrides USING btree (organization_membership_id, permission_key);

-- organization_memberships
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.organization_memberships USING btree (organization_id, status, role);
CREATE INDEX IF NOT EXISTS idx_org_memberships_profile ON public.organization_memberships USING btree (profile_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_organization_id_profile_id_key ON public.organization_memberships USING btree (organization_id, profile_id);

-- organization_relations
CREATE INDEX IF NOT EXISTS idx_organization_relations_source ON public.organization_relations USING btree (source_organization_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_organization_relations_target ON public.organization_relations USING btree (target_organization_id, relation_type);
CREATE UNIQUE INDEX IF NOT EXISTS organization_relations_source_organization_id_target_organi_key ON public.organization_relations USING btree (source_organization_id, target_organization_id, relation_type);

-- organization_settings
CREATE INDEX IF NOT EXISTS idx_org_settings_org_key ON public.organization_settings USING btree (organization_id, key);
CREATE UNIQUE INDEX IF NOT EXISTS organization_settings_organization_id_key_key ON public.organization_settings USING btree (organization_id, key);

-- organization_signup_requests
CREATE INDEX IF NOT EXISTS idx_org_signup_requests_kind_status ON public.organization_signup_requests USING btree (organization_kind, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_signup_requests_verification_status ON public.organization_signup_requests USING btree (business_registration_verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_requests_status_created ON public.organization_signup_requests USING btree (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_signup_pending_requester ON public.organization_signup_requests USING btree (requester_profile_id) WHERE (status = 'pending'::organization_signup_status);

-- organization_staff_temp_credentials
CREATE UNIQUE INDEX IF NOT EXISTS organization_staff_temp_credentials_login_email_key ON public.organization_staff_temp_credentials USING btree (login_email);
CREATE INDEX IF NOT EXISTS organization_staff_temp_credentials_org_created_idx ON public.organization_staff_temp_credentials USING btree (organization_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS organization_staff_temp_credentials_org_login_idx ON public.organization_staff_temp_credentials USING btree (organization_id, login_id_normalized);

-- organization_subscription_states
CREATE INDEX IF NOT EXISTS idx_org_subscription_states_state ON public.organization_subscription_states USING btree (state, updated_at DESC);

-- organizations
CREATE UNIQUE INDEX IF NOT EXISTS organizations_single_platform_root_idx ON public.organizations USING btree (is_platform_root) WHERE (is_platform_root = true);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key ON public.organizations USING btree (slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_platform_management_singleton ON public.organizations USING btree (kind) WHERE (kind = 'platform_management'::organization_kind);
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_source_signup_request ON public.organizations USING btree (source_signup_request_id) WHERE (source_signup_request_id IS NOT NULL);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_case_received ON public.payments USING btree (case_id, received_at DESC);

-- permission_template_items
CREATE UNIQUE INDEX IF NOT EXISTS permission_template_items_template_key_permission_key_key ON public.permission_template_items USING btree (template_key, permission_key);

-- platform_runtime_settings
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_runtime_settings_platform_organization_id ON public.platform_runtime_settings USING btree (platform_organization_id);

-- profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles USING btree (email);

-- rehabilitation_affidavits
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_affidavit_case ON public.rehabilitation_affidavits USING btree (case_id);

-- rehabilitation_applications
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_app_case ON public.rehabilitation_applications USING btree (case_id);
CREATE INDEX IF NOT EXISTS idx_rehab_app_org ON public.rehabilitation_applications USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_rehab_app_case ON public.rehabilitation_applications USING btree (case_id);

-- rehabilitation_creditor_settings
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_cred_settings ON public.rehabilitation_creditor_settings USING btree (case_id);

-- rehabilitation_creditors
CREATE INDEX IF NOT EXISTS idx_rehab_creditors_case ON public.rehabilitation_creditors USING btree (case_id, bond_number);
CREATE INDEX IF NOT EXISTS idx_rehab_creditors_org ON public.rehabilitation_creditors USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_rehab_creditors_secured ON public.rehabilitation_creditors USING btree (case_id, is_secured) WHERE (is_secured = true);
CREATE INDEX IF NOT EXISTS idx_rehab_creditors_unconfirmed ON public.rehabilitation_creditors USING btree (case_id, is_other_unconfirmed) WHERE (is_other_unconfirmed = true);
CREATE INDEX IF NOT EXISTS idx_rehab_creditors_parent ON public.rehabilitation_creditors(parent_creditor_id) WHERE parent_creditor_id IS NOT NULL;

-- rehabilitation_family_members
CREATE INDEX IF NOT EXISTS idx_rehab_family_case ON public.rehabilitation_family_members USING btree (case_id);

-- rehabilitation_income_settings
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_income_case ON public.rehabilitation_income_settings USING btree (case_id);

-- rehabilitation_plan_sections
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_plan_section ON public.rehabilitation_plan_sections USING btree (case_id, section_number);

-- rehabilitation_properties
CREATE INDEX IF NOT EXISTS idx_rehab_properties_case ON public.rehabilitation_properties USING btree (case_id, category);

-- rehabilitation_property_deductions
CREATE UNIQUE INDEX IF NOT EXISTS uq_rehab_prop_deduction ON public.rehabilitation_property_deductions USING btree (case_id, category);

-- rehabilitation_secured_properties
CREATE INDEX IF NOT EXISTS idx_rehab_secured_case ON public.rehabilitation_secured_properties USING btree (case_id);

-- setting_change_logs
CREATE INDEX IF NOT EXISTS idx_setting_change_logs_target ON public.setting_change_logs USING btree (target_type, target_key, created_at DESC);

-- support_access_requests
CREATE INDEX IF NOT EXISTS idx_support_requests_org ON public.support_access_requests USING btree (organization_id, status, created_at DESC);
