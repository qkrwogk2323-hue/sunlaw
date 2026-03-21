import { NextResponse } from 'next/server';
import { formatResidentRegistrationNumberMasked } from '@/lib/format';
import { encryptString } from '@/lib/pii';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generalSignupSchema } from '@/lib/validators';

const SIGNUP_RATE_LIMIT_WINDOW_MS = 60_000;
const SIGNUP_RATE_LIMIT_MAX = 5;
const signupAttempts = new Map<string, number[]>();

function getSignupRateLimitKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'unknown';
}

function isRateLimited(request: Request) {
  const key = getSignupRateLimitKey(request);
  const now = Date.now();
  const windowStart = now - SIGNUP_RATE_LIMIT_WINDOW_MS;
  const attempts = (signupAttempts.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  attempts.push(now);
  signupAttempts.set(key, attempts);
  return attempts.length > SIGNUP_RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429 }
      );
    }

    const payload = await request.json();
    const parsed = generalSignupSchema.parse(payload);
    const admin = createSupabaseAdminClient();
    const consentRecordedAt = new Date().toISOString();

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.legalName,
        signup_method: 'credential',
        privacy_consent_recorded_at: consentRecordedAt,
        privacy_consent_placeholder: true,
        service_consent_recorded_at: consentRecordedAt,
        service_consent_placeholder: true
      }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = createdUser.user?.id;
    if (!userId) {
      return NextResponse.json({ error: '회원가입 계정을 생성하지 못했습니다.' }, { status: 500 });
    }

    const residentNumberMasked = formatResidentRegistrationNumberMasked(parsed.residentNumber);
    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      email: parsed.email,
      full_name: parsed.legalName,
      legal_name: parsed.legalName,
      legal_name_confirmed_at: consentRecordedAt,
      phone_e164: parsed.phone,
      updated_at: consentRecordedAt
    }, { onConflict: 'id' });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: privateProfileError } = await admin.from('client_private_profiles').upsert({
      profile_id: userId,
      legal_name: parsed.legalName,
      resident_number_ciphertext: encryptString(parsed.residentNumber),
      resident_number_masked: residentNumberMasked,
      address_line1_ciphertext: parsed.addressLine1 ? encryptString(parsed.addressLine1) : null,
      address_line2_ciphertext: parsed.addressLine2 ? encryptString(parsed.addressLine2) : null,
      postal_code_ciphertext: parsed.postalCode ? encryptString(parsed.postalCode) : null,
      mobile_phone_ciphertext: encryptString(parsed.phone),
      created_by: userId,
      updated_by: userId
    }, { onConflict: 'profile_id' });

    if (privateProfileError) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
      return NextResponse.json({ error: privateProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '일반회원가입을 처리하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
