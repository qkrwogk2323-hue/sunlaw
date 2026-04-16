/**
 * PII 암호화 유닛 테스트 (Phase 3 완료 후 — v2-only).
 *
 * 2026-04-16 Phase 2에서 prod 전 row를 v2로 재암호화 완료, Phase 3에서 v1 경로 제거.
 * 이후 신규 암호화는 v2, 복호화도 v2만 허용.
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';

const ORIG = process.env.PII_ENCRYPTION_KEY_BASE64;
const TEST_KEY = 'dGVzdC1waWktdjIta2V5LTMyLWJ5dGVzLWxvbmchIQ==';

describe('PII 암호화 (v2-only)', () => {
  beforeEach(() => {
    process.env.PII_ENCRYPTION_KEY_BASE64 = TEST_KEY;
  });

  afterEach(() => {
    if (ORIG) process.env.PII_ENCRYPTION_KEY_BASE64 = ORIG;
    else delete process.env.PII_ENCRYPTION_KEY_BASE64;
  });

  it('encryptString은 v2 prefix로 생성되고 같은 키로 decrypt 가능', async () => {
    const { encryptString, decryptString } = await import('@/lib/pii');
    const payload = encryptString('주민번호:900101-1234567');
    expect(payload.startsWith('v2.')).toBe(true);
    expect(decryptString(payload)).toBe('주민번호:900101-1234567');
  });

  it('v1 payload는 거부 (Phase 3 이후)', async () => {
    const { decryptString } = await import('@/lib/pii');
    // 임의의 v1 포맷 문자열 (실제 복호화 실패해도 format 체크에서 먼저 throw)
    expect(() => decryptString('v1.aaa.bbb.ccc')).toThrow(/Expected v2 prefix/);
  });

  it('잘못된 포맷 payload는 throw', async () => {
    const { decryptString } = await import('@/lib/pii');
    expect(() => decryptString('garbage')).toThrow(/Expected v2 prefix/);
    expect(() => decryptString('v3.a.b.c')).toThrow(/Expected v2 prefix/);
  });

  it('키 없으면 명확한 에러', async () => {
    delete process.env.PII_ENCRYPTION_KEY_BASE64;
    const { encryptString } = await import('@/lib/pii');
    expect(() => encryptString('x')).toThrow(/PII_ENCRYPTION_KEY_BASE64 is required/);
  });

  it('다양한 문자열(한글/영문/특수) 왕복 암복호화', async () => {
    const { encryptString, decryptString } = await import('@/lib/pii');
    for (const s of ['한글🎉', 'plain-ascii', '900101-1234567', '특수문자!@#$%^&*()', '']) {
      expect(decryptString(encryptString(s))).toBe(s);
    }
  });
});
