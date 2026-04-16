/**
 * PII dual-key 암호화 유닛 테스트 (backlog #1 Phase 1).
 *
 * 검증 대상:
 *   1. v1 키만 있을 때 encrypt → v1 prefix, decrypt 가능
 *   2. v1 + v2 키 둘 다 있을 때 encrypt → v2 prefix (신규 데이터는 신키로)
 *   3. v1 payload는 v2 키가 있어도 v1 키로 복호화 (dual-key 핵심)
 *   4. encryptStringWithVersion로 v1 강제 가능 (재암호화 역방향 필요 시)
 *   5. encryptStringWithVersion로 v2 강제 가능 (재암호화 스크립트 용도)
 *   6. 잘못된 payload 포맷은 throw
 *   7. V2 키 없이 v2 payload 복호화 시도는 명확한 에러
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';

const ORIG_V1 = process.env.PII_ENCRYPTION_KEY_BASE64;
const ORIG_V2 = process.env.PII_ENCRYPTION_KEY_BASE64_V2;

// 테스트용 키 (32-byte base64)
const TEST_V1_KEY = 'dGVzdC1waWktdjEta2V5LTMyLWJ5dGVzLWxvbmchIQ==';
const TEST_V2_KEY = 'dGVzdC1waWktdjIta2V5LTMyLWJ5dGVzLWxvbmchIQ==';

function setKeys(v1: string | null, v2: string | null) {
  if (v1) process.env.PII_ENCRYPTION_KEY_BASE64 = v1;
  else delete process.env.PII_ENCRYPTION_KEY_BASE64;
  if (v2) process.env.PII_ENCRYPTION_KEY_BASE64_V2 = v2;
  else delete process.env.PII_ENCRYPTION_KEY_BASE64_V2;
}

// pii 모듈은 환경변수를 lazy 로드하므로 테스트마다 재 import 필요 없음.
// 각 함수가 호출 시점에 process.env를 읽음.

describe('PII dual-key', () => {
  beforeEach(() => {
    setKeys(TEST_V1_KEY, null);
  });

  afterEach(() => {
    setKeys(ORIG_V1 ?? null, ORIG_V2 ?? null);
  });

  it('v1 전용 모드: encryptString은 v1 prefix로 생성, 같은 키로 decrypt', async () => {
    const { encryptString, decryptString } = await import('@/lib/pii');
    const payload = encryptString('주민번호:900101-1234567');
    expect(payload.startsWith('v1.')).toBe(true);
    expect(decryptString(payload)).toBe('주민번호:900101-1234567');
  });

  it('v1+v2 동시 모드: 신규 encrypt는 v2 prefix', async () => {
    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    const { encryptString } = await import('@/lib/pii');
    const payload = encryptString('신규 데이터');
    expect(payload.startsWith('v2.')).toBe(true);
  });

  it('dual-key 복호화: v1 payload는 v2 키가 있어도 v1 키로 해석', async () => {
    // v1 전용 상태에서 payload 생성
    const { encryptString: enc1, decryptString } = await import('@/lib/pii');
    const v1Payload = enc1('구 암호화 데이터');
    expect(v1Payload.startsWith('v1.')).toBe(true);

    // 이제 v2 키도 추가 (실제 Phase 1 배포 상황)
    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    // v1 payload는 여전히 복호화 가능해야 함
    expect(decryptString(v1Payload)).toBe('구 암호화 데이터');
  });

  it('dual-key 복호화: v2 payload는 v2 키로 해석', async () => {
    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    const { encryptString, decryptString } = await import('@/lib/pii');
    const payload = encryptString('신규 암호화 데이터');
    expect(payload.startsWith('v2.')).toBe(true);
    expect(decryptString(payload)).toBe('신규 암호화 데이터');
  });

  it('encryptStringWithVersion: v2 강제 (재암호화 스크립트 용도)', async () => {
    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    const { encryptStringWithVersion, decryptString } = await import('@/lib/pii');
    const payload = encryptStringWithVersion('마이그레이션 데이터', 'v2');
    expect(payload.startsWith('v2.')).toBe(true);
    expect(decryptString(payload)).toBe('마이그레이션 데이터');
  });

  it('잘못된 포맷 payload는 throw', async () => {
    const { decryptString } = await import('@/lib/pii');
    expect(() => decryptString('garbage')).toThrow(/Invalid encrypted payload format/);
    expect(() => decryptString('v3.a.b.c')).toThrow(/Invalid encrypted payload format/);
  });

  it('V2 키 없이 v2 payload 복호화 시 명확한 에러', async () => {
    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    const { encryptString } = await import('@/lib/pii');
    const v2Payload = encryptString('x');
    expect(v2Payload.startsWith('v2.')).toBe(true);

    // V2 키 제거 후 복호화 시도
    setKeys(TEST_V1_KEY, null);
    const { decryptString } = await import('@/lib/pii');
    expect(() => decryptString(v2Payload)).toThrow(/PII_ENCRYPTION_KEY_BASE64_V2 is required/);
  });

  it('getPayloadVersion: 감사용 버전 조회', async () => {
    const { encryptString, getPayloadVersion } = await import('@/lib/pii');
    const v1 = encryptString('a');
    expect(getPayloadVersion(v1)).toBe('v1');
    expect(getPayloadVersion('garbage')).toBe(null);

    setKeys(TEST_V1_KEY, TEST_V2_KEY);
    const v2 = encryptString('b');
    expect(getPayloadVersion(v2)).toBe('v2');
  });
});
