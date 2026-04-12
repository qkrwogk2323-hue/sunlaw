-- ============================================================
-- 012_seed_data.sql
-- Consolidated seed/initial data setup
-- ============================================================

-- ============================================================
-- 1. STORAGE BUCKETS (from 0004_storage.sql)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do nothing;

-- Storage policies for case-files bucket
drop policy if exists "staff_can_upload_case_files" on storage.objects;
drop policy if exists "staff_can_update_case_files" on storage.objects;
drop policy if exists "staff_can_delete_case_files" on storage.objects;

create policy "staff_can_upload_case_files"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);

create policy "staff_can_update_case_files"
on storage.objects
for update to authenticated
using (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);

create policy "staff_can_delete_case_files"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'case-files'
  and (storage.foldername(name))[1] = 'org'
  and app.is_org_staff(((storage.foldername(name))[2])::uuid)
);

-- ============================================================
-- 2. DYNAMIC CONFIGURATION: SETTING CATALOG (from 0017)
-- ============================================================
insert into public.setting_catalog (
  key, domain, scope, value_type, default_value_json,
  editable_by_platform_admin, editable_by_org_admin, is_read_only,
  validator_schema_key, cache_scope, description
)
values
  ('invitations.staff_ttl_hours', 'security', 'platform', 'integer', '168'::jsonb, true, false, false, 'positive_integer', 'platform', '직원 초대 링크 만료 시간(시간)'),
  ('invitations.client_ttl_hours', 'security', 'platform', 'integer', '336'::jsonb, true, false, false, 'positive_integer', 'platform', '의뢰인 초대 링크 만료 시간(시간)'),
  ('onboarding.trial_days', 'security', 'platform', 'integer', '14'::jsonb, true, false, false, 'positive_integer', 'platform', 'Trial 조직 기본 사용일'),
  ('uploads.max_file_mb', 'infrastructure', 'platform', 'integer', '50'::jsonb, true, false, false, 'positive_integer', 'platform', '단일 파일 최대 업로드 용량(MB)'),
  ('uploads.allowed_mime_types', 'infrastructure', 'platform', 'string_array', '["application/pdf","image/jpeg","image/png"]'::jsonb, true, false, false, 'mime_array', 'platform', '허용 MIME 타입 목록'),
  ('exports.max_rows', 'infrastructure', 'platform', 'integer', '10000'::jsonb, true, false, false, 'positive_integer', 'platform', '내보내기 최대 행 수'),
  ('exports.enabled_formats', 'infrastructure', 'platform', 'string_array', '["xlsx","pdf","docx"]'::jsonb, true, false, false, 'string_array', 'platform', '내보내기 허용 형식'),
  ('billing.default_due_days', 'billing', 'both', 'integer', '14'::jsonb, true, true, false, 'positive_integer', 'organization', '청구서 기본 납기일(일)'),
  ('billing.default_currency', 'billing', 'platform', 'string', '"KRW"'::jsonb, true, false, false, 'currency_code', 'platform', '기본 화폐 코드'),
  ('collection.default_success_fee_rate', 'collection', 'both', 'decimal', '20'::jsonb, true, true, false, 'percentage', 'organization', '추심 성공보수 기본 제안 요율(실제 계약값 아님)'),
  ('portal.auto_reply_enabled', 'portal', 'both', 'boolean', 'true'::jsonb, true, true, false, 'boolean', 'organization', '의뢰인 포털 자동응답 활성화 여부'),
  ('portal.auto_reply_message', 'portal', 'both', 'string', '"평일 9시부터 18시 사이에 순차적으로 답변드립니다."'::jsonb, true, true, false, 'string', 'organization', '의뢰인 포털 자동응답 문구'),
  ('labels.case', 'labels', 'both', 'string', '"사건"'::jsonb, true, true, false, 'string', 'organization', '사건 기본 용어'),
  ('labels.client', 'labels', 'both', 'string', '"의뢰인"'::jsonb, true, true, false, 'string', 'organization', '의뢰인 기본 용어'),
  ('labels.request', 'labels', 'both', 'string', '"요청"'::jsonb, true, true, false, 'string', 'organization', '요청 기본 용어')
on conflict (key) do nothing;

-- ============================================================
-- 2a. CONTENT RESOURCES (from 0017)
-- ============================================================
insert into public.content_resources (
  namespace, resource_key, locale, organization_id, status, value_text, published_at
)
values
  ('landing', 'hero.title', 'ko-KR', null, 'published', '사건을 기록하는 도구가 아니라, 사건 단위로 협업하는 업무 시스템', now()),
  ('landing', 'hero.subtitle', 'ko-KR', null, 'published', '내부 사용자는 업무 중심 Workspace를, 의뢰인은 자기 사건 중심 Portal을 사용합니다.', now()),
  ('portal', 'welcome_message', 'ko-KR', null, 'published', '내 사건의 진행 현황, 문서, 요청, 일정, 청구를 한 곳에서 확인하세요.', now()),
  ('email', 'invite.client.subject', 'ko-KR', null, 'published', '[{{org_name}}] {{case_name}} 진행 상황을 확인해 주세요.', now())
on conflict do nothing;

-- ============================================================
-- 2b. FEATURE FLAGS (from 0017)
-- ============================================================
create unique index if not exists uq_feature_flags_scope
  on public.feature_flags(flag_key, coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));

insert into public.feature_flags (flag_key, organization_id, enabled, rollout_percentage)
select flag_key, organization_id, enabled, rollout_percentage
from (
  values
    ('client_portal.enabled', null::uuid, true, 100),
    ('collections.enabled', null::uuid, true, 100),
    ('hwpx_export.enabled', null::uuid, false, 100),
    ('trial_org_signup.enabled', null::uuid, true, 100)
) as v(flag_key, organization_id, enabled, rollout_percentage)
where not exists (
  select 1
  from public.feature_flags f
  where f.flag_key = v.flag_key
    and coalesce(f.organization_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(v.organization_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================================
-- 3. INSOLVENCY RULESET CONSTANTS SEED DATA
--    6 records: 소액임차, 최저생계비, 최소변제율
-- ============================================================
insert into public.insolvency_ruleset_constants (
  ruleset_key, category, value_number, unit, effective_from, effective_to, 
  notes, maintenance_mode
)
values
  -- 소액임차 (소액보증금 기준액 및 임대차 관련 기준)
  ('small_deposit_threshold', 'deposit_limit', 5000000, 'KRW', '2024-01-01', null, 
   '소액임차보증금 인정 기준액 (변제기간 결정 예외조건)', false),
  
  -- 최저생계비 (생활보호기준액)
  ('minimum_livelihood_1_person', 'livelihood_standard', 815000, 'KRW', '2024-01-01', null,
   '최저생계비 1인 (자활 면제/생계비 제외 기준)', false),
  ('minimum_livelihood_2_person', 'livelihood_standard', 1354000, 'KRW', '2024-01-01', null,
   '최저생계비 2인 (자활 면제/생계비 제외 기준)', false),
  
  -- 최소변제율
  ('minimum_repayment_rate_bankruptcy', 'repayment_rate', 25, 'percentage', '2024-01-01', null,
   '파산: 최소 변제율 기준 (불인정채권 제외)', false),
  ('minimum_repayment_rate_rehabilitation', 'repayment_rate', 30, 'percentage', '2024-01-01', null,
   '개인회생: 최소 변제율 기준 (불인정채권 제외)', false)
on conflict (ruleset_key, effective_from) do nothing;

-- ============================================================
-- 4. PG_CRON SCHEDULED JOBS (from 0079, 0082)
-- ============================================================

-- Enable pg_cron extension (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 4.1 Storage cleanup job (from 0079)
-- Deletes soft-deleted case_documents older than 30 days daily at 03:00 UTC
select cron.schedule(
  'storage-cleanup-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := current_setting('app.storage_cleanup_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.storage_cleanup_secret', true)
    ),
    body := '{}'::jsonb
  )
  $$
)
where not exists (
  select 1 from cron.job where jobname = 'storage-cleanup-daily'
);

comment on extension pg_cron is
  'Scheduled job support: storage-cleanup-daily (soft-deleted documents retention), audit_logs_retention_cleanup (tiered log retention)';

-- 4.2 Audit logs retention job (from 0082)
-- Tiered retention: critical 730 days, business 365 days, ops 60 days, unknown 30 days
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove old job if exists
    perform cron.unschedule('audit_logs_retention_cleanup')
    where exists (
      select 1 from cron.job where jobname = 'audit_logs_retention_cleanup'
    );

    perform cron.schedule(
      'audit_logs_retention_cleanup',
      '0 3 * * *',   -- daily at 03:00 UTC
      $$
        -- 1. business events: delete after 365 days
        delete from public.audit_logs
        where action in (
          'case.updated', 'case.created_via_csv', 'case.hub_linked', 'case.hub_unlinked',
          'document.added', 'document.deleted', 'document.approved', 'document.rejected',
          'collaboration.proposed', 'collaboration.approved', 'collaboration.rejected',
          'hub.created', 'hub.participant_joined', 'hub.participant_left',
          'case.shared', 'case.share_revoked'
        )
        and created_at < now() - interval '365 days';

        -- 2. ops events: delete after 60 days
        delete from public.audit_logs
        where action in (
          'member.invitation_resent',
          'notification.sent', 'invitation.sent'
        )
        and created_at < now() - interval '60 days';

        -- 3. undefined policy (unknown): delete after 30 days
        delete from public.audit_logs
        where action not in (
          -- critical
          'staff_temp_credential.issued', 'staff_temp_credential.reissued', 'staff_temp_credential.revoked',
          'client_temp_credential.issued', 'client_temp_credential.reissued', 'client_temp_credential.revoked',
          'member.invited', 'member.invitation_revoked', 'member.role_changed',
          'member.permission_changed', 'member.removed', 'member.password_reset_flagged',
          'case.created', 'case.status_changed', 'case.soft_deleted', 'case.restored',
          'case.archived', 'case.handler_changed',
          'billing.entry_created', 'billing.entry_updated', 'billing.entry_deleted',
          'agreement.created', 'agreement.updated', 'agreement.deleted',
          'payment.recorded', 'payment.corrected',
          'subscription.toggled', 'subscription.expiry_changed', 'service.locked', 'service.unlocked',
          -- business
          'case.updated', 'case.created_via_csv', 'case.hub_linked', 'case.hub_unlinked',
          'document.added', 'document.deleted', 'document.approved', 'document.rejected',
          'collaboration.proposed', 'collaboration.approved', 'collaboration.rejected',
          'hub.created', 'hub.participant_joined', 'hub.participant_left',
          'case.shared', 'case.share_revoked',
          -- ops
          'member.invitation_resent', 'notification.sent', 'invitation.sent'
        )
        and created_at < now() - interval '30 days';
      $$
    );
  end if;
end $$;

-- (COLAW backfill 섹션 제거 — 이미 실행 완료, 앱 동작에 불필요)

