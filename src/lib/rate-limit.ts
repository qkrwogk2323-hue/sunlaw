/**
 * Distributed-safe rate limiting backed by Supabase DB.
 * Uses the `rate_limit_buckets` table (migration 0078) so all serverless instances
 * share the same counters — unlike module-level Maps which are per-instance.
 */
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import crypto from 'node:crypto';

/**
 * Returns true if the request should be blocked (rate limit exceeded).
 * @param key    Unique identifier for the rate-limit bucket (e.g. "temp-login:1.2.3.4")
 * @param max    Maximum allowed attempts in the window
 * @param windowSec  Window duration in seconds
 */
export async function checkDbRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const bucketId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 40);
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSec * 1000);

  try {
    // Upsert: if row doesn't exist, insert with attempts=1.
    // If it exists and is still within its window, increment.
    // If it exists but expired, reset (treat as new window).
    const { data: existing } = await admin
      .from('rate_limit_buckets')
      .select('attempts, window_start, expires_at')
      .eq('id', bucketId)
      .maybeSingle();

    if (!existing || new Date(existing.expires_at) < now) {
      // New bucket or expired — start fresh
      await admin
        .from('rate_limit_buckets')
        .upsert({ id: bucketId, attempts: 1, window_start: now.toISOString(), expires_at: expiresAt.toISOString() });
      return false;
    }

    // Window still active — increment
    const newAttempts = existing.attempts + 1;
    await admin
      .from('rate_limit_buckets')
      .update({ attempts: newAttempts })
      .eq('id', bucketId);

    return newAttempts > max;
  } catch (err) {
    // Fail open: if DB is unreachable, do not block the request.
    // This is intentional — a DB outage should not lock users out.
    console.error('[checkDbRateLimit] DB error, failing open', { key: bucketId, err });
    return false;
  }
}
