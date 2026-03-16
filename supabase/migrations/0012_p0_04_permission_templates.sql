-- P0-04 permission templates + overrides

do $$ begin
  create type public.org_actor_category as enum ('admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_scope_policy as enum ('all_org_cases', 'assigned_cases_only', 'read_only_assigned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.permission_override_effect as enum ('grant', 'deny');
exception when duplicate_object then null; end $$;

alter table public.organization_memberships
  add column if not exists actor_category public.org_actor_category not null default 'staff',
  add column if not exists permission_template_key text,
  add column if not exists case_scope_policy public.case_scope_policy not null default 'assigned_cases_only';

create table if not exists public.permission_templates (
  key text primary key,
  display_name text not null,
  actor_category public.org_actor_category not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permission_template_items (
  id uuid primary key default gen_random_uuid(),
  template_key text not null references public.permission_templates(key) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (template_key, permission_key)
);

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

insert into public.permission_templates (key, display_name, actor_category, description)
values
  ('admin_general', '관리자', 'admin', '조직 관리자 기본 템플릿'),
  ('lawyer', '변호사', 'staff', '법률수행 기본 템플릿'),
  ('office_manager', '사무장', 'staff', '운영/청구/문서 보조 중심'),
  ('collection_agent', '추심직원', 'staff', '회수 운영 중심'),
  ('intern_readonly', '인턴/열람전용', 'staff', '제한된 조회 전용')
on conflict (key) do nothing;

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

-- sensible defaults for existing memberships
update public.organization_memberships
set actor_category = case
  when role in ('org_owner','org_manager') then 'admin'::public.org_actor_category
  else 'staff'::public.org_actor_category
end;

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

alter table public.permission_templates enable row level security;
alter table public.permission_templates force row level security;
alter table public.permission_template_items enable row level security;
alter table public.permission_template_items force row level security;
alter table public.organization_membership_permission_overrides enable row level security;
alter table public.organization_membership_permission_overrides force row level security;

drop policy if exists permission_templates_select on public.permission_templates;
create policy permission_templates_select on public.permission_templates
for select to authenticated using (true);

drop policy if exists permission_template_items_select on public.permission_template_items;
create policy permission_template_items_select on public.permission_template_items
for select to authenticated using (true);

drop policy if exists permission_templates_write on public.permission_templates;
create policy permission_templates_write on public.permission_templates
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists permission_template_items_write on public.permission_template_items;
create policy permission_template_items_write on public.permission_template_items
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop policy if exists permission_overrides_select on public.organization_membership_permission_overrides;
create policy permission_overrides_select on public.organization_membership_permission_overrides
for select to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_membership_id
      and (
        app.is_platform_admin()
        or app.is_org_manager(om.organization_id)
        or om.profile_id = auth.uid()
      )
  )
);

drop policy if exists permission_overrides_write on public.organization_membership_permission_overrides;
create policy permission_overrides_write on public.organization_membership_permission_overrides
for all to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_membership_id
      and (app.is_platform_admin() or app.is_org_manager(om.organization_id))
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = organization_membership_id
      and (app.is_platform_admin() or app.is_org_manager(om.organization_id))
  )
);

drop trigger if exists audit_permission_templates on public.permission_templates;
create trigger audit_permission_templates
after insert or update or delete on public.permission_templates
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_permission_template_items on public.permission_template_items;
create trigger audit_permission_template_items
after insert or update or delete on public.permission_template_items
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_membership_permission_overrides on public.organization_membership_permission_overrides;
create trigger audit_membership_permission_overrides
after insert or update or delete on public.organization_membership_permission_overrides
for each row execute procedure audit.capture_row_change();
