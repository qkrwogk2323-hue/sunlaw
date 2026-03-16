import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'vs-support-session';

type SupportCookiePayload = {
  requestId: string;
  organizationId: string;
  organizationName: string;
  targetName: string;
  targetEmail: string;
  startedAt: string;
};

function getSecret() {
  const secret = process.env.SUPPORT_IMPERSONATION_COOKIE_SECRET;
  if (!secret) {
    throw new Error('SUPPORT_IMPERSONATION_COOKIE_SECRET is required');
  }
  return secret;
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function encode(payload: SupportCookiePayload) {
  const raw = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${raw}.${sign(raw)}`;
}

function decode(value: string): SupportCookiePayload | null {
  const [raw, signature] = value.split('.');
  if (!raw || !signature) return null;
  const expected = sign(raw);
  try {
    const safe = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!safe) return null;
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SupportCookiePayload;
  } catch {
    return null;
  }
}

export async function writeSupportSessionCookie(payload: SupportCookiePayload) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60
  });
}

export async function clearSupportSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSupportSessionCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decode(value);
}
