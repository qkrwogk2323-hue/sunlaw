-- Dynamic configuration foundation

do $$ begin
  create type public.setting_scope as enum ('platform', 'organization', 'both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setting_value_type as enum ('string', 'integer', 'decimal', 'boolean', 'string_array', 'json');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.setting_target_type as enum ('platform_setting', 'organization_setting', 'content_resource', 'feature_flag');
exception when duplicate_object then null; end $$;

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

create table if not exists public.platform_settings (
  key text primary key references public.setting_catalog(key) on delete cascade,
  value_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

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

create unique index if not exists uq_content_resources_published
  on public.content_resources(namespace, resource_key, locale, coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), status);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  rollout_percentage integer not null default 100 check (rollout_percentage between 0 and 100),
  conditions_json jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (flag_key, organization_id)
);

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

create index if not exists idx_org_settings_org_key on public.organization_settings (organization_id, key);
create index if not exists idx_feature_flags_org_key on public.feature_flags (organization_id, flag_key);
create index if not exists idx_setting_change_logs_target on public.setting_change_logs (target_type, target_key, created_at desc);

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

alter table public.setting_catalog enable row level security;
alter table public.setting_catalog force row level security;
alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_settings force row level security;
alter table public.content_resources enable row level security;
alter table public.content_resources force row level security;
alter table public.feature_flags enable row level security;
alter table public.feature_flags force row level security;
alter table public.setting_change_logs enable row level security;
alter table public.setting_change_logs force row level security;

drop policy if exists setting_catalog_select on public.setting_catalog;
create policy setting_catalog_select on public.setting_catalog for select to authenticated using (true);
drop policy if exists platform_settings_select on public.platform_settings;
create policy platform_settings_select on public.platform_settings for select to authenticated using (true);
drop policy if exists platform_settings_write on public.platform_settings;
create policy platform_settings_write on public.platform_settings for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists organization_settings_select on public.organization_settings;
create policy organization_settings_select on public.organization_settings for select to authenticated using (app.is_platform_admin() or app.is_org_member(organization_id));
drop policy if exists organization_settings_write on public.organization_settings;
create policy organization_settings_write on public.organization_settings for all to authenticated using (app.setting_write_allowed(key, organization_id)) with check (app.setting_write_allowed(key, organization_id));
drop policy if exists content_resources_select on public.content_resources;
create policy content_resources_select on public.content_resources for select to authenticated using (organization_id is null or app.is_org_member(organization_id) or app.is_platform_admin());
drop policy if exists content_resources_write on public.content_resources;
create policy content_resources_write on public.content_resources for all to authenticated using (app.is_platform_admin() or (organization_id is not null and app.is_org_manager(organization_id))) with check (app.is_platform_admin() or (organization_id is not null and app.is_org_manager(organization_id)));
drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags for select to authenticated using (organization_id is null or app.is_org_member(organization_id) or app.is_platform_admin());
drop policy if exists feature_flags_write on public.feature_flags;
create policy feature_flags_write on public.feature_flags for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists setting_change_logs_select on public.setting_change_logs;
create policy setting_change_logs_select on public.setting_change_logs for select to authenticated using (app.is_platform_admin() or (organization_id is not null and app.is_org_manager(organization_id)));
