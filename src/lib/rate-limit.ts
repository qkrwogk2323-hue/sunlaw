/**
 * Distributed-safe rate limiting backed by Supabase DB.
 * Uses the `rate_limit_buckets` table (migration 0078) so all serverless instances
 * share the same counters — unlike module-level Maps which are per-instance.
 */
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import crypto from 'node:crypto';

export interface RateLimitOptions {
  /**
   * When true, a DB error causes the request to be BLOCKED (fail-closed).
   * Use for auth/security-critical endpoints.
   * Default: false (fail-open).
   */
  failClosed?: boolean;
}

/**
 * Returns true if the request should be blocked (rate limit exceeded).
 * @param key        Unique identifier for the bucket (e.g. "temp-login:1.2.3.4")
 * @param max        Maximum allowed attempts in the window
 * @param windowSec  Window duration in seconds
 * @param options    { failClosed } — set true for auth endpoints
 */
export async function checkDbRateLimit(
  key: string,
  max: number,
  windowSec: number,
  options: RateLimitOptions = {}
): Promise<boolean> {
  const { failClosed = false } = options;
  const bucketId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 40);
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSec * 1000);

  try {
    const { data: existing } = await admin
      .from('rate_limit_buckets')
      .select('attempts, window_start, expires_at')
      .eq('id', bucketId)
      .maybeSingle();

    if (!existing || new Date(existing.expires_at) < now) {
      await admin
        .from('rate_limit_buckets')
        .upsert({ id: bucketId, attempts: 1, window_start: now.toISOString(), expires_at: expiresAt.toISOString() });
      return false;
    }

    const newAttempts = existing.attempts + 1;
    await admin
      .from('rate_limit_buckets')
      .update({ attempts: newAttempts })
      .eq('id', bucketId);

    return newAttempts > max;
  } catch (err) {
    if (failClosed) {
      console.error('[checkDbRateLimit] DB error, failing closed (auth endpoint)', { key: bucketId, err });
      return true;
    }
    console.error('[checkDbRateLimit] DB error, failing open', { key: bucketId, err });
    return false;
  }
}
