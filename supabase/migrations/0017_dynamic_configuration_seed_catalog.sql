-- Seed catalog and content resources for dynamic configuration

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

insert into public.content_resources (
  namespace, resource_key, locale, organization_id, status, value_text, published_at
)
values
  ('landing', 'hero.title', 'ko-KR', null, 'published', '사건을 기록하는 도구가 아니라, 사건 단위로 협업하는 업무 시스템', now()),
  ('landing', 'hero.subtitle', 'ko-KR', null, 'published', '내부 사용자는 업무 중심 Workspace를, 의뢰인은 자기 사건 중심 Portal을 사용합니다.', now()),
  ('portal', 'welcome_message', 'ko-KR', null, 'published', '내 사건의 진행 현황, 문서, 요청, 일정, 청구를 한 곳에서 확인하세요.', now()),
  ('email', 'invite.client.subject', 'ko-KR', null, 'published', '[{{org_name}}] {{case_name}} 진행 상황을 확인해 주세요.', now())
on conflict do nothing;

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
