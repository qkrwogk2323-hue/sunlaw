-- ============================================================
-- 001_extensions_schemas_types.sql
-- Regenerated squash — Batch 1: extensions + schemas + enums
-- Source: pg_dump-equivalent introspection of production DB (hyfdebinoirtluwpfmqx)
-- Strict dependency order: extensions → schemas → types → (tables in later file)
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSIONS (no-op if Supabase already provisioned them)
-- ------------------------------------------------------------
create schema if not exists extensions;

create extension if not exists "citext"             with schema extensions;
create extension if not exists "pg_trgm"            with schema extensions;
create extension if not exists "pgcrypto"           with schema extensions;
create extension if not exists "uuid-ossp"          with schema extensions;
-- pg_stat_statements, pg_graphql, supabase_vault: Supabase-managed, skip here.

-- Ensure extensions schema is on the search_path so unqualified `citext`,
-- `gen_random_uuid()`, etc. resolve (Supabase sets this at DB level; mirror that).
do $$
declare
  db_name text := current_database();
begin
  execute format('alter database %I set search_path = "$user", public, extensions', db_name);
end $$;
-- Apply to current session too (the ALTER DATABASE only affects future sessions).
set search_path = "$user", public, extensions;

-- ------------------------------------------------------------
-- 2. APPLICATION SCHEMAS
-- ------------------------------------------------------------
create schema if not exists app;
create schema if not exists audit;
-- 'public' exists by default.

-- ------------------------------------------------------------
-- 3. ENUM TYPES (64 types, public schema)
-- ------------------------------------------------------------
-- Wrapped in DO blocks to be idempotent (CREATE TYPE has no IF NOT EXISTS).
do $$ begin
  create type public.action_item_responsibility as enum ('client_self', 'client_visit', 'office_prepare');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.action_packet_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'stale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_agreement_type as enum ('retainer', 'flat_fee', 'success_fee', 'expense_reimbursement', 'installment_plan', 'internal_settlement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_entry_kind as enum ('retainer', 'success_fee', 'expense', 'invoice', 'payment', 'adjustment', 'retainer_fee', 'flat_fee', 'court_fee', 'service_fee', 'discount', 'internal_settlement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_party_kind as enum ('case_client', 'case_organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_status as enum ('draft', 'issued', 'partial', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_access_scope as enum ('full', 'collection_only', 'legal_only', 'billing_only', 'read_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_billing_scope as enum ('none', 'direct_client_billing', 'upstream_settlement', 'internal_settlement_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_client_link_status as enum ('linked', 'pending_unlink', 'unlinked', 'orphan_review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_client_orphan_reason as enum ('profile_detached', 'hub_detached', 'case_reassignment', 'source_deleted', 'manual_cleanup', 'migration_review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_client_relink_policy as enum ('manual_review', 'auto_when_profile_returns', 'auto_when_case_relinked', 'admin_override_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_communication_scope as enum ('internal_only', 'cross_org_only', 'client_visible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_hub_organization_status as enum ('active', 'pending', 'unlinked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_organization_role as enum ('managing_org', 'principal_client_org', 'collection_org', 'legal_counsel_org', 'co_counsel_org', 'partner_org');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_organization_status as enum ('active', 'pending', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_request_kind as enum ('question', 'document_submission', 'document_request', 'schedule_request', 'call_request', 'meeting_request', 'status_check', 'signature_request', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_request_status as enum ('open', 'in_review', 'waiting_client', 'completed', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_scope_policy as enum ('all_org_cases', 'assigned_cases_only', 'read_only_assigned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_status as enum ('intake', 'active', 'pending_review', 'approved', 'closed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_type as enum ('civil', 'debt_collection', 'execution', 'injunction', 'criminal', 'advisory', 'other', 'insolvency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.client_access_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.client_visibility as enum ('internal_only', 'client_visible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.collaboration_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.collateral_type as enum ('real_estate', 'vehicle', 'deposit_account', 'insurance', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_entry_status as enum ('projected', 'confirmed', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_plan_status as enum ('draft', 'fixed', 'superseded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compensation_target_kind as enum ('membership', 'organization');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.creditor_claim_class as enum ('secured', 'priority', 'general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.creditor_type as enum ('financial_institution', 'government', 'individual', 'corporation', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_kind as enum ('complaint', 'answer', 'brief', 'evidence', 'contract', 'order', 'notice', 'opinion', 'internal_memo', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.entity_type as enum ('individual', 'corporation');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.filing_bundle_status as enum ('generating', 'ready', 'submitted', 'expired', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ingestion_document_type as enum ('debt_certificate', 'registration_abstract', 'resident_abstract', 'income_certificate', 'asset_declaration', 'correction_order', 'correction_recommendation', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ingestion_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insolvency_subtype as enum ('individual_rehabilitation', 'individual_bankruptcy', 'corporate_rehabilitation', 'corporate_bankruptcy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_kind as enum ('staff_invite', 'client_invite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'written_off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lifecycle_status as enum ('active', 'soft_deleted', 'archived', 'legal_hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_role as enum ('org_owner', 'org_manager', 'org_staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('active', 'invited', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_kind as enum ('case_assigned', 'approval_requested', 'approval_completed', 'schedule_due', 'collection_update', 'support_request', 'generic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_actor_category as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_kind as enum ('law_firm', 'collection_company', 'mixed_practice', 'corporate_legal_team', 'other', 'platform_management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_relation_type as enum ('same_group', 'same_legal_entity', 'partner', 'collection_partner', 'legal_partner', 'shared_operations', 'internal_affiliate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_signup_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.party_role as enum ('creditor', 'debtor', 'plaintiff', 'defendant', 'respondent', 'petitioner', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'card', 'cash', 'offset', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.permission_override_effect as enum ('grant', 'deny');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_role as enum ('platform_admin', 'platform_support', 'standard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority_claim_subtype as enum ('national_tax', 'local_tax', 'social_insurance', 'wage_arrears', 'lease_deposit', 'child_support', 'other_priority');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recovery_activity_kind as enum ('call', 'letter', 'visit', 'negotiation', 'payment', 'asset_check', 'legal_action', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.repayment_plan_status as enum ('draft', 'confirmed', 'filed', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.retention_class as enum ('commercial_10y', 'document_5y', 'litigation_25y', 'permanent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.schedule_kind as enum ('hearing', 'deadline', 'meeting', 'reminder', 'collection_visit', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setting_scope as enum ('platform', 'organization', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setting_target_type as enum ('platform_setting', 'organization_setting', 'content_resource', 'feature_flag');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setting_value_type as enum ('string', 'integer', 'decimal', 'boolean', 'string_array', 'json');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.settlement_status as enum ('draft', 'confirmed', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_state as enum ('trialing', 'active', 'past_due', 'locked_soft', 'locked_hard', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_request_status as enum ('pending', 'approved', 'rejected', 'expired', 'consumed');
exception when duplicate_object then null; end $$;
