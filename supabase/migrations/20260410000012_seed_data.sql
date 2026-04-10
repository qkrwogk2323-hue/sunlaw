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

-- ============================================================
-- 5. COLAW REPAYMENT PERIOD TRUTH BACKFILL (from 0092)
--    84 cases verified from COLAW full scan (2026-04-08)
--    Updates rehabilitation_income_settings.repay_months and repay_period_option
-- ============================================================

-- Backup current state before update
create table if not exists public._backup_0092_rehab_income_settings (
  case_id uuid primary key,
  repay_months int,
  repay_period_option text,
  updated_at timestamptz,
  _backup_at timestamptz not null default now()
);

insert into public._backup_0092_rehab_income_settings (case_id, repay_months, repay_period_option, updated_at)
select ris.case_id, ris.repay_months, ris.repay_period_option, ris.updated_at
from public.rehabilitation_income_settings ris
join public.cases c on c.id = ris.case_id
where c.summary ~ '^colaw #[0-9]+($|\s)'
on conflict (case_id) do nothing;

-- Update 84 cases with COLAW truth data
-- Truth source: audit/colaw_repayperiod_truth.tsv (90-case full scan 2026-04-08)
-- Mapping: cases.summary 'colaw #N {name} 마이그레이션' → truth N
-- Note: 6 empty cases excluded (박복희, 임경애#66, 문연자, 서동재, 조두성#26, 이옥주#12)
with truth(n, repay_months, repay_period_option) as (
  values
    -- capital36 (法定 default rps=6 frm=36): 61 cases
    (90, 36, 'capital36'), (89, 36, 'capital36'), (88, 36, 'capital36'),
    (87, 36, 'capital36'), (86, 36, 'capital36'), (85, 36, 'capital36'),
    (84, 36, 'capital36'), (83, 36, 'capital36'), (82, 36, 'capital36'),
    (80, 36, 'capital36'), (79, 36, 'capital36'), (78, 36, 'capital36'),
    (77, 36, 'capital36'), (76, 36, 'capital36'), (75, 36, 'capital36'),
    (74, 36, 'capital36'), (73, 36, 'capital36'), (72, 36, 'capital36'),
    (71, 36, 'capital36'), (70, 36, 'capital36'), (67, 36, 'capital36'),
    (63, 36, 'capital36'), (61, 36, 'capital36'), (60, 36, 'capital36'),
    (59, 36, 'capital36'), (57, 36, 'capital36'), (56, 36, 'capital36'),
    (54, 36, 'capital36'), (53, 36, 'capital36'), (51, 36, 'capital36'),
    (50, 36, 'capital36'), (49, 36, 'capital36'), (48, 36, 'capital36'),
    (46, 36, 'capital36'), (45, 36, 'capital36'), (42, 36, 'capital36'),
    (41, 36, 'capital36'), (40, 36, 'capital36'), (39, 36, 'capital36'),
    (38, 36, 'capital36'), (37, 36, 'capital36'), (36, 36, 'capital36'),
    (35, 36, 'capital36'), (34, 36, 'capital36'), (32, 36, 'capital36'),
    (30, 36, 'capital36'), (29, 36, 'capital36'), (28, 36, 'capital36'),
    (27, 36, 'capital36'), (25, 36, 'capital36'), (23, 36, 'capital36'),
    (21, 36, 'capital36'), (17, 36, 'capital36'), (16, 36, 'capital36'),
    (13, 36, 'capital36'), (10, 36, 'capital36'), (9, 36, 'capital36'),
    (7, 36, 'capital36'), (6, 36, 'capital36'), (5, 36, 'capital36'),
    (1, 36, 'capital36'),

    -- capital60 (rps=1 or rps=6 frm=60): 21 cases
    (81, 60, 'capital60'), (69, 60, 'capital60'), (65, 60, 'capital60'),
    (64, 60, 'capital60'), (58, 60, 'capital60'), (55, 60, 'capital60'),
    (52, 60, 'capital60'), (47, 60, 'capital60'), (44, 60, 'capital60'),
    (33, 60, 'capital60'), (31, 60, 'capital60'), (24, 60, 'capital60'),
    (22, 60, 'capital60'), (20, 60, 'capital60'), (19, 60, 'capital60'),
    (18, 60, 'capital60'), (11, 60, 'capital60'), (8, 60, 'capital60'),
    (4, 60, 'capital60'), (3, 60, 'capital60'), (2, 60, 'capital60'),

    -- custom months (rps=6 frm=45/48 → capital100_5y absorption): 2 cases
    (15, 48, 'capital100_5y'),  -- 이진호
    (14, 45, 'capital100_5y')   -- 이옥주(n=14)
)
update public.rehabilitation_income_settings ris
set repay_months = t.repay_months,
    repay_period_option = t.repay_period_option,
    updated_at = now()
from truth t
join public.cases c on c.summary ~ ('^colaw #' || t.n || '($|\s)')
where ris.case_id = c.id;

-- Handle special case: n=84 (김진한) — cases.summary is '의뢰인: 김진한' (non-standard)
-- Direct case_id match (verified by ops 2026-04-09)
update public.rehabilitation_income_settings
set repay_months = 36,
    repay_period_option = 'capital36',
    updated_at = now()
where case_id = 'cbf04b73-a193-4e02-b5ac-1c9cca381620';

-- Post-backfill validation
do $$
declare
  v_over int;
  v_updated int;
begin
  -- Constraint: No row violates repay_months > 60 (except empty 6 cases)
  select count(*) into v_over
  from public.rehabilitation_income_settings ris
  join public.cases c on c.id = ris.case_id
  where c.summary ~ '^colaw #[0-9]+($|\s)'
    and ris.repay_months > 60
    and (c.summary !~ '^colaw #(68|66|62|43|26|12)($|\s)');

  if v_over > 0 then
    raise exception 'Backfill validation failed: % rows have repay_months > 60 (excluding empty 6). Rollback.', v_over;
  end if;

  -- Update impact count == 84
  select count(*) into v_updated
  from public.rehabilitation_income_settings ris
  left join public.cases c on c.id = ris.case_id
  where ris.updated_at = transaction_timestamp()
    and (
      (c.summary ~ '^colaw #[0-9]+($|\s)'
        and c.summary !~ '^colaw #(68|66|62|43|26|12)($|\s)')
      or ris.case_id = 'cbf04b73-a193-4e02-b5ac-1c9cca381620'
    );

  if v_updated <> 84 then
    raise exception 'Backfill validation failed: % rows updated (expected 84). Mapping or pattern mismatch.', v_updated;
  end if;

  raise notice 'Backfill complete: 84 cases updated, 6 empty cases preserved';
end $$;

