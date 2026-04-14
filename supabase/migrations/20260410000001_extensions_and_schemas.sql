-- =============================================================================
-- 001_extensions_and_schemas.sql
-- Consolidated migration: Extensions, schemas, and foundational functions
-- =============================================================================

-- Create extensions (skip Supabase-managed ones: pg_graphql, pg_stat_statements, plpgsql, supabase_vault)
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- Create schemas
create schema if not exists app;
create schema if not exists audit;

-- =============================================================================
-- Foundational Helper Functions in app schema
-- =============================================================================

-- app.set_updated_at() — Used as trigger for automatic updated_at management
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public', 'app', 'auth', 'extensions'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- app.is_platform_admin() — Check if current user is a platform admin
-- NOTE: language plpgsql을 사용하는 이유
--   이 함수 본문은 public.platform_runtime_settings / organization_memberships /
--   organizations를 참조하지만, 001 migration 실행 시점에는 이 테이블들이 아직
--   생성되지 않았다(003 core_tables, 004 platform_governance에서 생성).
--   language sql로 선언하면 생성 시점에 본문이 검증돼 fresh DB replay가 실패한다.
--   plpgsql은 본문 검증이 호출 시점으로 지연되므로 bootstrap 순서 의존을 회피한다.
create or replace function app.is_platform_admin()
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  return exists (
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
end;
$$;

-- app.is_org_member(target_org) — Check if current user is a member of an organization
-- NOTE: plpgsql 이유는 is_platform_admin과 동일 (organization_memberships는 003에서 생성).
create or replace function app.is_org_member(target_org uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  return exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
end;
$$;

-- app.is_org_manager(target_org) — Check if current user is an org_owner or org_manager
create or replace function app.is_org_manager(target_org uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  return exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = target_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('org_owner', 'org_manager')
  );
end;
$$;

-- app.is_org_staff(target_org) — Check if current user is a member (delegates to is_org_member)
create or replace function app.is_org_staff(target_org uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  return app.is_org_member(target_org);
end;
$$;

-- =============================================================================
-- Audit Schema Setup
-- =============================================================================

-- Create audit.change_log table for tracking all data mutations
create table if not exists audit.change_log (
  id bigserial primary key,
  logged_at timestamptz not null default now(),
  schema_name text not null,
  table_name text not null,
  operation text not null,
  record_id text,
  organization_id uuid,
  case_id uuid,
  actor_user_id uuid,
  actor_email text,
  changed_fields text[] not null default '{}',
  old_values jsonb,
  new_values jsonb
);

-- Create indexes for audit queries
create index if not exists idx_audit_org_logged_at on audit.change_log (organization_id, logged_at desc);
create index if not exists idx_audit_case_logged_at on audit.change_log (case_id, logged_at desc);
create index if not exists idx_audit_actor_logged_at on audit.change_log (actor_user_id, logged_at desc);

-- audit.capture_row_change() — Trigger function that logs row changes to audit.change_log
create or replace function audit.capture_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, audit, pg_temp
as $$
declare
  old_data jsonb;
  new_data jsonb;
  changed text[];
  record_id text;
  org_id uuid;
  case_id_value uuid;
begin
  if tg_op = 'INSERT' then
    old_data := null;
    new_data := to_jsonb(new);
    select coalesce(array_agg(key order by key), '{}'::text[]) into changed
    from jsonb_object_keys(new_data) as key;
  elsif tg_op = 'DELETE' then
    old_data := to_jsonb(old);
    new_data := null;
    select coalesce(array_agg(key order by key), '{}'::text[]) into changed
    from jsonb_object_keys(old_data) as key;
  else
    old_data := to_jsonb(old);
    new_data := to_jsonb(new);
    select coalesce(array_agg(n.key order by n.key), '{}'::text[])
      into changed
    from jsonb_each(new_data) n
    left join jsonb_each(old_data) o using (key)
    where n.value is distinct from o.value;
  end if;

  record_id := coalesce(new_data ->> 'id', old_data ->> 'id');
  org_id := coalesce(nullif(new_data ->> 'organization_id', '')::uuid, nullif(old_data ->> 'organization_id', '')::uuid);
  case_id_value := coalesce(nullif(new_data ->> 'case_id', '')::uuid, nullif(old_data ->> 'case_id', '')::uuid);

  insert into audit.change_log (
    schema_name,
    table_name,
    operation,
    record_id,
    organization_id,
    case_id,
    actor_user_id,
    actor_email,
    changed_fields,
    old_values,
    new_values
  )
  values (
    tg_table_schema,
    tg_table_name,
    tg_op,
    record_id,
    org_id,
    case_id_value,
    auth.uid(),
    auth.jwt() ->> 'email',
    changed,
    old_data,
    new_data
  );

  return coalesce(new, old);
end;
$$;

-- Enable RLS on audit.change_log
alter table audit.change_log enable row level security;
alter table audit.change_log force row level security;

-- RLS policy: Only platform admins or org managers can view change log
drop policy if exists audit_select on audit.change_log;
create policy audit_select on audit.change_log
for select to authenticated
using (app.is_platform_admin() or app.is_org_manager(organization_id));
