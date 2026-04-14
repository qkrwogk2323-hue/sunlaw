-- Consolidated platform governance: signup, permissions, settings, flags, notifications

-- Create organization_signup_requests table
create table if not exists public.organization_signup_requests (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid references public.profiles(id) on delete set null,
  requester_email citext not null,
  organization_name text not null,
  business_number text,
  representative_name text,
  representative_title text,
  contact_phone text,
  note text,
  status public.organization_signup_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_kind public.organization_kind not null default 'law_firm',
  website_url text,
  requested_modules jsonb not null default '[]',
  approved_organization_id uuid references public.organizations(id) on delete set null,
  business_registration_document_path text,
  business_registration_document_name text,
  business_registration_document_mime_type text,
  business_registration_document_size integer,
  business_registration_verification_status text not null default 'pending_review',
  business_registration_verification_note text,
  business_registration_verified_number text,
  business_registration_verified_at timestamptz,
  check (status <> 'rejected' or reviewed_note is not null),
  check (business_registration_verification_status in ('pending_review', 'matched', 'mismatch', 'unreadable'))
);

-- Create client_access_requests table
create table if not exists public.client_access_requests (
  id uuid primary key default gen_random_uuid(),
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_key text not null,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text not null,
  requester_email citext not null,
  status public.client_access_request_status not null default 'pending',
  request_note text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create permission_templates table
create table if not exists public.permission_templates (
  key text primary key,
  display_name text not null,
  actor_category public.org_actor_category not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

-- Create permission_template_items table
create table if not exists public.permission_template_items (
  id uuid primary key default gen_random_uuid(),
  template_key text not null references public.permission_templates(key) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (template_key, permission_key)
);

-- Create organization_membership_permission_overrides table
create table if not exists public.organization_membership_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  permission_key text not null,
  effect public.permission_override_effect not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_membership_id, permission_key)
);

-- Create setting_catalog table
create table if not exists public.setting_catalog (
  key text primary key,
  domain text not null,
  scope public.setting_scope not null,
  value_type public.setting_value_type not null,
  default_value_json jsonb not null,
  editable_by_platform_admin boolean not null default true,
  editable_by_org_admin boolean not null default false,
  is_read_only boolean not null default false,
  validator_schema_key text,
  cache_scope text not null default 'platform',
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create platform_settings table
create table if not exists public.platform_settings (
  key text primary key references public.setting_catalog(key) on delete cascade,
  value_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Create organization_settings table
create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null references public.setting_catalog(key) on delete cascade,
  value_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

-- Create content_resources table
create table if not exists public.content_resources (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  resource_key text not null,
  locale text not null default 'ko-KR',
  organization_id uuid references public.organizations(id) on delete cascade,
  status public.content_status not null default 'draft',
  value_text text,
  value_json jsonb,
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Create feature_flags table
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  rollout_percentage integer not null default 100 check (rollout_percentage between 0 and 100),
  conditions_json jsonb not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (flag_key, organization_id)
);

-- Create setting_change_logs table
create table if not exists public.setting_change_logs (
  id uuid primary key default gen_random_uuid(),
  target_type public.setting_target_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  target_key text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  rolled_back_from_log_id uuid references public.setting_change_logs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Create platform_runtime_settings table
create table if not exists public.platform_runtime_settings (
  singleton boolean primary key default true check (singleton = true),
  platform_organization_id uuid not null references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_runtime_settings is 'Control plane singleton registry for platform organization governance';
comment on column public.platform_runtime_settings.platform_organization_id is 'Canonical platform organization id used by runtime governance';

-- Create organization_staff_temp_credentials table
create table if not exists public.organization_staff_temp_credentials (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  login_id text not null,
  login_id_normalized text not null,
  login_email citext not null unique,
  contact_email citext,
  contact_phone text,
  issued_by uuid references public.profiles(id) on delete set null,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_password_changed_at timestamptz
);

-- Create client_temp_credentials table
create table if not exists public.client_temp_credentials (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  login_id text not null,
  login_id_normalized text not null unique,
  login_email citext not null unique,
  issued_by uuid references public.profiles(id) on delete set null,
  contact_email citext,
  contact_phone text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_password_changed_at timestamptz
);

-- NOTE: indexes → 011, RLS → 010

-- Create function: check if setting write is allowed
create or replace function app.setting_write_allowed(target_key text, target_org uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.setting_catalog c
    where c.key = target_key
      and (
        app.is_platform_admin() and c.editable_by_platform_admin = true
        or (
          target_org is not null
          and app.is_org_manager(target_org)
          and c.editable_by_org_admin = true
        )
      )
  );
$$;

-- Create enhanced permission check function
create or replace function app.has_permission(target_org uuid, permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with membership as (
    select id, role, permissions, permission_template_key
    from public.organization_memberships
    where organization_id = target_org
      and profile_id = auth.uid()
      and status = 'active'
    limit 1
  ),
  template_match as (
    select exists (
      select 1
      from membership m
      join public.permission_template_items pti
        on pti.template_key = m.permission_template_key
      where pti.permission_key = $2
    ) as allowed
  ),
  override_match as (
    select o.effect
    from membership m
    join public.organization_membership_permission_overrides o
      on o.organization_membership_id = m.id
    where o.permission_key = $2
    limit 1
  )
  select case
    when app.is_platform_admin() then true
    when exists (select 1 from membership where role = 'org_owner') then true
    when exists (select 1 from override_match where effect = 'deny') then false
    when exists (select 1 from override_match where effect = 'grant') then true
    when exists (
      select 1
      from membership
      where permissions ? $2
    ) then coalesce(
      (
        select (permissions ->> $2)::boolean
        from membership
      ),
      false
    )
    else coalesce((select allowed from template_match), false)
  end;
$$;

-- Create function: check case organization membership
create or replace function app.is_case_org_member(target_case uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.case_organizations co
    join public.organization_memberships om
      on om.organization_id = co.organization_id
     and om.profile_id = auth.uid()
     and om.status = 'active'
    where co.case_id = target_case
      and co.status = 'active'
  );
$$;

-- Create function: get default case stage template
create or replace function app.default_stage_template(case_type_value public.case_type)
returns text
language sql
immutable
as $$
  select case
    when case_type_value = 'debt_collection' then 'collection-default'
    when case_type_value = 'civil' then 'civil-default'
    when case_type_value = 'criminal' then 'criminal-default'
    else 'general-default'
  end;
$$;

-- Create function: check if case has module
create or replace function app.case_has_module(target_case uuid, module_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (c.module_flags ->> module_key)::boolean from public.cases c where c.id = target_case),
    false
  );
$$;

-- NOTE: RLS → 010

-- Triggers for platform_runtime_settings and temp credentials
drop trigger if exists trg_platform_runtime_settings_updated_at on public.platform_runtime_settings;
create trigger trg_platform_runtime_settings_updated_at
before update on public.platform_runtime_settings
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_organization_staff_temp_credentials_updated_at on public.organization_staff_temp_credentials;
create trigger trg_organization_staff_temp_credentials_updated_at
before update on public.organization_staff_temp_credentials
for each row execute function app.set_updated_at();

drop trigger if exists trg_client_temp_credentials_updated_at on public.client_temp_credentials;
create trigger trg_client_temp_credentials_updated_at
before update on public.client_temp_credentials
for each row execute function app.set_updated_at();

-- NOTE: RLS → 010

-- Create update triggers
drop trigger if exists trg_signup_requests_updated_at on public.organization_signup_requests;
create trigger trg_signup_requests_updated_at
before update on public.organization_signup_requests
for each row execute procedure app.set_updated_at();

drop trigger if exists trg_client_access_requests_updated_at on public.client_access_requests;
create trigger trg_client_access_requests_updated_at
before update on public.client_access_requests
for each row execute procedure app.set_updated_at();

-- Create storage bucket for organization signup documents
insert into storage.buckets (id, name, public)
values ('organization-signup-documents', 'organization-signup-documents', false)
on conflict (id) do nothing;

-- Seed permission templates
insert into public.permission_templates (key, display_name, actor_category, description)
values
  ('admin_general', '관리자', 'admin', '조직 관리자 기본 템플릿'),
  ('lawyer', '변호사', 'staff', '법률수행 기본 템플릿'),
  ('office_manager', '사무장', 'staff', '운영/청구/문서 보조 중심'),
  ('collection_agent', '추심직원', 'staff', '회수 운영 중심'),
  ('intern_readonly', '인턴/열람전용', 'staff', '제한된 조회 전용')
on conflict (key) do nothing;

-- Seed permission template items
with seed(template_key, permission_key) as (
  values
    ('admin_general','team_invite'),
    ('admin_general','team_permission_manage'),
    ('admin_general','organization_settings_manage'),
    ('admin_general','case_create'),
    ('admin_general','case_edit'),
    ('admin_general','case_delete'),
    ('admin_general','case_assign'),
    ('admin_general','case_stage_manage'),
    ('admin_general','document_create'),
    ('admin_general','document_edit'),
    ('admin_general','document_approve'),
    ('admin_general','document_share'),
    ('admin_general','document_export'),
    ('admin_general','request_create'),
    ('admin_general','request_manage'),
    ('admin_general','request_close'),
    ('admin_general','schedule_create'),
    ('admin_general','schedule_edit'),
    ('admin_general','schedule_confirm'),
    ('admin_general','calendar_export'),
    ('admin_general','billing_view'),
    ('admin_general','billing_issue'),
    ('admin_general','billing_payment_confirm'),
    ('admin_general','billing_export'),
    ('admin_general','collection_view'),
    ('admin_general','collection_contact_manage'),
    ('admin_general','collection_payment_plan_manage'),
    ('admin_general','collection_payment_confirm'),
    ('admin_general','collection_metrics_view'),
    ('admin_general','legal_request_create'),
    ('admin_general','legal_progress_view'),
    ('admin_general','legal_document_create'),
    ('admin_general','legal_document_approve'),
    ('admin_general','legal_filing_manage'),
    ('admin_general','asset_inquiry_execute'),
    ('admin_general','notification_create'),
    ('admin_general','report_view'),
    ('admin_general','report_export'),
    ('admin_general','case_board_export'),
    ('admin_general','collection_compensation_view_self'),
    ('admin_general','collection_compensation_view_team'),
    ('admin_general','collection_compensation_view_org'),
    ('admin_general','collection_compensation_manage_plan'),
    ('admin_general','collection_compensation_fix_plan'),
    ('admin_general','collection_compensation_export'),
    ('admin_general','settlement_view'),
    ('admin_general','settlement_manage'),
    ('admin_general','settlement_export'),
    ('lawyer','case_create'), ('lawyer','case_edit'), ('lawyer','case_assign'), ('lawyer','case_stage_manage'),
    ('lawyer','document_create'), ('lawyer','document_edit'), ('lawyer','document_approve'), ('lawyer','document_share'), ('lawyer','document_export'),
    ('lawyer','request_create'), ('lawyer','request_manage'), ('lawyer','request_close'),
    ('lawyer','schedule_create'), ('lawyer','schedule_edit'), ('lawyer','schedule_confirm'), ('lawyer','calendar_export'),
    ('lawyer','billing_view'), ('lawyer','legal_request_create'), ('lawyer','legal_progress_view'),
    ('lawyer','legal_document_create'), ('lawyer','legal_document_approve'), ('lawyer','legal_filing_manage'), ('lawyer','asset_inquiry_execute'),
    ('lawyer','report_view'), ('lawyer','case_board_export'),
    ('office_manager','case_create'), ('office_manager','case_edit'), ('office_manager','case_assign'),
    ('office_manager','document_create'), ('office_manager','document_edit'), ('office_manager','document_share'), ('office_manager','document_export'),
    ('office_manager','request_create'), ('office_manager','request_manage'), ('office_manager','request_close'),
    ('office_manager','schedule_create'), ('office_manager','schedule_edit'), ('office_manager','schedule_confirm'), ('office_manager','calendar_export'),
    ('office_manager','billing_view'), ('office_manager','billing_issue'), ('office_manager','billing_payment_confirm'), ('office_manager','billing_export'),
    ('office_manager','notification_create'), ('office_manager','report_view'), ('office_manager','case_board_export'),
    ('collection_agent','case_edit'),
    ('collection_agent','request_create'), ('collection_agent','request_manage'), ('collection_agent','request_close'),
    ('collection_agent','schedule_create'), ('collection_agent','schedule_edit'),
    ('collection_agent','billing_view'),
    ('collection_agent','collection_view'), ('collection_agent','collection_contact_manage'), ('collection_agent','collection_payment_plan_manage'), ('collection_agent','collection_payment_confirm'), ('collection_agent','collection_metrics_view'),
    ('collection_agent','legal_request_create'), ('collection_agent','legal_progress_view'),
    ('collection_agent','collection_compensation_view_self'), ('collection_agent','report_view'), ('collection_agent','case_board_export'),
    ('intern_readonly','billing_view'), ('intern_readonly','collection_view'), ('intern_readonly','collection_metrics_view'), ('intern_readonly','report_view')
)
insert into public.permission_template_items (template_key, permission_key)
select template_key, permission_key from seed
on conflict (template_key, permission_key) do nothing;

-- Seed setting catalog entries
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

-- Seed feature flags
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

-- Seed content resources
insert into public.content_resources (
  namespace, resource_key, locale, organization_id, status, value_text, published_at
)
values
  ('landing', 'hero.title', 'ko-KR', null, 'published', '사건을 기록하는 도구가 아니라, 사건 단위로 협업하는 업무 시스템', now()),
  ('landing', 'hero.subtitle', 'ko-KR', null, 'published', '내부 사용자는 업무 중심 Workspace를, 의뢰인은 자기 사건 중심 Portal을 사용합니다.', now()),
  ('portal', 'welcome_message', 'ko-KR', null, 'published', '내 사건의 진행 현황, 문서, 요청, 일정, 청구를 한 곳에서 확인하세요.', now()),
  ('email', 'invite.client.subject', 'ko-KR', null, 'published', '[{{org_name}}] {{case_name}} 진행 상황을 확인해 주세요.', now())
on conflict do nothing;

-- Initialize platform_runtime_settings
do $$
declare
  v_platform_org_id uuid;
begin
  select prs.platform_organization_id
    into v_platform_org_id
  from public.platform_runtime_settings prs
  where prs.singleton = true;

  if v_platform_org_id is null then
    select o.id
      into v_platform_org_id
    from public.organizations o
    where o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
      and o.is_platform_root = true
    order by o.updated_at desc nulls last, o.created_at asc
    limit 1;
  end if;

  if v_platform_org_id is null then
    select o.id
      into v_platform_org_id
    from public.organizations o
    where o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
    order by o.updated_at desc nulls last, o.created_at asc
    limit 1;
  end if;

  if v_platform_org_id is null then
    -- Fresh DB 경로: platform_management 조직이 아직 없는 상태(빈 DB). 이후 런타임에서
    -- 첫 조직이 승인될 때 canonicalize 로직이 다시 돌며 초기화된다. 여기서 exception을
    -- 던지면 fresh DB replay / branch 생성이 실패하므로 조용히 skip.
    raise notice 'platform_runtime_settings init skipped: fresh DB (no platform_management organization yet)';
  else
    insert into public.platform_runtime_settings (singleton, platform_organization_id)
    values (true, v_platform_org_id)
    on conflict (singleton) do update
      set platform_organization_id = excluded.platform_organization_id,
          updated_at = now();

    update public.organizations
    set is_platform_root = (id = v_platform_org_id)
    where is_platform_root is distinct from (id = v_platform_org_id);

    update public.organizations
    set kind = 'platform_management'
    where id = v_platform_org_id
      and kind <> 'platform_management';
  end if;
end
$$;

-- Create functions for platform organization lookups
create or replace function app.current_platform_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select prs.platform_organization_id
  from public.platform_runtime_settings prs
  where prs.singleton = true
  limit 1;
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_runtime_settings prs
    join public.organization_memberships om on om.organization_id = prs.platform_organization_id
    join public.organizations o on o.id = prs.platform_organization_id
    where prs.singleton = true
      and om.profile_id = auth.uid()
      and om.status = 'active'
      and om.role in ('org_owner', 'org_manager')
      and o.kind = 'platform_management'
      and o.lifecycle_status <> 'soft_deleted'
  );
$$;

-- Set default values for existing organization memberships
update public.organization_memberships
set actor_category = case
  when role in ('org_owner','org_manager') then 'admin'::public.org_actor_category
  else 'staff'::public.org_actor_category
end
where actor_category is null or actor_category = 'staff'::public.org_actor_category;

update public.organization_memberships
set permission_template_key = case
  when role = 'org_owner' then 'admin_general'
  when role = 'org_manager' then 'office_manager'
  else coalesce(permission_template_key, 'office_manager')
end
where permission_template_key is null;

update public.organization_memberships
set case_scope_policy = case
  when role in ('org_owner','org_manager') then 'all_org_cases'::public.case_scope_policy
  else 'assigned_cases_only'::public.case_scope_policy
end;

-- Initialize case module flags for existing cases
update public.cases
set module_flags = coalesce(module_flags, '{}'::jsonb) || jsonb_build_object(
  'billing', true,
  'collection', case when case_type = 'debt_collection' then true else coalesce((module_flags ->> 'collection')::boolean, false) end,
  'insolvency', coalesce((module_flags ->> 'insolvency')::boolean, false),
  'settlement', coalesce((module_flags ->> 'settlement')::boolean, false)
)
where true;

-- Initialize default stage templates for existing cases
update public.cases
set stage_template_key = coalesce(stage_template_key, app.default_stage_template(case_type)),
    stage_key = coalesce(stage_key, 'intake')
where stage_template_key is null or stage_key is null;

-- Create default case_organizations for existing cases
insert into public.case_organizations (
  organization_id,
  case_id,
  role,
  status,
  access_scope,
  billing_scope,
  communication_scope,
  is_lead,
  can_submit_legal_requests,
  can_receive_legal_requests,
  can_manage_collection,
  can_view_client_messages,
  created_by,
  updated_by
)
select
  c.organization_id,
  c.id,
  'managing_org',
  'active',
  'full',
  'direct_client_billing',
  'client_visible',
  true,
  true,
  true,
  (c.case_type = 'debt_collection'),
  true,
  c.created_by,
  c.updated_by
from public.cases c
where not exists (
  select 1
  from public.case_organizations co
  where co.case_id = c.id
    and co.organization_id = c.organization_id
    and co.role = 'managing_org'
);
