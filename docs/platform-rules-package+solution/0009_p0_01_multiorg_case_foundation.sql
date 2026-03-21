-- P0-01 multi-organization case foundation

do $$ begin
  create type public.case_organization_role as enum (
    'managing_org',
    'principal_client_org',
    'collection_org',
    'legal_counsel_org',
    'co_counsel_org',
    'partner_org'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_access_scope as enum ('full', 'collection_only', 'legal_only', 'billing_only', 'read_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_billing_scope as enum ('none', 'direct_client_billing', 'upstream_settlement', 'internal_settlement_only');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_communication_scope as enum ('internal_only', 'cross_org_only', 'client_visible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.case_organization_status as enum ('active', 'pending', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_relation_type as enum (
    'same_group',
    'same_legal_entity',
    'partner',
    'collection_partner',
    'legal_partner',
    'shared_operations',
    'internal_affiliate'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.case_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  role public.case_organization_role not null,
  status public.case_organization_status not null default 'active',
  instructed_by_case_organization_id uuid references public.case_organizations(id) on delete set null,
  access_scope public.case_access_scope not null default 'read_only',
  billing_scope public.case_billing_scope not null default 'none',
  communication_scope public.case_communication_scope not null default 'cross_org_only',
  is_lead boolean not null default false,
  can_submit_legal_requests boolean not null default false,
  can_receive_legal_requests boolean not null default false,
  can_manage_collection boolean not null default false,
  can_view_client_messages boolean not null default false,
  agreement_summary text,
  started_on date,
  ended_on date,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, organization_id, role)
);

create table if not exists public.organization_relations (
  id uuid primary key default gen_random_uuid(),
  source_organization_id uuid not null references public.organizations(id) on delete cascade,
  target_organization_id uuid not null references public.organizations(id) on delete cascade,
  relation_type public.organization_relation_type not null,
  is_active boolean not null default true,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_organization_id, target_organization_id, relation_type)
);

create index if not exists idx_case_organizations_case on public.case_organizations (case_id, status, role);
create index if not exists idx_case_organizations_org on public.case_organizations (organization_id, status, role);
create index if not exists idx_case_organizations_instructed_by on public.case_organizations (instructed_by_case_organization_id);
create index if not exists idx_organization_relations_source on public.organization_relations (source_organization_id, relation_type);
create index if not exists idx_organization_relations_target on public.organization_relations (target_organization_id, relation_type);

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

alter table public.case_organizations enable row level security;
alter table public.case_organizations force row level security;
alter table public.organization_relations enable row level security;
alter table public.organization_relations force row level security;

drop policy if exists case_organizations_select on public.case_organizations;
create policy case_organizations_select on public.case_organizations
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(organization_id)
  or app.is_case_client(case_id)
);

drop policy if exists case_organizations_write on public.case_organizations;
create policy case_organizations_write on public.case_organizations
for all to authenticated
using (
  app.is_platform_admin() or app.is_org_manager(organization_id)
)
with check (
  app.is_platform_admin() or app.is_org_manager(organization_id)
);

drop policy if exists organization_relations_select on public.organization_relations;
create policy organization_relations_select on public.organization_relations
for select to authenticated
using (
  app.is_platform_admin()
  or app.is_org_member(source_organization_id)
  or app.is_org_member(target_organization_id)
);

drop policy if exists organization_relations_write on public.organization_relations;
create policy organization_relations_write on public.organization_relations
for all to authenticated
using (
  app.is_platform_admin() or app.is_org_manager(source_organization_id)
)
with check (
  app.is_platform_admin() or app.is_org_manager(source_organization_id)
);

drop trigger if exists trg_case_organizations_updated_at on public.case_organizations;
create trigger trg_case_organizations_updated_at
before update on public.case_organizations
for each row execute procedure app.set_updated_at();

drop trigger if exists audit_case_organizations on public.case_organizations;
create trigger audit_case_organizations
after insert or update or delete on public.case_organizations
for each row execute procedure audit.capture_row_change();

drop trigger if exists audit_organization_relations on public.organization_relations;
create trigger audit_organization_relations
after insert or update or delete on public.organization_relations
for each row execute procedure audit.capture_row_change();
