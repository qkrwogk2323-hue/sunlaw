#!/usr/bin/env node
/**
 * PII 재암호화 마이그레이션 스크립트 (backlog #1 Phase 2) — 2026-04-16 실행 완료.
 *
 * ⚠️ 현재는 더 이상 실행 불필요. prod 전 row가 v2로 재암호화됨(커밋 ad240d9 직후).
 *    Phase 3에서 src/lib/pii.ts가 v2-only로 정리됨.
 *
 * 이 스크립트는 미래 키 회전(v2 → v3 등) 시 템플릿으로 사용하기 위해 보존.
 * 재실행 시 `v1` 대신 현재 prefix를 소스로, 새 버전을 타겟으로 조정해야 함.
 *
 * 원 용도:
 * v1 payload → decrypt(구키) → encrypt(신키, v2 prefix) → UPDATE.
 * 멱등: 이미 v2인 row는 skip. 실패 시 재실행 안전.
 *
 * 전제:
 *   - src/lib/pii.ts의 dual-key Phase 1이 이미 배포됨
 *   - 두 키 모두 환경변수로 제공
 *
 * 환경변수:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PII_ENCRYPTION_KEY_BASE64       (v1, 구키)
 *   PII_ENCRYPTION_KEY_BASE64_V2    (v2, 신키)
 *   DRY_RUN=1                        (선택)
 *
 * 사용법:
 *   node scripts/reencrypt-pii.mjs
 *   DRY_RUN=1 node scripts/reencrypt-pii.mjs
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY_V1 = process.env.PII_ENCRYPTION_KEY_BASE64;
const KEY_V2 = process.env.PII_ENCRYPTION_KEY_BASE64_V2;
const DRY = process.env.DRY_RUN === '1';

if (!URL || !SVC) {
  console.error('[reencrypt-pii] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}
if (!KEY_V1 || !KEY_V2) {
  console.error('[reencrypt-pii] 두 키 모두 필요: PII_ENCRYPTION_KEY_BASE64 + _V2');
  process.exit(1);
}

function loadKey(raw) {
  const buf = Buffer.from(raw, 'base64');
  return buf.length === 32 ? buf : createHash('sha256').update(buf).digest();
}
const keyV1 = loadKey(KEY_V1);
const keyV2 = loadKey(KEY_V2);

function decryptV1(payload) {
  const [v, ivEnc, tagEnc, dataEnc] = payload.split('.');
  if (v !== 'v1') throw new Error(`expected v1, got ${v}`);
  const decipher = createDecipheriv('aes-256-gcm', keyV1, Buffer.from(ivEnc, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEnc, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataEnc, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function encryptV2(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyV2, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function payloadVersion(p) {
  const v = p?.split('.')[0];
  return v === 'v1' || v === 'v2' ? v : null;
}

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

// table → { pk, columns }
const TARGETS = {
  case_party_private_profiles: {
    pk: 'id',
    columns: [
      'address_detail_ciphertext',
      'registration_number_ciphertext',
      'resident_number_ciphertext',
    ],
  },
  client_private_profiles: {
    pk: 'profile_id',
    columns: [
      'address_line1_ciphertext',
      'address_line2_ciphertext',
      'mobile_phone_ciphertext',
      'postal_code_ciphertext',
      'resident_number_ciphertext',
    ],
  },
  member_private_profiles: {
    pk: 'profile_id',
    columns: [
      'address_line1_ciphertext',
      'address_line2_ciphertext',
      'resident_number_ciphertext',
    ],
  },
};

let total = 0, reencrypted = 0, skipped = 0, failed = 0;

for (const [table, { pk, columns }] of Object.entries(TARGETS)) {
  const select = [pk, ...columns].join(',');
  const { data: rows, error } = await admin.from(table).select(select);
  if (error) {
    console.error(`[reencrypt-pii] ${table} select 실패: ${error.message}`);
    failed++;
    continue;
  }
  if (!rows?.length) {
    console.log(`[reencrypt-pii] ${table}: 0 rows, skip`);
    continue;
  }

  for (const row of rows) {
    total++;
    const updates = {};
    let need = false;

    for (const col of columns) {
      const payload = row[col];
      if (!payload) continue;
      const v = payloadVersion(payload);
      if (v === 'v2') continue;
      if (v !== 'v1') {
        console.warn(`[reencrypt-pii] ${table}.${row.id}.${col}: unknown version, skip`);
        continue;
      }
      try {
        const plain = decryptV1(payload);
        updates[col] = encryptV2(plain);
        need = true;
      } catch (e) {
        console.error(`[reencrypt-pii] ${table}.${row[pk]}.${col}: decrypt 실패 ${e.message}`);
        failed++;
      }
    }

    if (!need) { skipped++; continue; }

    if (DRY) {
      console.log(`[reencrypt-pii][DRY] ${table}.${row[pk]}: ${Object.keys(updates).length} cols → v2`);
      reencrypted++;
      continue;
    }

    const { error: upErr } = await admin.from(table).update(updates).eq(pk, row[pk]);
    if (upErr) {
      console.error(`[reencrypt-pii] ${table}.${row[pk]}: update 실패 ${upErr.message}`);
      failed++;
    } else {
      console.log(`[reencrypt-pii] ✓ ${table}.${row[pk]}: ${Object.keys(updates).length} cols → v2`);
      reencrypted++;
    }
  }
}

console.log('');
console.log(`[reencrypt-pii] visited: ${total}`);
console.log(`[reencrypt-pii] reencrypted: ${reencrypted}${DRY ? ' (DRY)' : ''}`);
console.log(`[reencrypt-pii] already v2: ${skipped}`);
console.log(`[reencrypt-pii] failed: ${failed}`);

if (failed) process.exit(2);
