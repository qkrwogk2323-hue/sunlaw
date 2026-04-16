#!/usr/bin/env node
/**
 * Staging DB에 supabase/migrations/*.sql 를 순차 적용.
 *
 * Supabase Management API `/v1/projects/:ref/database/query` 호출 전에
 * `scripts/preprocess-migration.mjs`로 정규화한다. 각 파일이 성공적으로 적용되면
 * `public.staging_applied_migrations` 테이블에 기록하여 멱등성을 확보한다 —
 * 이미 적용된 파일은 skip.
 *
 * 환경변수:
 *   SUPABASE_ACCESS_TOKEN    (PAT, 필수)
 *   STAGING_PROJECT_ID       (ref, 필수, default `siljimybhmmtbligzbms`)
 *   MIGRATIONS_DIR           (기본 `supabase/migrations`)
 *
 * 사용법 (CI):
 *   SUPABASE_ACCESS_TOKEN=... STAGING_PROJECT_ID=... node scripts/apply-staging-migrations.mjs
 *
 * 종료 코드:
 *   0 = 적용 완료 (신규 0건 포함)
 *   1 = 설정 누락
 *   2 = 적용 실패
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { exit, env } from 'node:process';
import { preprocess } from './preprocess-migration.mjs';

const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID = env.STAGING_PROJECT_ID || 'siljimybhmmtbligzbms';
const MIGRATIONS_DIR = env.MIGRATIONS_DIR || 'supabase/migrations';

if (!ACCESS_TOKEN) {
  console.error('[apply-staging-migrations] SUPABASE_ACCESS_TOKEN 필수. skip.');
  exit(1);
}

const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;

async function runSql(sql) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'vein-spiral-staging-deploy/1.0',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function ensureTrackingTable() {
  const ddl = `
    create table if not exists public.staging_applied_migrations (
      filename text primary key,
      applied_at timestamptz not null default now(),
      sha256 text not null
    );
  `;
  const r = await runSql(ddl);
  if (!r.ok) {
    console.error(`[apply-staging-migrations] 추적 테이블 생성 실패: ${r.status} ${r.body}`);
    exit(2);
  }
}

async function getAppliedSet() {
  const r = await runSql(`select filename from public.staging_applied_migrations order by filename`);
  if (!r.ok) return new Set();
  try {
    return new Set(JSON.parse(r.body).map((row) => row.filename));
  } catch {
    return new Set();
  }
}

async function sha256(s) {
  const crypto = await import('node:crypto');
  return crypto.createHash('sha256').update(s).digest('hex');
}

function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort();
}

async function main() {
  console.log(`[apply-staging-migrations] target=${PROJECT_ID}`);
  await ensureTrackingTable();
  const applied = await getAppliedSet();
  const files = listMigrations();
  const pending = files.filter((f) => !applied.has(f));

  console.log(`[apply-staging-migrations] total=${files.length} applied=${applied.size} pending=${pending.length}`);

  if (!pending.length) {
    console.log('[apply-staging-migrations] 변경 없음. 종료.');
    return;
  }

  for (const f of pending) {
    const full = path.join(MIGRATIONS_DIR, f);
    const raw = readFileSync(full, 'utf-8');
    const sql = preprocess(raw);
    const hash = await sha256(raw);

    const r = await runSql(sql);
    if (!r.ok) {
      console.error(`[apply-staging-migrations] ✗ ${f} (http=${r.status})`);
      console.error(`  ${r.body.slice(0, 500)}`);
      exit(2);
    }
    const track = await runSql(
      `insert into public.staging_applied_migrations (filename, sha256) values ('${f}', '${hash}') on conflict (filename) do update set applied_at=now(), sha256=excluded.sha256`
    );
    if (!track.ok) {
      console.error(`[apply-staging-migrations] 기록 실패 ${f}: ${track.body.slice(0, 300)}`);
    }
    console.log(`[apply-staging-migrations] ✓ ${f}`);
  }

  console.log(`[apply-staging-migrations] 완료. 신규 ${pending.length}건 적용.`);
}

main().catch((e) => { console.error(e); exit(2); });
