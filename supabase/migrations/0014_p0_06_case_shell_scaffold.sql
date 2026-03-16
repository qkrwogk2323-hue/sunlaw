-- P0-06 common case shell scaffold

create table if not exists public.case_module_catalog (
  module_key text primary key,
  display_name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.case_type_default_modules (
  id uuid primary key default gen_random_uuid(),
  case_type public.case_type not null,
  module_key text not null references public.case_module_catalog(module_key) on delete cascade,
  unique (case_type, module_key)
);

insert into public.case_module_catalog (module_key, display_name, description)
values
  ('collection', 'Collection', '추심 사건에서만 노출되는 회수 운영 모듈'),
  ('insolvency', 'Insolvency', '회생/파산 사건 특화 모듈'),
  ('settlement', 'Settlement', '합의/조정 중심 사건 모듈')
on conflict (module_key) do nothing;

insert into public.case_type_default_modules (case_type, module_key)
values
  ('debt_collection', 'collection')
on conflict (case_type, module_key) do nothing;

update public.cases
set module_flags = coalesce(module_flags, '{}'::jsonb) || jsonb_build_object(
  'billing', true,
  'collection', case when case_type = 'debt_collection' then true else coalesce((module_flags ->> 'collection')::boolean, false) end,
  'insolvency', coalesce((module_flags ->> 'insolvency')::boolean, false),
  'settlement', coalesce((module_flags ->> 'settlement')::boolean, false)
)
where true;

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

alter table public.case_module_catalog enable row level security;
alter table public.case_module_catalog force row level security;
alter table public.case_type_default_modules enable row level security;
alter table public.case_type_default_modules force row level security;

drop policy if exists case_module_catalog_select on public.case_module_catalog;
create policy case_module_catalog_select on public.case_module_catalog
for select to authenticated using (true);
drop policy if exists case_module_catalog_write on public.case_module_catalog;
create policy case_module_catalog_write on public.case_module_catalog
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());
drop policy if exists case_type_default_modules_select on public.case_type_default_modules;
create policy case_type_default_modules_select on public.case_type_default_modules
for select to authenticated using (true);
drop policy if exists case_type_default_modules_write on public.case_type_default_modules;
create policy case_type_default_modules_write on public.case_type_default_modules
for all to authenticated using (app.is_platform_admin()) with check (app.is_platform_admin());

drop trigger if exists audit_case_module_catalog on public.case_module_catalog;
create trigger audit_case_module_catalog after insert or update or delete on public.case_module_catalog
for each row execute procedure audit.capture_row_change();
drop trigger if exists audit_case_type_default_modules on public.case_type_default_modules;
create trigger audit_case_type_default_modules after insert or update or delete on public.case_type_default_modules
for each row execute procedure audit.capture_row_change();
