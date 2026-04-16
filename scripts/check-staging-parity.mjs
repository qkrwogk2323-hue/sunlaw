#!/usr/bin/env node
/**
 * Prod와 staging schema 구조를 7가지 메트릭으로 비교.
 *
 * migration 적용 직후 staging이 prod와 동등한 구조인지 검증한다.
 * 불일치 발견 시 exit=2 + GitHub Actions에 `::error::` annotation.
 *
 * 환경변수:
 *   SUPABASE_ACCESS_TOKEN     (PAT, 필수)
 *   PROD_PROJECT_ID           (기본 `hyfdebinoirtluwpfmqx`)
 *   STAGING_PROJECT_ID        (기본 `siljimybhmmtbligzbms`)
 *   ALLOW_EXTRA_INDEXES       (개수, 기본 1 — staging unique constraint 허용)
 *
 * 비교 대상:
 *   - tables(public)
 *   - functions(public/app/audit, extension 제외)
 *   - triggers(public, extension 제외)
 *   - policies(public)
 *   - policies(storage)
 *   - indexes(public, extension 제외)
 *
 * 스키마 증분 작업은 항상 prod보다 staging이 먼저. 따라서 staging은 prod와 같거나
 * 많은 건 허용되나 적으면 실패. (정확히 같은지 비교하려면 ALLOW_EXTRA_* 을 0으로)
 */
import { exit, env, stdout } from 'node:process';

const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
const PROD = env.PROD_PROJECT_ID || 'hyfdebinoirtluwpfmqx';
const STAGING = env.STAGING_PROJECT_ID || 'siljimybhmmtbligzbms';
const ALLOW_EXTRA_INDEXES = Number(env.ALLOW_EXTRA_INDEXES ?? 2);

if (!ACCESS_TOKEN) {
  console.warn('[check-staging-parity] SUPABASE_ACCESS_TOKEN 없음. skip.');
  exit(0);
}

async function q(project, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'vein-spiral-parity-check/1.0',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`query failed http=${res.status} body=${body.slice(0, 300)}`);
  }
  return JSON.parse(await res.text());
}

const METRICS = {
  'tables(public)':
    `select count(*)::int as n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
  'functions(x-ext)':
    `select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname in ('public','app','audit')
       and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')`,
  'triggers(x-ext)':
    `select count(*)::int as n from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where not t.tgisinternal and n.nspname='public'
       and not exists (select 1 from pg_depend d where d.objid=t.oid and d.deptype='e')`,
  'policies(public)':
    `select count(*)::int as n from pg_policies where schemaname='public'`,
  'policies(storage)':
    `select count(*)::int as n from pg_policies where schemaname='storage'`,
  'indexes(x-ext)':
    `select count(*)::int as n from pg_index i join pg_class c on c.oid=i.indexrelid
     join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
       and not exists (select 1 from pg_depend d where d.objid=c.oid and d.deptype='e')`,
};

async function main() {
  console.log(`[check-staging-parity] prod=${PROD} staging=${STAGING}`);
  const rows = [];
  let failures = 0;

  for (const [label, sql] of Object.entries(METRICS)) {
    const [p, s] = await Promise.all([q(PROD, sql), q(STAGING, sql)]);
    const prodN = p[0].n;
    const stgN = s[0].n;

    let status;
    if (label === 'indexes(x-ext)') {
      const delta = stgN - prodN;
      if (delta < 0) { status = 'FAIL'; failures++; }
      else if (delta > ALLOW_EXTRA_INDEXES) { status = 'WARN'; }
      else { status = 'OK'; }
    } else {
      if (stgN < prodN) { status = 'FAIL'; failures++; }
      else if (stgN > prodN) { status = 'WARN'; }
      else { status = 'OK'; }
    }
    rows.push({ label, prodN, stgN, status });
  }

  const pad = (v, w) => String(v).padEnd(w);
  stdout.write(`\n  ${pad('metric', 22)} ${pad('prod', 8)} ${pad('staging', 8)} status\n`);
  stdout.write(`  ${'-'.repeat(22)} ${'-'.repeat(8)} ${'-'.repeat(8)} ------\n`);
  for (const r of rows) {
    stdout.write(`  ${pad(r.label, 22)} ${pad(r.prodN, 8)} ${pad(r.stgN, 8)} ${r.status}\n`);
    if (r.status === 'FAIL' && env.GITHUB_ACTIONS === 'true') {
      console.error(`::error::staging drift: ${r.label} prod=${r.prodN} staging=${r.stgN}`);
    }
  }
  stdout.write('\n');

  if (failures) {
    console.error(`[check-staging-parity] FAIL — staging이 prod보다 ${failures}개 메트릭에서 부족함.`);
    exit(2);
  }
  console.log('[check-staging-parity] OK — staging ≥ prod.');
}

main().catch((e) => { console.error(e); exit(2); });
