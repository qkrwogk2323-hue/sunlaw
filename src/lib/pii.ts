import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * PII 암호화 — AES-256-GCM, key-versioned envelope.
 *
 * 2026-04-15 보안 incident(`docs/SECURITY_INCIDENT_2026-04-15_SECRET_EXPOSURE.md`)에서
 * 구 키(v1)가 노출됐다. 재암호화 마이그레이션을 위한 dual-key 지원.
 *
 * payload 포맷:
 *   v1.{iv}.{tag}.{data}   — PII_ENCRYPTION_KEY_BASE64 (구키)
 *   v2.{iv}.{tag}.{data}   — PII_ENCRYPTION_KEY_BASE64_V2 (신키)
 *
 * 환경변수:
 *   PII_ENCRYPTION_KEY_BASE64      (필수, v1 decrypt용)
 *   PII_ENCRYPTION_KEY_BASE64_V2   (선택, 있으면 모든 신규 encrypt가 v2로 생성)
 *
 * 동작:
 *   encryptString — V2 환경변수가 있으면 v2로, 없으면 v1로 암호화
 *   decryptString — payload prefix로 버전 자동 감지, 해당 키로 복호화
 *
 * Phase 2 재암호화 스크립트(`scripts/reencrypt-pii.mjs`):
 *   v1 payload 만나면 decrypt → encrypt(v2 강제) → UPDATE
 *
 * Phase 3(재암호화 완료 후):
 *   v1 분기 제거 → PII_ENCRYPTION_KEY_BASE64를 신키로 교체 → _V2 제거
 */

type KeyVersion = 'v1' | 'v2';

function loadKey(envName: string): Buffer | null {
  const raw = process.env[envName];
  if (!raw) return null;
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 32) return buffer;
  return createHash('sha256').update(buffer).digest();
}

function requireKey(version: KeyVersion): Buffer {
  const envName = version === 'v1' ? 'PII_ENCRYPTION_KEY_BASE64' : 'PII_ENCRYPTION_KEY_BASE64_V2';
  const key = loadKey(envName);
  if (!key) {
    throw new Error(`${envName} is required to decrypt ${version} payloads.`);
  }
  return key;
}

function activeEncryptVersion(): KeyVersion {
  return loadKey('PII_ENCRYPTION_KEY_BASE64_V2') ? 'v2' : 'v1';
}

export function encryptString(value: string): string {
  return encryptStringWithVersion(value, activeEncryptVersion());
}

/**
 * 특정 버전으로 강제 암호화. 재암호화 스크립트가 v2를 강제할 때 사용.
 */
export function encryptStringWithVersion(value: string, version: KeyVersion): string {
  const key = requireKey(version);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${version}.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptString(payload: string): string {
  const [version, ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
  if ((version !== 'v1' && version !== 'v2') || !ivEncoded || !tagEncoded || !dataEncoded) {
    throw new Error('Invalid encrypted payload format.');
  }

  const key = requireKey(version);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64url')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

/**
 * payload의 key version 반환 (재암호화 진행률 감사용).
 */
export function getPayloadVersion(payload: string): KeyVersion | null {
  const version = payload.split('.')[0];
  return version === 'v1' || version === 'v2' ? version : null;
}
