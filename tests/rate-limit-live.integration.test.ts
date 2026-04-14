/**
 * rate_limit_buckets 실 DB 통합 테스트 (지시서 4.4)
 *
 * 검증 대상:
 *   "checkDbRateLimit이 실제 rate_limit_buckets 테이블을 통해 정상 구간은 통과,
 *    임계치 초과만 차단하는가?"
 *
 * 모킹된 단위 테스트(tests/general-signup.test.ts, temp-login-sign-in.test.ts)는
 * 라우트 핸들러가 checkDbRateLimit 결과에 따라 200/429를 반환한다는 계약만
 * 검증한다. 이 테스트는 그보다 한 단계 더 들어가, checkDbRateLimit 자체가
 * 실제 DB와 맞물려 정확히 동작하는지를 본다.
 *
 * env 미설정 시 graceful skip — fork PR 무해.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(SUPABASE_URL && SERVICE_ROLE);

describe.skipIf(!hasEnv)('checkDbRateLimit — rate_limit_buckets 실 DB 검증', () => {
  let admin: SupabaseClient;
  let testKey: string;
  let bucketId: string;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // 매 실행 고유 key로 격리
    testKey = `rate-limit-live-test:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    bucketId = crypto.createHash('sha256').update(testKey).digest('hex').slice(0, 40);
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('rate_limit_buckets').delete().eq('id', bucketId);
  });

  it('rate_limit_buckets 테이블이 존재하고 service_role로 RW 가능해야 한다', async () => {
    const { error: insertError } = await admin.from('rate_limit_buckets').insert({
      id: bucketId,
      attempts: 1,
      window_start: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(insertError).toBeNull();

    const { data, error: selectError } = await admin
      .from('rate_limit_buckets')
      .select('id, attempts, window_start, expires_at')
      .eq('id', bucketId)
      .maybeSingle();
    expect(selectError).toBeNull();
    expect(data).toMatchObject({ id: bucketId, attempts: 1 });
  });

  it('checkDbRateLimit (max=5, window=60) — 1~5회 false, 6회부터 true', async () => {
    // 환경변수가 세팅된 상태로 런타임에 import해야 admin client가 valid env로 만들어짐.
    const { checkDbRateLimit } = await import('@/lib/rate-limit');

    const key = `live-rl:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const live: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const limited = await checkDbRateLimit(key, 5, 60, { failClosed: false });
      live.push(limited);
    }

    // 1~5회는 통과(false), 6~7회는 차단(true)
    expect(live.slice(0, 5).every((v) => v === false)).toBe(true);
    expect(live.slice(5).every((v) => v === true)).toBe(true);

    // 정리
    const liveBucketId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 40);
    await admin.from('rate_limit_buckets').delete().eq('id', liveBucketId);
  });

  it('expires_at 경과 후에는 카운터가 리셋된다', async () => {
    const key = `expire-test:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const liveBucketId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 40);

    // 직접 expired 상태로 insert (1초 전 만료)
    await admin.from('rate_limit_buckets').upsert({
      id: liveBucketId,
      attempts: 99,
      window_start: new Date(Date.now() - 120_000).toISOString(),
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    });

    const { checkDbRateLimit } = await import('@/lib/rate-limit');
    const limited = await checkDbRateLimit(key, 5, 60, { failClosed: false });
    expect(limited).toBe(false); // 만료됐으므로 카운터 리셋, 첫 호출은 통과

    // 정리
    await admin.from('rate_limit_buckets').delete().eq('id', liveBucketId);
  });
});
