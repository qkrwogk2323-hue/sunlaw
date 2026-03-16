import { createHash, randomBytes } from 'crypto';

export function createInvitationToken() {
  return randomBytes(24).toString('base64url');
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
