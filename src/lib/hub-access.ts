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
  return cookieStore.get(cookieName(scope, hubId))?.value === 'ok';
}

export async function grantHubPinAccess(scope: HubAccessScope, hubId: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(scope, hubId), 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  });
}

export async function revokeHubPinAccess(scope: HubAccessScope, hubId: string) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(scope, hubId));
}
