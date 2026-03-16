import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function getKey() {
  const raw = process.env.PII_ENCRYPTION_KEY_BASE64;
  if (!raw) {
    throw new Error('PII_ENCRYPTION_KEY_BASE64 is required for sensitive data storage.');
  }

  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 32) {
    return buffer;
  }

  return createHash('sha256').update(buffer).digest();
}

export function encryptString(value: string) {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptString(payload: string) {
  const [version, ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
  if (version !== 'v1' || !ivEncoded || !tagEncoded || !dataEncoded) {
    throw new Error('Invalid encrypted payload format.');
  }

  const key = getKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64url')),
    decipher.final()
  ]);
  return plain.toString('utf8');
}
