import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';

type HubAccessScope = 'case_hub' | 'collaboration_hub';

function cookieName(scope: HubAccessScope, hubId: string) {
  return `_vs_${scope}_pin_${hubId}`;
}

export function hashHubPin(pin: string) {
  return createHash('sha256').update(pin).digest('hex');
}

export async function hasVerifiedHubPin(scope: HubAccessScope, hubId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName(scope, hubId))?.value ?? '';
  if (!value) return false;
  if (value === 'ok') return true;
  const expiresAt = Number(value);
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() < expiresAt;
}

export async function grantHubPinAccess(scope: HubAccessScope, hubId: string, expiresAt?: string | null) {
  const cookieStore = await cookies();
  const deadline = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 1000 * 60 * 2;
  const maxAge = Math.max(1, Math.floor((deadline - Date.now()) / 1000));
  cookieStore.set(cookieName(scope, hubId), `${deadline}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge
  });
}

export async function revokeHubPinAccess(scope: HubAccessScope, hubId: string) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(scope, hubId));
}
