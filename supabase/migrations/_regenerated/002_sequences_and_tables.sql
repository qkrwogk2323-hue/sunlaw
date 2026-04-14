-- ============================================================
-- 002_sequences_and_tables.sql
-- Regenerated squash — Batch 2: sequences + tables + non-FK constraints
-- ============================================================

-- Sequence for audit.change_log (must exist before table create)
create sequence if not exists audit.change_log_id_seq;

-- audit.change_log
create table if not exists audit.change_log (
  id bigint not null default nextval('audit.change_log_id_seq'::regclass),
  logged_at timestamp with time zone not null default now(),
  schema_name text not null,
  table_name text not null,
  operation text not null,
  record_id text,
  organization_id uuid,
  case_id uuid,
  actor_user_id uuid,
  actor_email text,
  changed_fields text[] not null default '{}'::text[],
  old_values jsonb,
  new_values jsonb,
  constraint change_log_pkey PRIMARY KEY (id)
);

-- public.billing_entries
create table if not exists public.billing_entries (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  entry_kind billing_entry_kind not null,
  title text not null,
  amount numeric(18,2) not null default 0,
  status billing_status not null default 'draft'::billing_status,
  due_on date,
  paid_at timestamp with time zone,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  fee_agreement_id uuid,
  billing_owner_case_organization_id uuid,
  bill_to_party_kind billing_party_kind,
  bill_to_case_client_id uuid,
  bill_to_case_organization_id uuid,
  description text,
  tax_amount numeric(18,2) not null default 0,
  source_event_type text,
  source_event_id uuid,
  constraint billing_entries_pkey PRIMARY KEY (id)
);

-- public.billing_subscription_events
create table if not exists public.billing_subscription_events (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  state subscription_state not null,
  event_type text not null,
  event_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint billing_subscription_events_pkey PRIMARY KEY (id)
);

-- public.case_clients
create table if not exists public.case_clients (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  profile_id uuid,
  client_name text not null,
  client_email_snapshot citext,
  relation_label text,
  is_portal_enabled boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  link_status case_client_link_status not null default 'linked'::case_client_link_status,
  orphan_reason case_client_orphan_reason,
  relink_policy case_client_relink_policy not null default 'manual_review'::case_client_relink_policy,
  detached_at timestamp with time zone,
  orphaned_at timestamp with time zone,
  review_deadline timestamp with time zone,
  last_linked_hub_id uuid,
  constraint case_clients_pkey PRIMARY KEY (id),
  constraint case_clients_case_id_client_email_snapshot_key UNIQUE (case_id, client_email_snapshot)
);

-- public.case_document_reviews
create table if not exists public.case_document_reviews (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  case_document_id uuid not null,
  request_status approval_status not null,
  requested_by uuid,
  requested_by_name text,
  decided_by uuid,
  decided_by_name text,
  comment text,
  snapshot_version bigint not null default 1,
  decided_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint case_document_reviews_pkey PRIMARY KEY (id)
);

-- public.case_documents
create table if not exists public.case_documents (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  title text not null,
  document_kind document_kind not null,
  approval_status approval_status not null default 'draft'::approval_status,
  client_visibility client_visibility not null default 'internal_only'::client_visibility,
  storage_path text,
  mime_type text,
  file_size bigint,
  summary text,
  content_markdown text,
  approval_requested_by uuid,
  approval_requested_by_name text,
  approval_requested_at timestamp with time zone,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamp with time zone,
  review_note text,
  row_version bigint not null default 1,
  created_by uuid,
  created_by_name text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  source_kind text,
  source_document_type text,
  source_data_snapshot jsonb,
  constraint case_documents_pkey PRIMARY KEY (id)
);

-- public.case_handlers
create table if not exists public.case_handlers (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  profile_id uuid,
  handler_name text not null,
  role text not null,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_handlers_pkey PRIMARY KEY (id),
  constraint case_handlers_case_id_profile_id_role_key UNIQUE (case_id, profile_id, role)
);

-- public.case_hub_activity
create table if not exists public.case_hub_activity (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  actor_profile_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamp with time zone not null default now(),
  constraint case_hub_activity_pkey PRIMARY KEY (id)
);

-- public.case_hub_members
create table if not exists public.case_hub_members (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  profile_id uuid not null,
  membership_role text not null default 'member'::text,
  access_level text not null default 'view'::text,
  seat_kind text not null default 'viewer'::text,
  is_ready boolean not null default false,
  joined_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone,
  last_read_at timestamp with time zone,
  constraint case_hub_members_pkey PRIMARY KEY (id),
  constraint case_hub_members_hub_id_profile_id_key UNIQUE (hub_id, profile_id),
  constraint case_hub_members_access_level_check CHECK ((access_level = ANY (ARRAY['full'::text, 'edit'::text, 'view'::text]))),
  constraint case_hub_members_membership_role_check CHECK ((membership_role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text]))),
  constraint case_hub_members_seat_kind_check CHECK ((seat_kind = ANY (ARRAY['collaborator'::text, 'viewer'::text])))
);

-- public.case_hub_organizations
create table if not exists public.case_hub_organizations (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  organization_id uuid not null,
  source_case_organization_id uuid,
  hub_role case_organization_role not null,
  access_scope case_access_scope not null default 'read_only'::case_access_scope,
  status case_hub_organization_status not null default 'active'::case_hub_organization_status,
  linked_at timestamp with time zone not null default now(),
  unlinked_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_hub_organizations_pkey PRIMARY KEY (id),
  constraint case_hub_organizations_hub_org_role_uniq UNIQUE (hub_id, organization_id, hub_role)
);

-- public.case_hubs
create table if not exists public.case_hubs (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  primary_client_id uuid,
  title text,
  status text not null default 'draft'::text,
  collaborator_limit integer not null default 5,
  viewer_limit integer not null default 12,
  visibility_scope text not null default 'organization'::text,
  created_by uuid,
  lifecycle_status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary_case_client_id uuid,
  constraint case_hubs_pkey PRIMARY KEY (id),
  constraint case_hubs_case_id_key UNIQUE (case_id),
  constraint case_hubs_collaborator_limit_check CHECK ((collaborator_limit > 0)),
  constraint case_hubs_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['active'::text, 'soft_deleted'::text]))),
  constraint case_hubs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'setup_required'::text, 'ready'::text, 'active'::text, 'review_pending'::text, 'archived'::text]))),
  constraint case_hubs_viewer_limit_check CHECK ((viewer_limit > 0)),
  constraint case_hubs_visibility_scope_check CHECK ((visibility_scope = ANY (ARRAY['organization'::text, 'private'::text, 'custom'::text])))
);

-- public.case_messages
create table if not exists public.case_messages (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  sender_profile_id uuid not null,
  sender_role text not null,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_messages_pkey PRIMARY KEY (id)
);

-- public.case_module_catalog
create table if not exists public.case_module_catalog (
  module_key text not null,
  display_name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint case_module_catalog_pkey PRIMARY KEY (module_key)
);

-- public.case_organizations
create table if not exists public.case_organizations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  role case_organization_role not null,
  status case_organization_status not null default 'active'::case_organization_status,
  instructed_by_case_organization_id uuid,
  access_scope case_access_scope not null default 'read_only'::case_access_scope,
  billing_scope case_billing_scope not null default 'none'::case_billing_scope,
  communication_scope case_communication_scope not null default 'cross_org_only'::case_communication_scope,
  is_lead boolean not null default false,
  can_submit_legal_requests boolean not null default false,
  can_receive_legal_requests boolean not null default false,
  can_manage_collection boolean not null default false,
  can_view_client_messages boolean not null default false,
  agreement_summary text,
  started_on date,
  ended_on date,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_organizations_pkey PRIMARY KEY (id),
  constraint case_organizations_case_id_organization_id_role_key UNIQUE (case_id, organization_id, role)
);

-- public.case_parties
create table if not exists public.case_parties (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  party_role party_role not null,
  entity_type entity_type not null,
  display_name text not null,
  company_name text,
  registration_number_masked text,
  resident_number_last4 text,
  phone text,
  email citext,
  address_summary text,
  notes text,
  is_primary boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_parties_pkey PRIMARY KEY (id)
);

-- public.case_party_private_profiles
create table if not exists public.case_party_private_profiles (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  case_party_id uuid not null,
  resident_number_ciphertext text,
  registration_number_ciphertext text,
  address_detail_ciphertext text,
  key_version integer not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_party_private_profiles_pkey PRIMARY KEY (id),
  constraint case_party_private_profiles_case_party_id_key UNIQUE (case_party_id)
);

-- public.case_recovery_activities
create table if not exists public.case_recovery_activities (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  activity_kind recovery_activity_kind not null,
  occurred_at timestamp with time zone not null,
  amount numeric(18,2) not null default 0,
  outcome_status text,
  notes text,
  client_visibility client_visibility not null default 'internal_only'::client_visibility,
  created_by uuid,
  created_by_name text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_recovery_activities_pkey PRIMARY KEY (id)
);

-- public.case_request_attachments
create table if not exists public.case_request_attachments (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  case_request_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint case_request_attachments_pkey PRIMARY KEY (id)
);

-- public.case_requests
create table if not exists public.case_requests (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  created_by uuid not null,
  request_kind case_request_kind not null,
  title text not null,
  body text not null,
  status case_request_status not null default 'open'::case_request_status,
  assigned_to uuid,
  due_at timestamp with time zone,
  resolved_at timestamp with time zone,
  client_visible boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_requests_pkey PRIMARY KEY (id)
);

-- public.case_schedules
create table if not exists public.case_schedules (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  title text not null,
  schedule_kind schedule_kind not null,
  scheduled_start timestamp with time zone not null,
  scheduled_end timestamp with time zone,
  location text,
  notes text,
  client_visibility client_visibility not null default 'internal_only'::client_visibility,
  is_important boolean not null default false,
  completed_at timestamp with time zone,
  created_by uuid,
  created_by_name text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_schedules_pkey PRIMARY KEY (id)
);

-- public.case_stage_template_steps
create table if not exists public.case_stage_template_steps (
  id uuid not null default gen_random_uuid(),
  template_id uuid not null,
  step_key text not null,
  display_name text not null,
  sequence_no integer not null,
  created_at timestamp with time zone not null default now(),
  constraint case_stage_template_steps_pkey PRIMARY KEY (id),
  constraint case_stage_template_steps_template_id_sequence_no_key UNIQUE (template_id, sequence_no),
  constraint case_stage_template_steps_template_id_step_key_key UNIQUE (template_id, step_key)
);

-- public.case_stage_templates
create table if not exists public.case_stage_templates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  template_key text not null,
  display_name text not null,
  case_type case_type,
  is_system boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint case_stage_templates_pkey PRIMARY KEY (id),
  constraint case_stage_templates_organization_id_template_key_key UNIQUE (organization_id, template_key)
);

-- public.case_type_default_modules
create table if not exists public.case_type_default_modules (
  id uuid not null default gen_random_uuid(),
  case_type case_type not null,
  module_key text not null,
  constraint case_type_default_modules_pkey PRIMARY KEY (id),
  constraint case_type_default_modules_case_type_module_key_key UNIQUE (case_type, module_key)
);

-- public.cases
create table if not exists public.cases (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  reference_no text,
  title text not null,
  case_type case_type not null,
  case_status case_status not null default 'intake'::case_status,
  lifecycle_status lifecycle_status not null default 'active'::lifecycle_status,
  retention_class retention_class not null default 'litigation_25y'::retention_class,
  opened_on date,
  closed_on date,
  court_name text,
  case_number text,
  principal_amount numeric(18,2) not null default 0,
  interest_rate numeric(6,4),
  summary text,
  legal_hold_until date,
  deleted_at timestamp with time zone,
  row_version bigint not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  stage_template_key text,
  stage_key text,
  module_flags jsonb not null default '{}'::jsonb,
  court_division text,
  presiding_judge text,
  assigned_judge text,
  court_room text,
  appeal_court_name text,
  appeal_division text,
  appeal_case_number text,
  appeal_presiding_judge text,
  appeal_assigned_judge text,
  appeal_court_room text,
  supreme_case_number text,
  supreme_division text,
  supreme_presiding_judge text,
  supreme_assigned_judge text,
  opponent_counsel_name text,
  opponent_counsel_phone text,
  opponent_counsel_fax text,
  client_contact_address text,
  client_contact_phone text,
  client_contact_fax text,
  deadline_filing date,
  deadline_appeal date,
  deadline_final_appeal date,
  cover_notes text,
  insolvency_subtype insolvency_subtype,
  colaw_case_basic_seq text,
  constraint cases_pkey PRIMARY KEY (id),
  constraint cases_id_organization_id_key UNIQUE (id, organization_id),
  constraint cases_organization_id_reference_no_key UNIQUE (organization_id, reference_no),
  constraint chk_insolvency_subtype_requires_type CHECK (((insolvency_subtype IS NULL) OR (case_type = 'insolvency'::case_type)))
);

-- public.client_access_requests
create table if not exists public.client_access_requests (
  id uuid not null default gen_random_uuid(),
  target_organization_id uuid not null,
  target_organization_key text not null,
  requester_profile_id uuid not null,
  requester_name text not null,
  requester_email citext not null,
  status client_access_request_status not null default 'pending'::client_access_request_status,
  request_note text,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint client_access_requests_pkey PRIMARY KEY (id)
);

-- public.client_private_profiles
create table if not exists public.client_private_profiles (
  profile_id uuid not null,
  legal_name text not null,
  resident_number_ciphertext text not null,
  resident_number_masked text not null,
  address_line1_ciphertext text,
  address_line2_ciphertext text,
  postal_code_ciphertext text,
  mobile_phone_ciphertext text,
  key_version integer not null default 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint client_private_profiles_pkey PRIMARY KEY (profile_id)
);

-- public.client_service_requests
create table if not exists public.client_service_requests (
  id uuid not null default gen_random_uuid(),
  profile_id uuid not null,
  organization_id uuid,
  request_kind text not null default 'status_help'::text,
  account_status_snapshot text not null,
  title text not null,
  body text not null,
  status text not null default 'open'::text,
  resolved_note text,
  resolved_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint client_service_requests_pkey PRIMARY KEY (id)
);

-- public.client_temp_credentials
create table if not exists public.client_temp_credentials (
  profile_id uuid not null,
  organization_id uuid,
  case_id uuid,
  login_id text not null,
  login_id_normalized text not null,
  login_email citext not null,
  issued_by uuid,
  contact_email citext,
  contact_phone text,
  must_change_password boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_password_changed_at timestamp with time zone,
  constraint client_temp_credentials_pkey PRIMARY KEY (profile_id),
  constraint client_temp_credentials_login_email_key UNIQUE (login_email),
  constraint client_temp_credentials_login_id_normalized_key UNIQUE (login_id_normalized)
);

-- public.collection_compensation_entries
create table if not exists public.collection_compensation_entries (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  collection_compensation_plan_version_id uuid not null,
  period_start date not null,
  period_end date not null,
  calculated_from_amount numeric(18,2) not null default 0,
  calculated_amount numeric(18,2) not null default 0,
  status compensation_entry_status not null default 'projected'::compensation_entry_status,
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint collection_compensation_entries_pkey PRIMARY KEY (id)
);

-- public.collection_compensation_plan_versions
create table if not exists public.collection_compensation_plan_versions (
  id uuid not null default gen_random_uuid(),
  collection_compensation_plan_id uuid not null,
  status compensation_plan_status not null default 'draft'::compensation_plan_status,
  fixed_amount numeric(18,2),
  rate numeric(8,4),
  base_metric text,
  effective_from date,
  effective_to date,
  rule_json jsonb not null default '{}'::jsonb,
  fixed_by uuid,
  fixed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint collection_compensation_plan_versions_pkey PRIMARY KEY (id),
  constraint collection_compensation_plan__collection_compensation_plan__key UNIQUE (collection_compensation_plan_id, status, effective_from)
);

-- public.collection_compensation_plans
create table if not exists public.collection_compensation_plans (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  collection_org_case_organization_id uuid not null,
  target_kind compensation_target_kind not null,
  beneficiary_membership_id uuid,
  beneficiary_case_organization_id uuid,
  title text not null,
  description text,
  settlement_cycle text not null default 'monthly'::text,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint collection_compensation_plans_pkey PRIMARY KEY (id)
);

-- public.collection_payouts
create table if not exists public.collection_payouts (
  id uuid not null default gen_random_uuid(),
  collection_compensation_entry_id uuid not null,
  payout_amount numeric(18,2) not null default 0,
  payout_date date,
  reference_text text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint collection_payouts_pkey PRIMARY KEY (id)
);

-- public.collection_performance_daily
create table if not exists public.collection_performance_daily (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  collection_org_case_organization_id uuid not null,
  organization_membership_id uuid,
  performance_date date not null,
  recovered_amount numeric(18,2) not null default 0,
  expected_compensation_amount numeric(18,2) not null default 0,
  confirmed_compensation_amount numeric(18,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint collection_performance_daily_pkey PRIMARY KEY (id),
  constraint collection_performance_daily_case_id_collection_org_case_or_key UNIQUE (case_id, collection_org_case_organization_id, organization_membership_id, performance_date)
);

-- public.content_resources
create table if not exists public.content_resources (
  id uuid not null default gen_random_uuid(),
  namespace text not null,
  resource_key text not null,
  locale text not null default 'ko-KR'::text,
  organization_id uuid,
  status content_status not null default 'draft'::content_status,
  value_text text,
  value_json jsonb,
  published_at timestamp with time zone,
  updated_by uuid,
  updated_at timestamp with time zone not null default now(),
  constraint content_resources_pkey PRIMARY KEY (id)
);

-- public.document_ingestion_jobs
create table if not exists public.document_ingestion_jobs (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  case_document_id uuid,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  document_type ingestion_document_type not null default 'other'::ingestion_document_type,
  status ingestion_status not null default 'pending'::ingestion_status,
  ai_model text,
  ai_prompt_version text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  last_error text,
  processing_started_at timestamp with time zone,
  processing_completed_at timestamp with time zone,
  extracted_json jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint document_ingestion_jobs_pkey PRIMARY KEY (id),
  constraint document_ingestion_jobs_mime_type_check CHECK ((mime_type = ANY (ARRAY['application/pdf'::text, 'image/jpeg'::text, 'image/png'::text, 'image/webp'::text])))
);

-- public.feature_flags
create table if not exists public.feature_flags (
  id uuid not null default gen_random_uuid(),
  flag_key text not null,
  organization_id uuid,
  enabled boolean not null default false,
  rollout_percentage integer not null default 100,
  conditions_json jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamp with time zone not null default now(),
  constraint feature_flags_pkey PRIMARY KEY (id),
  constraint feature_flags_flag_key_organization_id_key UNIQUE (flag_key, organization_id),
  constraint feature_flags_rollout_percentage_check CHECK (((rollout_percentage >= 0) AND (rollout_percentage <= 100)))
);

-- public.fee_agreements
create table if not exists public.fee_agreements (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  billing_owner_case_organization_id uuid not null,
  bill_to_party_kind billing_party_kind not null,
  bill_to_case_client_id uuid,
  bill_to_case_organization_id uuid,
  agreement_type billing_agreement_type not null,
  title text not null,
  description text,
  fixed_amount numeric(18,2),
  rate numeric(8,4),
  currency_code text not null default 'KRW'::text,
  effective_from date,
  effective_to date,
  terms_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint fee_agreements_pkey PRIMARY KEY (id)
);

-- public.insolvency_client_action_items
create table if not exists public.insolvency_client_action_items (
  id uuid not null default gen_random_uuid(),
  packet_id uuid not null,
  organization_id uuid not null,
  case_id uuid not null,
  display_order integer not null default 0,
  title text not null,
  description text,
  responsibility action_item_responsibility not null,
  client_checked_at timestamp with time zone,
  client_checked_by uuid,
  client_note text,
  staff_verified_at timestamp with time zone,
  staff_verified_by uuid,
  staff_note text,
  is_completed boolean not null default false,
  completed_at timestamp with time zone,
  ai_extracted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_client_action_items_pkey PRIMARY KEY (id)
);

-- public.insolvency_client_action_packets
create table if not exists public.insolvency_client_action_packets (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  ingestion_job_id uuid,
  title text not null,
  status action_packet_status not null default 'pending'::action_packet_status,
  due_date date,
  notes text,
  completed_count integer not null default 0,
  total_count integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_client_action_packets_pkey PRIMARY KEY (id)
);

-- public.insolvency_collaterals
create table if not exists public.insolvency_collaterals (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  creditor_id uuid not null,
  collateral_type collateral_type not null,
  real_estate_address text,
  real_estate_registry_number text,
  real_estate_area_sqm numeric(10,2),
  vehicle_registration_number text,
  vehicle_model text,
  vehicle_year integer,
  estimated_value numeric(18,0),
  secured_claim_amount numeric(18,0),
  valuation_basis text,
  valuation_date date,
  ai_extracted boolean not null default false,
  notes text,
  lifecycle_status lifecycle_status not null default 'active'::lifecycle_status,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_collaterals_pkey PRIMARY KEY (id),
  constraint insolvency_collaterals_estimated_value_check CHECK ((estimated_value >= (0)::numeric)),
  constraint insolvency_collaterals_secured_claim_amount_check CHECK ((secured_claim_amount >= (0)::numeric))
);

-- public.insolvency_creditor_addresses
create table if not exists public.insolvency_creditor_addresses (
  id uuid not null default gen_random_uuid(),
  creditor_id uuid not null,
  organization_id uuid not null,
  address_type text not null default 'service'::text,
  postal_code text,
  address_line1 text,
  address_line2 text,
  phone text,
  fax text,
  email text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_creditor_addresses_pkey PRIMARY KEY (id)
);

-- public.insolvency_creditors
create table if not exists public.insolvency_creditors (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  ingestion_job_id uuid,
  creditor_name text not null,
  creditor_type creditor_type not null default 'financial_institution'::creditor_type,
  creditor_business_number text,
  creditor_national_id_masked text,
  claim_class creditor_claim_class not null,
  principal_amount numeric(18,0) not null,
  interest_amount numeric(18,0) not null default 0,
  penalty_amount numeric(18,0) not null default 0,
  total_claim_amount numeric(18,0) generated always as ((principal_amount + interest_amount) + penalty_amount) stored,
  interest_rate_pct numeric(5,2),
  overdue_since date,
  original_contract_date date,
  account_number_masked text,
  has_guarantor boolean not null default false,
  guarantor_name text,
  ai_extracted boolean not null default false,
  ai_confidence_score numeric(4,3),
  source_page_reference text,
  is_confirmed boolean not null default false,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  notes text,
  lifecycle_status lifecycle_status not null default 'active'::lifecycle_status,
  deleted_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_creditors_pkey PRIMARY KEY (id),
  constraint insolvency_creditors_ai_confidence_score_check CHECK (((ai_confidence_score >= (0)::numeric) AND (ai_confidence_score <= (1)::numeric))),
  constraint insolvency_creditors_interest_amount_check CHECK ((interest_amount >= (0)::numeric)),
  constraint insolvency_creditors_penalty_amount_check CHECK ((penalty_amount >= (0)::numeric)),
  constraint insolvency_creditors_principal_amount_check CHECK ((principal_amount >= (0)::numeric))
);

-- public.insolvency_filing_bundles
create table if not exists public.insolvency_filing_bundles (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  plan_id uuid,
  bundle_type text not null,
  status filing_bundle_status not null default 'generating'::filing_bundle_status,
  storage_path text,
  file_size_bytes bigint,
  download_count integer not null default 0,
  expires_at timestamp with time zone,
  generation_error text,
  creditor_count integer,
  total_claim_snapshot numeric(18,0),
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_filing_bundles_pkey PRIMARY KEY (id),
  constraint insolvency_filing_bundles_bundle_type_check CHECK ((bundle_type = ANY (ARRAY['csv'::text, 'docx'::text, 'pdf'::text, 'zip'::text])))
);

-- public.insolvency_priority_claims
create table if not exists public.insolvency_priority_claims (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  creditor_id uuid not null,
  priority_subtype priority_claim_subtype not null,
  tax_period_from date,
  tax_period_to date,
  tax_notice_number text,
  employment_period_from date,
  employment_period_to date,
  statutory_priority_cap numeric(18,0),
  priority_basis_text text,
  confirmed_priority_amount numeric(18,0) not null default 0,
  notes text,
  lifecycle_status lifecycle_status not null default 'active'::lifecycle_status,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_priority_claims_pkey PRIMARY KEY (id)
);

-- public.insolvency_repayment_allocations
create table if not exists public.insolvency_repayment_allocations (
  id uuid not null default gen_random_uuid(),
  plan_id uuid not null,
  creditor_id uuid not null,
  organization_id uuid not null,
  claim_class creditor_claim_class not null,
  original_claim_amount numeric(18,0) not null,
  allocated_amount numeric(18,0) not null,
  repayment_rate_pct numeric(7,4),
  monthly_installment numeric(18,0),
  secured_shortage_amount numeric(18,0),
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_repayment_allocations_pkey PRIMARY KEY (id),
  constraint insolvency_repayment_allocations_plan_id_creditor_id_key UNIQUE (plan_id, creditor_id)
);

-- public.insolvency_repayment_plans
create table if not exists public.insolvency_repayment_plans (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  version_number integer not null default 1,
  status repayment_plan_status not null default 'draft'::repayment_plan_status,
  insolvency_subtype insolvency_subtype,
  repayment_months integer not null,
  plan_start_date date,
  plan_end_date date,
  monthly_income numeric(18,0) not null default 0,
  monthly_living_cost numeric(18,0) not null default 0,
  monthly_disposable numeric(18,0) generated always as (GREATEST((0)::numeric, (monthly_income - monthly_living_cost))) stored,
  total_secured_claim numeric(18,0) not null default 0,
  total_priority_claim numeric(18,0) not null default 0,
  total_general_claim numeric(18,0) not null default 0,
  total_claim_amount numeric(18,0) generated always as (((total_secured_claim + total_priority_claim) + total_general_claim)) stored,
  total_repayment_amount numeric(18,0),
  general_repayment_pool numeric(18,0),
  general_repayment_rate_pct numeric(7,4),
  filed_at date,
  court_case_number text,
  approved_at date,
  rejection_reason text,
  notes text,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint insolvency_repayment_plans_pkey PRIMARY KEY (id),
  constraint insolvency_repayment_plans_case_id_version_number_key UNIQUE (case_id, version_number),
  constraint insolvency_repayment_plans_repayment_months_check CHECK ((repayment_months = ANY (ARRAY[36, 60])))
);

-- public.insolvency_ruleset_constants
create table if not exists public.insolvency_ruleset_constants (
  id uuid not null default gen_random_uuid(),
  ruleset_key text not null,
  display_name text not null,
  legal_basis text,
  effective_from date not null,
  effective_to date,
  value_amount numeric(18,0),
  value_pct numeric(6,4),
  region_code text,
  notes text,
  created_at timestamp with time zone not null default now(),
  constraint insolvency_ruleset_constants_pkey PRIMARY KEY (id),
  constraint insolvency_ruleset_constants_ruleset_key_effective_from_key UNIQUE (ruleset_key, effective_from)
);

-- public.invitations
create table if not exists public.invitations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid,
  kind invitation_kind not null,
  status invitation_status not null default 'pending'::invitation_status,
  email citext not null,
  requested_role membership_role,
  token_hash text not null,
  share_token text,
  token_hint text,
  note text,
  created_by uuid,
  accepted_by uuid,
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  case_client_id uuid,
  invited_name text,
  actor_category text,
  role_template_key text,
  case_scope_policy text,
  permissions_override jsonb not null default '{}'::jsonb,
  revoked_at timestamp with time zone,
  constraint invitations_pkey PRIMARY KEY (id),
  constraint invitations_share_token_key UNIQUE (share_token),
  constraint invitations_token_hash_key UNIQUE (token_hash),
  constraint invitations_check CHECK ((((kind = 'staff_invite'::invitation_kind) AND (requested_role IS NOT NULL) AND (case_id IS NULL)) OR ((kind = 'client_invite'::invitation_kind) AND (case_id IS NOT NULL)))),
  constraint invitations_staff_fields_check CHECK ((((kind = 'staff_invite'::invitation_kind) AND (requested_role IS NOT NULL) AND (case_id IS NULL)) OR ((kind = 'client_invite'::invitation_kind) AND (case_id IS NOT NULL))))
);

-- public.invoice_items
create table if not exists public.invoice_items (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid not null,
  billing_entry_id uuid,
  title text not null,
  description text,
  amount numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint invoice_items_pkey PRIMARY KEY (id)
);

-- public.invoices
create table if not exists public.invoices (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  billing_owner_case_organization_id uuid not null,
  bill_to_party_kind billing_party_kind not null,
  bill_to_case_client_id uuid,
  bill_to_case_organization_id uuid,
  invoice_no text not null,
  status invoice_status not null default 'draft'::invoice_status,
  title text not null,
  description text,
  subtotal_amount numeric(18,2) not null default 0,
  tax_amount numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  issued_at timestamp with time zone,
  due_on date,
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  pdf_storage_path text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint invoices_pkey PRIMARY KEY (id),
  constraint invoices_invoice_no_key UNIQUE (invoice_no)
);

-- public.kakao_notification_outbox
create table if not exists public.kakao_notification_outbox (
  id uuid not null default gen_random_uuid(),
  notification_id uuid,
  recipient_profile_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'::text,
  failed_reason text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint kakao_notification_outbox_pkey PRIMARY KEY (id)
);

-- public.member_private_profiles
create table if not exists public.member_private_profiles (
  profile_id uuid not null,
  resident_number_ciphertext text,
  resident_number_masked text,
  address_line1_ciphertext text,
  address_line2_ciphertext text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint member_private_profiles_pkey PRIMARY KEY (profile_id)
);

-- public.notification_channel_preferences
create table if not exists public.notification_channel_preferences (
  profile_id uuid not null,
  kakao_enabled boolean not null default true,
  kakao_important_only boolean not null default true,
  allow_case boolean not null default true,
  allow_schedule boolean not null default true,
  allow_client boolean not null default true,
  allow_collaboration boolean not null default true,
  updated_at timestamp with time zone not null default now(),
  constraint notification_channel_preferences_pkey PRIMARY KEY (profile_id)
);

-- public.notifications
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  case_id uuid,
  recipient_profile_id uuid not null,
  kind notification_kind not null default 'generic'::notification_kind,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  requires_action boolean not null default false,
  resolved_at timestamp with time zone,
  action_label text,
  action_href text,
  action_entity_type text,
  action_target_id uuid,
  trashed_at timestamp with time zone,
  trashed_by uuid,
  snoozed_until timestamp with time zone,
  notification_type text not null default 'generic'::text,
  entity_type text not null default 'collaboration'::text,
  entity_id text,
  priority text not null default 'normal'::text,
  status text not null default 'active'::text,
  destination_type text not null default 'internal_route'::text,
  destination_url text not null default '/dashboard'::text,
  destination_params jsonb not null default '{}'::jsonb,
  archived_at timestamp with time zone,
  deleted_at timestamp with time zone,
  constraint notifications_pkey PRIMARY KEY (id),
  constraint notifications_entity_type_check CHECK ((entity_type = ANY (ARRAY['case'::text, 'schedule'::text, 'client'::text, 'collaboration'::text]))),
  constraint notifications_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'normal'::text, 'low'::text]))),
  constraint notifications_status_check CHECK ((status = ANY (ARRAY['active'::text, 'read'::text, 'resolved'::text, 'archived'::text, 'deleted'::text])))
);

-- public.org_settlement_entries
create table if not exists public.org_settlement_entries (
  id uuid not null default gen_random_uuid(),
  case_id uuid,
  source_case_organization_id uuid not null,
  target_case_organization_id uuid not null,
  status settlement_status not null default 'draft'::settlement_status,
  title text not null,
  description text,
  amount numeric(18,2) not null default 0,
  due_on date,
  paid_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint org_settlement_entries_pkey PRIMARY KEY (id)
);

-- public.organization_collaboration_case_shares
create table if not exists public.organization_collaboration_case_shares (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  case_id uuid not null,
  shared_by_organization_id uuid not null,
  shared_by_profile_id uuid not null,
  permission_scope text not null default 'view'::text,
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_collaboration_case_shares_pkey PRIMARY KEY (id),
  constraint organization_collaboration_case_shares_hub_id_case_id_key UNIQUE (hub_id, case_id),
  constraint organization_collaboration_case_shares_permission_scope_check CHECK ((permission_scope = ANY (ARRAY['view'::text, 'reference'::text, 'collaborate'::text]))) NOT VALID
);

-- public.organization_collaboration_hubs
create table if not exists public.organization_collaboration_hubs (
  id uuid not null default gen_random_uuid(),
  primary_organization_id uuid not null,
  partner_organization_id uuid not null,
  request_id uuid,
  created_by_profile_id uuid,
  title text not null,
  summary text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_collaboration_hubs_pkey PRIMARY KEY (id),
  constraint organization_collaboration_hubs_org_pair_check CHECK ((primary_organization_id <> partner_organization_id)),
  constraint organization_collaboration_hubs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);

-- public.organization_collaboration_messages
create table if not exists public.organization_collaboration_messages (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  organization_id uuid not null,
  sender_profile_id uuid not null,
  case_id uuid,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint organization_collaboration_messages_pkey PRIMARY KEY (id),
  constraint organization_collaboration_messages_body_check CHECK ((char_length(TRIM(BOTH FROM body)) > 0))
);

-- public.organization_collaboration_reads
create table if not exists public.organization_collaboration_reads (
  id uuid not null default gen_random_uuid(),
  hub_id uuid not null,
  organization_id uuid not null,
  profile_id uuid not null,
  last_read_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_collaboration_reads_pkey PRIMARY KEY (id),
  constraint organization_collaboration_reads_hub_id_profile_id_key UNIQUE (hub_id, profile_id)
);

-- public.organization_collaboration_requests
create table if not exists public.organization_collaboration_requests (
  id uuid not null default gen_random_uuid(),
  source_organization_id uuid not null,
  target_organization_id uuid not null,
  requested_by_profile_id uuid not null,
  reviewed_by_profile_id uuid,
  approved_hub_id uuid,
  title text not null,
  proposal_note text,
  response_note text,
  status collaboration_request_status not null default 'pending'::collaboration_request_status,
  reviewed_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_collaboration_requests_pkey PRIMARY KEY (id),
  constraint organization_collaboration_requests_source_target_check CHECK ((source_organization_id <> target_organization_id))
);

-- public.organization_exit_requests
create table if not exists public.organization_exit_requests (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  requested_by_profile_id uuid not null,
  reason text,
  status text not null default 'pending'::text,
  reviewed_by_profile_id uuid,
  reviewed_note text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint organization_exit_requests_pkey PRIMARY KEY (id),
  constraint organization_exit_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);

-- public.organization_membership_permission_overrides
create table if not exists public.organization_membership_permission_overrides (
  id uuid not null default gen_random_uuid(),
  organization_membership_id uuid not null,
  permission_key text not null,
  effect permission_override_effect not null,
  reason text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint organization_membership_permission_overrides_pkey PRIMARY KEY (id),
  constraint organization_membership_permi_organization_membership_id_pe_key UNIQUE (organization_membership_id, permission_key)
);

-- public.organization_memberships
create table if not exists public.organization_memberships (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  profile_id uuid not null,
  role membership_role not null,
  status membership_status not null default 'active'::membership_status,
  title text,
  is_primary boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  permissions jsonb not null default '{}'::jsonb,
  actor_category org_actor_category not null default 'staff'::org_actor_category,
  permission_template_key text,
  case_scope_policy case_scope_policy not null default 'assigned_cases_only'::case_scope_policy,
  constraint organization_memberships_pkey PRIMARY KEY (id),
  constraint organization_memberships_organization_id_profile_id_key UNIQUE (organization_id, profile_id)
);

-- public.organization_relations
create table if not exists public.organization_relations (
  id uuid not null default gen_random_uuid(),
  source_organization_id uuid not null,
  target_organization_id uuid not null,
  relation_type organization_relation_type not null,
  is_active boolean not null default true,
  note text,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint organization_relations_pkey PRIMARY KEY (id),
  constraint organization_relations_source_organization_id_target_organi_key UNIQUE (source_organization_id, target_organization_id, relation_type)
);

-- public.organization_settings
create table if not exists public.organization_settings (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  key text not null,
  value_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid,
  updated_at timestamp with time zone not null default now(),
  constraint organization_settings_pkey PRIMARY KEY (id),
  constraint organization_settings_organization_id_key_key UNIQUE (organization_id, key)
);

-- public.organization_signup_requests
create table if not exists public.organization_signup_requests (
  id uuid not null default gen_random_uuid(),
  requester_profile_id uuid,
  requester_email citext not null,
  organization_name text not null,
  business_number text,
  representative_name text,
  representative_title text,
  contact_phone text,
  note text,
  status organization_signup_status not null default 'pending'::organization_signup_status,
  reviewed_by uuid,
  reviewed_note text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_kind organization_kind not null default 'law_firm'::organization_kind,
  website_url text,
  requested_modules jsonb not null default '[]'::jsonb,
  approved_organization_id uuid,
  business_registration_document_path text,
  business_registration_document_name text,
  business_registration_document_mime_type text,
  business_registration_document_size integer,
  business_registration_verification_status text not null default 'pending_review'::text,
  business_registration_verification_note text,
  business_registration_verified_number text,
  business_registration_verified_at timestamp with time zone,
  approval_locked_by_profile_id uuid,
  approval_locked_at timestamp with time zone,
  organization_industry text,
  constraint organization_signup_requests_pkey PRIMARY KEY (id),
  constraint organization_signup_requests_business_registration_verification CHECK ((business_registration_verification_status = ANY (ARRAY['pending_review'::text, 'matched'::text, 'mismatch'::text, 'unreadable'::text]))),
  constraint organization_signup_requests_status_rejected_requires_note CHECK (((status <> 'rejected'::organization_signup_status) OR (reviewed_note IS NOT NULL)))
);

-- public.organization_staff_temp_credentials
create table if not exists public.organization_staff_temp_credentials (
  profile_id uuid not null,
  organization_id uuid not null,
  login_id text not null,
  login_id_normalized text not null,
  login_email citext not null,
  contact_email citext,
  contact_phone text,
  issued_by uuid,
  must_change_password boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_password_changed_at timestamp with time zone,
  constraint organization_staff_temp_credentials_pkey PRIMARY KEY (profile_id),
  constraint organization_staff_temp_credentials_login_email_key UNIQUE (login_email)
);

-- public.organization_subscription_states
create table if not exists public.organization_subscription_states (
  organization_id uuid not null,
  state subscription_state not null default 'active'::subscription_state,
  plan_code text,
  trial_start_at timestamp with time zone,
  trial_end_at timestamp with time zone,
  renewal_due_at timestamp with time zone,
  past_due_started_at timestamp with time zone,
  locked_soft_at timestamp with time zone,
  locked_hard_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  export_allowed_when_cancelled boolean not null default false,
  lock_reason text,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_subscription_states_pkey PRIMARY KEY (organization_id)
);

-- public.organizations
create table if not exists public.organizations (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  name text not null,
  business_number text,
  representative_name text,
  representative_title text,
  email citext,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  lifecycle_status lifecycle_status not null default 'active'::lifecycle_status,
  retention_class retention_class not null default 'commercial_10y'::retention_class,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  kind organization_kind not null default 'law_firm'::organization_kind,
  enabled_modules jsonb not null default '{}'::jsonb,
  website_url text,
  onboarding_status text not null default 'approved'::text,
  is_directory_public boolean not null default true,
  source_signup_request_id uuid,
  is_platform_root boolean not null default false,
  organization_industry text,
  constraint organizations_pkey PRIMARY KEY (id),
  constraint organizations_slug_key UNIQUE (slug),
  constraint organizations_slug_check CHECK ((slug ~ '^[a-z0-9-]+$'::text))
);

-- public.payment_allocations
create table if not exists public.payment_allocations (
  id uuid not null default gen_random_uuid(),
  payment_id uuid not null,
  invoice_id uuid not null,
  invoice_item_id uuid,
  amount numeric(18,2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint payment_allocations_pkey PRIMARY KEY (id)
);

-- public.payments
create table if not exists public.payments (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  billing_owner_case_organization_id uuid not null,
  payer_party_kind billing_party_kind not null,
  payer_case_client_id uuid,
  payer_case_organization_id uuid,
  payment_status payment_status not null default 'pending'::payment_status,
  payment_method payment_method not null default 'bank_transfer'::payment_method,
  amount numeric(18,2) not null default 0,
  received_at timestamp with time zone not null,
  reference_text text,
  note text,
  confirmed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint payments_pkey PRIMARY KEY (id)
);

-- public.permission_template_items
create table if not exists public.permission_template_items (
  id uuid not null default gen_random_uuid(),
  template_key text not null,
  permission_key text not null,
  created_at timestamp with time zone not null default now(),
  constraint permission_template_items_pkey PRIMARY KEY (id),
  constraint permission_template_items_template_key_permission_key_key UNIQUE (template_key, permission_key)
);

-- public.permission_templates
create table if not exists public.permission_templates (
  key text not null,
  display_name text not null,
  actor_category org_actor_category not null,
  description text,
  is_system boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint permission_templates_pkey PRIMARY KEY (key)
);

-- public.platform_runtime_settings
create table if not exists public.platform_runtime_settings (
  singleton boolean not null default true,
  platform_organization_id uuid not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint platform_runtime_settings_pkey PRIMARY KEY (singleton),
  constraint platform_runtime_settings_singleton_check CHECK ((singleton = true))
);

-- public.platform_settings
create table if not exists public.platform_settings (
  key text not null,
  value_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid,
  updated_at timestamp with time zone not null default now(),
  constraint platform_settings_pkey PRIMARY KEY (key)
);

-- public.profiles
create table if not exists public.profiles (
  id uuid not null,
  email citext not null,
  full_name text not null,
  avatar_url text,
  phone_e164 text,
  platform_role platform_role not null default 'standard'::platform_role,
  is_active boolean not null default true,
  default_organization_id uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_client_account boolean not null default false,
  client_account_status text not null default 'active'::text,
  client_account_status_changed_at timestamp with time zone not null default now(),
  client_account_status_reason text,
  client_last_approved_at timestamp with time zone,
  legal_name text,
  legal_name_confirmed_at timestamp with time zone,
  must_change_password boolean not null default false,
  must_complete_profile boolean not null default false,
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_email_key UNIQUE (email),
  constraint profiles_client_account_status_check CHECK ((client_account_status = ANY (ARRAY['active'::text, 'pending_initial_approval'::text, 'pending_reapproval'::text])))
);

-- public.rate_limit_buckets
create table if not exists public.rate_limit_buckets (
  id text not null,
  attempts integer not null default 1,
  window_start timestamp with time zone not null default timezone('utc'::text, now()),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint rate_limit_buckets_pkey PRIMARY KEY (id),
  constraint rate_limit_buckets_attempts_check CHECK ((attempts >= 0))
);

-- public.rehabilitation_affidavits
create table if not exists public.rehabilitation_affidavits (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  debt_history text,
  property_change text,
  income_change text,
  living_situation text,
  repay_feasibility text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid not null,
  constraint rehabilitation_affidavits_pkey PRIMARY KEY (id),
  constraint uq_rehab_affidavit_case UNIQUE (case_id)
);

-- public.rehabilitation_applications
create table if not exists public.rehabilitation_applications (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  applicant_name text,
  resident_number_front text,
  resident_number_hash text,
  registered_address jsonb default '{}'::jsonb,
  current_address jsonb default '{}'::jsonb,
  office_address jsonb default '{}'::jsonb,
  service_address jsonb default '{}'::jsonb,
  service_recipient text,
  phone_home text,
  phone_mobile text,
  return_account text,
  income_type text,
  employer_name text,
  "position" text,
  work_period text,
  has_extra_income boolean not null default false,
  extra_income_name text,
  extra_income_source text,
  application_date date,
  court_name text,
  court_detail text,
  judge_division text,
  case_year integer,
  case_number text,
  repayment_start_date date,
  repayment_start_uncertain boolean not null default false,
  repayment_start_day integer,
  trustee_bank_name text,
  trustee_bank_account text,
  prior_applications jsonb default '[]'::jsonb,
  agent_type text,
  agent_name text,
  agent_phone text,
  agent_email text,
  agent_fax text,
  agent_address jsonb default '{}'::jsonb,
  info_request_form boolean not null default false,
  ecourt_agreement boolean not null default false,
  delegation_form boolean not null default false,
  lifecycle_status text not null default 'active'::text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  agent_law_firm text,
  representative_lawyer text,
  concurrent_discharge boolean not null default true,
  constraint rehabilitation_applications_pkey PRIMARY KEY (id),
  constraint uq_rehab_app_case UNIQUE (case_id),
  constraint rehabilitation_applications_agent_type_check CHECK ((agent_type = ANY (ARRAY['법무사'::text, '변호사'::text, '기타'::text]))),
  constraint rehabilitation_applications_income_type_check CHECK ((income_type = ANY (ARRAY['salary'::text, 'business'::text])))
);

-- public.rehabilitation_creditor_settings
create table if not exists public.rehabilitation_creditor_settings (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  list_date date,
  bond_date date,
  repay_type text not null default 'sequential'::text,
  summary_table boolean not null default false,
  copy_with_evidence boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid not null,
  constraint rehabilitation_creditor_settings_pkey PRIMARY KEY (id),
  constraint uq_rehab_cred_settings UNIQUE (case_id),
  constraint rehabilitation_creditor_settings_repay_type_check CHECK ((repay_type = ANY (ARRAY['sequential'::text, 'combined'::text])))
);

-- public.rehabilitation_creditors
create table if not exists public.rehabilitation_creditors (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  organization_id uuid not null,
  bond_number integer not null,
  classify text not null default '자연인'::text,
  creditor_name text not null default ''::text,
  branch_name text,
  postal_code text,
  address text,
  phone text,
  fax text,
  mobile text,
  bond_cause text,
  capital bigint not null default 0,
  capital_compute text,
  interest bigint not null default 0,
  interest_compute text,
  delay_rate numeric(6,4) not null default 0,
  bond_content text,
  is_secured boolean not null default false,
  secured_property_id uuid,
  lien_priority integer not null default 0,
  lien_type text,
  max_claim_amount bigint not null default 0,
  has_priority_repay boolean not null default false,
  is_unsettled boolean not null default false,
  is_annuity_debt boolean not null default false,
  apply_restructuring boolean not null default false,
  attachments integer[] not null default '{}'::integer[],
  unsettled_reason text,
  unsettled_amount bigint not null default 0,
  unsettled_text text,
  guarantor_name text,
  guarantor_resident_hash text,
  guarantor_amount bigint not null default 0,
  guarantor_text text,
  repay_ratio numeric(10,8) not null default 0,
  repay_monthly bigint not null default 0,
  repay_total bigint not null default 0,
  repay_capital bigint not null default 0,
  repay_interest bigint not null default 0,
  sort_order integer not null default 0,
  lifecycle_status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  secured_collateral_value numeric(18,0) not null default 0,
  is_other_unconfirmed boolean not null default false,
  has_objection boolean not null default false,
  remaining_unsecured bigint not null default 0,
  constraint rehabilitation_creditors_pkey PRIMARY KEY (id),
  constraint creditors_secured_requires_collateral CHECK (((NOT is_secured) OR (secured_collateral_value > (0)::numeric))),
  constraint creditors_secured_xor_unconfirmed CHECK ((NOT (is_secured AND is_other_unconfirmed))),
  constraint rehabilitation_creditors_classify_check CHECK ((classify = ANY (ARRAY['자연인'::text, '법인'::text, '국가'::text, '지방자치단체'::text])))
);

-- public.rehabilitation_family_members
create table if not exists public.rehabilitation_family_members (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  relation text not null,
  member_name text not null,
  age text,
  cohabitation text,
  occupation text,
  monthly_income bigint not null default 0,
  total_property bigint not null default 0,
  is_dependent boolean not null default false,
  sort_order integer not null default 0,
  lifecycle_status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid not null,
  constraint rehabilitation_family_members_pkey PRIMARY KEY (id)
);

-- public.rehabilitation_income_settings
create table if not exists public.rehabilitation_income_settings (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  gross_salary bigint not null default 0,
  net_salary bigint not null default 0,
  extra_income bigint not null default 0,
  median_income_year integer not null default 2026,
  living_cost bigint not null default 0,
  living_cost_direct boolean not null default false,
  living_cost_range text not null default 'within'::text,
  extra_living_cost bigint not null default 0,
  extra_living_percent numeric(5,2) not null default 0,
  trustee_comm_rate numeric(5,2) not null default 0,
  child_support bigint not null default 0,
  dispose_amount bigint not null default 0,
  dispose_period text,
  repay_period_option text default 'capital36'::text,
  repay_months integer default 60,
  repay_rate_display text not null default '2'::text,
  monthly_available bigint not null default 0,
  monthly_repay bigint not null default 0,
  total_repay_amount bigint not null default 0,
  repay_rate numeric(10,4) not null default 0,
  total_debt bigint not null default 0,
  total_capital bigint not null default 0,
  total_interest bigint not null default 0,
  secured_debt bigint not null default 0,
  unsecured_debt bigint not null default 0,
  liquidation_value bigint not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  living_cost_rate numeric(5,2) not null default 100,
  period_setting smallint not null default 6,
  repayment_method text not null default '매월'::text,
  liquidation_guaranteed boolean not null default false,
  trustee_account text,
  trustee_name text,
  income_breakdown jsonb default '[]'::jsonb,
  expense_breakdown jsonb default '[]'::jsonb,
  organization_id uuid not null,
  constraint rehabilitation_income_settings_pkey PRIMARY KEY (id),
  constraint uq_rehab_income_case UNIQUE (case_id),
  constraint rehabilitation_income_settings_living_cost_range_check CHECK ((living_cost_range = ANY (ARRAY['within'::text, 'exceed'::text]))),
  constraint rehabilitation_income_settings_period_setting_check CHECK (((period_setting >= 1) AND (period_setting <= 6)))
);

-- public.rehabilitation_plan_sections
create table if not exists public.rehabilitation_plan_sections (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  section_number integer not null,
  content text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid not null,
  constraint rehabilitation_plan_sections_pkey PRIMARY KEY (id),
  constraint uq_rehab_plan_section UNIQUE (case_id, section_number),
  constraint rehabilitation_plan_sections_section_number_check CHECK (((section_number >= 1) AND (section_number <= 10)))
);

-- public.rehabilitation_prohibition_orders
create table if not exists public.rehabilitation_prohibition_orders (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  organization_id uuid not null,
  court_name text,
  applicant_name text,
  resident_number_front text,
  registered_address text,
  current_address text,
  has_agent boolean not null default false,
  agent_type text,
  agent_name text,
  agent_phone text,
  agent_fax text,
  agent_address text,
  agent_law_firm text,
  total_debt_amount bigint not null default 0,
  creditor_count integer not null default 0,
  reason_detail text,
  attachments text[] not null default '{}'::text[],
  application_date date,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rehabilitation_prohibition_orders_pkey PRIMARY KEY (id),
  constraint uq_rehab_prohibition_order UNIQUE (case_id),
  constraint rehabilitation_prohibition_orders_agent_type_check CHECK ((agent_type = ANY (ARRAY['법무사'::text, '변호사'::text, '기타'::text])))
);

-- public.rehabilitation_properties
create table if not exists public.rehabilitation_properties (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  category text not null,
  detail text,
  amount bigint not null default 0,
  seizure text not null default '무'::text,
  repay_use text not null default '무'::text,
  is_protection boolean not null default false,
  sort_order integer not null default 0,
  lifecycle_status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  has_lien boolean not null default false,
  lien_holder text,
  lien_amount bigint not null default 0,
  secured_property_id uuid,
  liquidation_value bigint not null default 0,
  structured_detail jsonb default '{}'::jsonb,
  organization_id uuid not null,
  constraint rehabilitation_properties_pkey PRIMARY KEY (id)
);

-- public.rehabilitation_property_deductions
create table if not exists public.rehabilitation_property_deductions (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  category text not null,
  deduction_amount bigint not null default 0,
  organization_id uuid not null,
  constraint rehabilitation_property_deductions_pkey PRIMARY KEY (id),
  constraint uq_rehab_prop_deduction UNIQUE (case_id, category)
);

-- public.rehabilitation_secured_properties
create table if not exists public.rehabilitation_secured_properties (
  id uuid not null default gen_random_uuid(),
  case_id uuid not null,
  property_type text not null default '부동산'::text,
  description text,
  market_value bigint not null default 0,
  valuation_rate numeric(5,2) not null default 70,
  note text,
  sort_order integer not null default 0,
  lifecycle_status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  organization_id uuid not null,
  constraint rehabilitation_secured_properties_pkey PRIMARY KEY (id)
);

-- public.setting_catalog
create table if not exists public.setting_catalog (
  key text not null,
  domain text not null,
  scope setting_scope not null,
  value_type setting_value_type not null,
  default_value_json jsonb not null,
  editable_by_platform_admin boolean not null default true,
  editable_by_org_admin boolean not null default false,
  is_read_only boolean not null default false,
  validator_schema_key text,
  cache_scope text not null default 'platform'::text,
  description text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint setting_catalog_pkey PRIMARY KEY (key)
);

-- public.setting_change_logs
create table if not exists public.setting_change_logs (
  id uuid not null default gen_random_uuid(),
  target_type setting_target_type not null,
  organization_id uuid,
  target_key text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  changed_by uuid,
  reason text,
  rolled_back_from_log_id uuid,
  created_at timestamp with time zone not null default now(),
  constraint setting_change_logs_pkey PRIMARY KEY (id)
);

-- public.support_access_requests
create table if not exists public.support_access_requests (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  organization_name_snapshot text not null,
  target_profile_id uuid not null,
  target_name_snapshot text not null,
  target_email_snapshot citext not null,
  requested_by uuid not null,
  requested_by_name text not null,
  approved_by uuid,
  approved_by_name text,
  reason text not null,
  approval_note text,
  status support_request_status not null default 'pending'::support_request_status,
  requested_at timestamp with time zone not null default now(),
  approved_at timestamp with time zone,
  expires_at timestamp with time zone not null,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint support_access_requests_pkey PRIMARY KEY (id)
);

-- Ensure sequence ownership for portability
alter sequence audit.change_log_id_seq owned by audit.change_log.id;

