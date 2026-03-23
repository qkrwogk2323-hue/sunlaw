/**
 * Server-side temp-login authentication.
 * Email is never returned to the client — the full signIn occurs server-side and
 * auth cookies are written directly, closing the enumeration attack surface.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkDbRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  organizationKey: z.string().trim().min(1).max(120),
  loginId: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(256)
});

const UNIFORM_DELAY_MS = 300;
const GENERIC_FAIL = { message: '\uc784\uc2dc \ub85c\uadf8\uc778 \uc815\ubcf4\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.' };

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limited = await checkDbRateLimit(`temp-login:${ip}`, 10, 60);
  if (limited) {
    await new Promise(r => setTimeout(r, UNIFORM_DELAY_MS));
    return NextResponse.json({ message: '\uc694\uccad\uc774 \ub108\ubb34 \ub9ce\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.' }, { status: 429 });
  }

  const start = Date.now();

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      await padDelay(start);
      return NextResponse.json(GENERIC_FAIL, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // 1. Resolve organization
    let { data: org } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', parsed.data.organizationKey)
      .neq('lifecycle_status', 'soft_deleted')
      .maybeSingle();

    if (!org?.id) {
      const byId = await admin
        .from('organizations')
        .select('id')
        .eq('id', parsed.data.organizationKey)
        .neq('lifecycle_status', 'soft_deleted')
        .maybeSingle();
      org = byId.data ?? null;
    }

    if (!org?.id) {
      await padDelay(start);
      return NextResponse.json(GENERIC_FAIL, { status: 404 });
    }

    // 2. Resolve email server-side — never returned to client
    const { data: account } = await admin
      .from('organization_staff_temp_credentials')
      .select('login_email')
      .eq('organization_id', org.id)
      .eq('login_id_normalized', parsed.data.loginId.toLowerCase())
      .maybeSingle();

    if (!account?.login_email) {
      await padDelay(start);
      return NextResponse.json(GENERIC_FAIL, { status: 404 });
    }

    // 3. Sign in server-side — auth cookies are set automatically via SSR client
    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.login_email,
      password: parsed.data.password
    });

    if (signInError) {
      await padDelay(start);
      return NextResponse.json(GENERIC_FAIL, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    await padDelay(start);
    return NextResponse.json(GENERIC_FAIL, { status: 500 });
  }
}

async function padDelay(startMs: number) {
  const elapsed = Date.now() - startMs;
  if (elapsed < UNIFORM_DELAY_MS) {
    await new Promise(r => setTimeout(r, UNIFORM_DELAY_MS - elapsed));
  }
}
