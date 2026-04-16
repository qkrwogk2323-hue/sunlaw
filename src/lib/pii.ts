import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * PII 암호화 — AES-256-GCM.
 *
 * payload 포맷:
 *   v2.{iv}.{tag}.{data}
 *
 * 2026-04-16 Phase 3 완료: v1(구키) 경로 제거. 모든 prod row가 v2로 재암호화됨.
 * v1 payload와 마주치면 즉시 에러 — 재등장하면 마이그레이션 누락을 의미.
 *
 * 환경변수:
 *   PII_ENCRYPTION_KEY_BASE64   (32-byte base64)
 */

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY_BASE64;
  if (!raw) {
    throw new Error('PII_ENCRYPTION_KEY_BASE64 is required for sensitive data storage.');
  }
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 32) return buffer;
  return createHash('sha256').update(buffer).digest();
}

export function encryptString(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptString(payload: string): string {
  const parts = payload.split('.');
  const [version, ivEncoded, tagEncoded, dataEncoded] = parts;
  // dataEncoded는 빈 문자열 허용 (빈 평문 암호화 시 가능), 존재 여부만 체크
  if (version !== 'v2' || !ivEncoded || !tagEncoded || parts.length !== 4) {
    throw new Error('Invalid encrypted payload format. Expected v2 prefix.');
  }
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64url')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}
