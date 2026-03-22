-- 0059: 누락된 감사 트리거 전체 적용
-- 기존 0005_audit.sql에서 빠진 29개 테이블에 audit.capture_row_change() 트리거 추가.
-- 우선순위: 플랫폼 설정/권한 > 개인정보 > 협업/운영

-- ============================================================
-- 🔴 최우선: 플랫폼 설정 & 권한 변경
-- ============================================================

drop trigger if exists audit_platform_settings on public.platform_settings;
create trigger audit_platform_settings
  after insert or update or delete on public.platform_settings
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_platform_runtime_settings on public.platform_runtime_settings;
create trigger audit_platform_runtime_settings
  after insert or update or delete on public.platform_runtime_settings
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_membership_permission_overrides on public.organization_membership_permission_overrides;
create trigger audit_membership_permission_overrides
  after insert or update or delete on public.organization_membership_permission_overrides
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_settings on public.organization_settings;
create trigger audit_organization_settings
  after insert or update or delete on public.organization_settings
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_subscription_states on public.organization_subscription_states;
create trigger audit_organization_subscription_states
  after insert or update or delete on public.organization_subscription_states
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_billing_subscription_events on public.billing_subscription_events;
create trigger audit_billing_subscription_events
  after insert or update or delete on public.billing_subscription_events
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_feature_flags on public.feature_flags;
create trigger audit_feature_flags
  after insert or update or delete on public.feature_flags
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_setting_catalog on public.setting_catalog;
create trigger audit_setting_catalog
  after insert or update or delete on public.setting_catalog
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_setting_change_logs on public.setting_change_logs;
create trigger audit_setting_change_logs
  after insert or update or delete on public.setting_change_logs
  for each row execute procedure audit.capture_row_change();

-- ============================================================
-- 🔴 최우선: 탈퇴 요청 & 조직 구성 변경
-- ============================================================

drop trigger if exists audit_organization_exit_requests on public.organization_exit_requests;
create trigger audit_organization_exit_requests
  after insert or update or delete on public.organization_exit_requests
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_organizations on public.case_organizations;
create trigger audit_case_organizations
  after insert or update or delete on public.case_organizations
  for each row execute procedure audit.capture_row_change();

-- ============================================================
-- 🟠 개인정보 관련
-- ============================================================

drop trigger if exists audit_case_party_private_profiles on public.case_party_private_profiles;
create trigger audit_case_party_private_profiles
  after insert or update or delete on public.case_party_private_profiles
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_member_private_profiles on public.member_private_profiles;
create trigger audit_member_private_profiles
  after insert or update or delete on public.member_private_profiles
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_client_access_requests on public.client_access_requests;
create trigger audit_client_access_requests
  after insert or update or delete on public.client_access_requests
  for each row execute procedure audit.capture_row_change();


drop trigger if exists audit_client_temp_credentials on public.client_temp_credentials;
create trigger audit_client_temp_credentials
  after insert or update or delete on public.client_temp_credentials
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_staff_temp_credentials on public.organization_staff_temp_credentials;
create trigger audit_organization_staff_temp_credentials
  after insert or update or delete on public.organization_staff_temp_credentials
  for each row execute procedure audit.capture_row_change();

-- ============================================================
-- 🟠 사건허브 접근 변경
-- ============================================================

drop trigger if exists audit_case_hubs on public.case_hubs;
create trigger audit_case_hubs
  after insert or update or delete on public.case_hubs
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_hub_members on public.case_hub_members;
create trigger audit_case_hub_members
  after insert or update or delete on public.case_hub_members
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_hub_organizations on public.case_hub_organizations;
create trigger audit_case_hub_organizations
  after insert or update or delete on public.case_hub_organizations
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_case_hub_activity on public.case_hub_activity;
create trigger audit_case_hub_activity
  after insert or update or delete on public.case_hub_activity
  for each row execute procedure audit.capture_row_change();

-- ============================================================
-- 🟡 협업 채널
-- ============================================================

drop trigger if exists audit_org_collab_hubs on public.organization_collaboration_hubs;
create trigger audit_org_collab_hubs
  after insert or update or delete on public.organization_collaboration_hubs
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_org_collab_messages on public.organization_collaboration_messages;
create trigger audit_org_collab_messages
  after insert or update or delete on public.organization_collaboration_messages
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_org_collab_reads on public.organization_collaboration_reads;
create trigger audit_org_collab_reads
  after insert or update or delete on public.organization_collaboration_reads
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_org_collab_requests on public.organization_collaboration_requests;
create trigger audit_org_collab_requests
  after insert or update or delete on public.organization_collaboration_requests
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_org_collab_case_shares on public.organization_collaboration_case_shares;
create trigger audit_org_collab_case_shares
  after insert or update or delete on public.organization_collaboration_case_shares
  for each row execute procedure audit.capture_row_change();

-- ============================================================
-- 🟡 운영/기타
-- ============================================================

drop trigger if exists audit_notification_channel_preferences on public.notification_channel_preferences;
create trigger audit_notification_channel_preferences
  after insert or update or delete on public.notification_channel_preferences
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_kakao_notification_outbox on public.kakao_notification_outbox;
create trigger audit_kakao_notification_outbox
  after insert or update or delete on public.kakao_notification_outbox
  for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_content_resources on public.content_resources;
create trigger audit_content_resources
  after insert or update or delete on public.content_resources
  for each row execute procedure audit.capture_row_change();
