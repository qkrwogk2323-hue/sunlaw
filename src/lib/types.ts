export type PlatformRole = 'platform_admin' | 'platform_support' | 'standard';
export type MembershipRole = 'org_owner' | 'org_manager' | 'org_staff';
export type ActorCategory = 'admin' | 'staff';
export type CaseScopePolicy = 'all_org_cases' | 'assigned_cases_only' | 'read_only_assigned';

export type PermissionKey =
  | 'team_invite'
  | 'team_permission_manage'
  | 'organization_settings_manage'
  | 'case_create'
  | 'case_edit'
  | 'case_delete'
  | 'case_assign'
  | 'case_stage_manage'
  | 'document_create'
  | 'document_edit'
  | 'document_approve'
  | 'document_share'
  | 'document_export'
  | 'request_create'
  | 'request_manage'
  | 'request_close'
  | 'schedule_create'
  | 'schedule_edit'
  | 'schedule_confirm'
  | 'schedule_manage'
  | 'calendar_export'
  | 'billing_view'
  | 'billing_issue'
  | 'billing_payment_confirm'
  | 'billing_export'
  | 'billing_manage'
  | 'collection_view'
  | 'collection_contact_manage'
  | 'collection_payment_plan_manage'
  | 'collection_payment_confirm'
  | 'collection_metrics_view'
  | 'collection_manage'
  | 'legal_request_create'
  | 'legal_progress_view'
  | 'legal_document_create'
  | 'legal_document_approve'
  | 'legal_filing_manage'
  | 'asset_inquiry_execute'
  | 'notification_create'
  | 'report_view'
  | 'report_export'
  | 'case_board_export'
  | 'collection_compensation_view_self'
  | 'collection_compensation_view_team'
  | 'collection_compensation_view_org'
  | 'collection_compensation_manage_plan'
  | 'collection_compensation_fix_plan'
  | 'collection_compensation_export'
  | 'settlement_view'
  | 'settlement_manage'
  | 'settlement_export'
  | 'user_manage';

export type PermissionSet = Partial<Record<PermissionKey, boolean>>;

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
  kind?: 'platform_management' | 'law_firm' | 'collection_company' | 'mixed_practice' | 'corporate_legal_team' | 'other' | null;
  enabled_modules?: Record<string, boolean> | null;
  is_platform_root?: boolean;
}

export interface MembershipPermissionOverride {
  permission_key: PermissionKey;
  effect: 'grant' | 'deny';
}

export interface Membership {
  id: string;
  organization_id: string;
  role: MembershipRole;
  status: string;
  title: string | null;
  permissions?: PermissionSet;
  actor_category?: ActorCategory;
  permission_template_key?: string | null;
  case_scope_policy?: CaseScopePolicy;
  permission_overrides?: MembershipPermissionOverride[];
  organization?: OrganizationOption | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  legal_name?: string | null;
  legal_name_confirmed_at?: string | null;
  platform_role: PlatformRole;
  default_organization_id: string | null;
  is_active: boolean;
  is_client_account: boolean;
  client_account_status: 'active' | 'pending_initial_approval' | 'pending_reapproval';
  client_account_status_changed_at: string | null;
  client_account_status_reason?: string | null;
  client_last_approved_at?: string | null;
  must_change_password?: boolean;
  must_complete_profile?: boolean;
}

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
  memberships: Membership[];
}

export interface CaseRecord {
  id: string;
  organization_id: string;
  reference_no: string | null;
  title: string;
  case_type: string;
  case_status: string;
  stage_key?: string | null;
  stage_template_key?: string | null;
  principal_amount: number | null;
  opened_on: string | null;
  updated_at: string;
  court_name: string | null;
  case_number: string | null;
  lifecycle_status: string;
  module_flags?: Record<string, boolean> | null;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  kind: string;
  created_at: string;
  read_at: string | null;
  case_id: string | null;
}
