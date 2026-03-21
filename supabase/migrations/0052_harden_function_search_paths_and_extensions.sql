create schema if not exists extensions;

grant usage on schema extensions to postgres, anon, authenticated, service_role;

alter function public.touch_org_exit_requests_updated_at()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.sync_notification_model()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.mark_document_stale()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.set_updated_at()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.set_updated_at_and_row_version()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.guard_document_review_update()
  set search_path = pg_catalog, public, app, auth, extensions;

alter function app.default_stage_template(public.case_type)
  set search_path = pg_catalog, public, app, auth, extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'citext') then
    execute 'alter extension citext set schema extensions';
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;
