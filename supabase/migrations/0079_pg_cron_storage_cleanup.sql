-- migration 0079: pg_cron scheduled storage cleanup
-- Schedules a daily HTTP call to /api/admin/storage-cleanup via pg_net,
-- so soft-deleted case_documents older than 30 days are physically purged
-- without requiring manual intervention.
--
-- Prerequisites: pg_cron and pg_net extensions must be enabled in Supabase.
-- Both are available by default in Supabase projects (Dashboard → Database → Extensions).
--
-- The cron job runs at 03:00 UTC daily and hits the internal service URL.
-- STORAGE_CLEANUP_SECRET is an env var set in Supabase Vault / project secrets
-- and passed as a bearer token so only the scheduled job can call this endpoint.

-- Enable required extensions (idempotent)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily cleanup at 03:00 UTC
-- Uses pg_net.http_post to call the Next.js API route server-side.
-- The Authorization header carries a long-lived secret set in SUPABASE_STORAGE_CLEANUP_SECRET.
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
);

comment on extension pg_cron is
  'Used by storage-cleanup-daily job (migration 0079) to purge soft-deleted documents after 30-day retention.';
