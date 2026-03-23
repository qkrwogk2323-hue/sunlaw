/**
 * Storage cleanup endpoint — platform admin OR scheduled pg_cron job.
 * Physically removes storage files for soft-deleted case_documents
 * that have been deleted for more than the retention period (default: 30 days).
 *
 * Two callers are authorised:
 *   1. Platform admin session (interactive use via requirePlatformAdminAction)
 *   2. pg_cron via pg_net with Bearer token matching SUPABASE_STORAGE_CLEANUP_SECRET
 *      (see migration 0079)
 *
 * Deletion order is intentional:
 *   a) Storage remove() first — if this fails, DB row is untouched (safe to retry)
 *   b) DB storage_path nulled after storage confirm — row kept for audit trail
 */
import { NextResponse } from 'next/server';
import { getCurrentAuth, isPlatformOperator } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const RETENTION_DAYS = 30;
const BATCH_SIZE = 100;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'case-files';
const CLEANUP_SECRET = process.env.SUPABASE_STORAGE_CLEANUP_SECRET ?? '';

export async function POST(request: Request) {
  // Accept either a platform admin session or the shared cleanup secret (pg_cron).
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const isCronCaller = CLEANUP_SECRET.length > 0 && bearerToken === CLEANUP_SECRET;

  if (!isCronCaller) {
    // Interactive call: require platform admin session.
    const auth = await getCurrentAuth();
    if (!auth || !isPlatformOperator(auth)) {
      return NextResponse.json(
        { ok: false, code: 'FORBIDDEN', userMessage: '\uc2a4\ud1a0\ub9ac\uc9c0 \uc815\ub9ac\ub294 \ud50c\ub7ab\ud3fc \uad00\ub9ac\uc790\ub9cc \uc2e4\ud589\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.' },
        { status: 403 }
      );
    }
  }

  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from('case_documents')
    .select('id, storage_path')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .not('storage_path', 'is', null)
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      { ok: false, code: 'QUERY_ERROR', userMessage: '\uc0ad\uc81c \ub300\uc0c1 \uc870\ud68c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.' },
      { status: 500 }
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const storagePaths = rows.map(r => r.storage_path as string).filter(Boolean);
  const docIds = rows.map(r => r.id as string);

  // Step a: remove from storage first.
  // storage.remove() treats "file not found" as success (idempotent by Supabase spec),
  // so a partial failure (storage ok, DB update failed) on a prior run retries safely.
  // If remove() returns a fatal error, abort before touching DB.
  const { error: storageError } = await admin.storage.from(BUCKET).remove(storagePaths);
  if (storageError) {
    // Supabase returns an error object only for auth/permission failures, not for missing files.
    // If we get here, it's a genuine error — leave DB untouched so the batch retries cleanly.
    return NextResponse.json(
      { ok: false, code: 'STORAGE_ERROR', userMessage: '\uc2a4\ud1a0\ub9ac\uc9c0 \ud30c\uc77c \uc0ad\uc81c \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.' },
      { status: 500 }
    );
  }

  // Step b: null storage_path only after confirmed removal (DB row kept for audit).
  // If this update fails (transient DB error), the next cleanup run will try remove() again
  // for the same paths — which is a no-op since the files are already gone.
  await admin
    .from('case_documents')
    .update({ storage_path: null })
    .in('id', docIds);

  return NextResponse.json({ ok: true, purged: storagePaths.length });
}

