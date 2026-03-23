import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const resolveSchema = z.object({
  loginId: z.string().trim().min(2).max(120)
});

// Module-level rate limiter (per cold start).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
const rateMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (rateMap.get(ip) ?? []).filter(t => now - t < RL_WINDOW_MS);
  if (attempts.length >= RL_MAX) { rateMap.set(ip, attempts); return true; }
  attempts.push(now);
  rateMap.set(ip, attempts);
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = resolveSchema.parse(body);
    const admin = createSupabaseAdminClient();

    const { data: account } = await admin
      .from('client_temp_credentials')
      .select('login_email')
      .eq('login_id_normalized', parsed.loginId.toLowerCase())
      .maybeSingle();

    if (!account?.login_email) {
      // Generic message to prevent enumeration
      return NextResponse.json({ message: '임시 로그인 정보를 확인할 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ email: account.login_email });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? '입력값이 올바르지 않습니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: '의뢰인 임시 로그인 정보를 확인하지 못했습니다.' }, { status: 500 });
  }
}
