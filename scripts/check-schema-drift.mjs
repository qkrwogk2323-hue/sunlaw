#!/usr/bin/env node
/**
 * 원격 DB가 critical tables를 전부 보유하고 있는지 확인.
 *
 * squash 이후 hotfix migration 누락 등으로 생긴 드리프트를 조기에 감지한다.
 * migration 파일이 정의한 "보유해야 할 핵심 테이블"과 원격 information_schema를 대조.
 *
 * 사용법 (dev/CI):
 *   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  node scripts/check-schema-drift.mjs
 *
 * 누락 테이블이 하나라도 있으면 exit code 2로 실패.
 * 환경변수 미설정 시 graceful skip (exit 0) — 로컬에서 무해.
 */

const EXPECTED_TABLES = [
  // core
  'organizations',
  'profiles',
  'organization_memberships',
  'cases',
  'case_handlers',
  'case_clients',
  'case_parties',
  'case_documents',
  'case_schedules',
  'case_requests',
  'case_organizations',
  'rate_limit_buckets',
  // rehabilitation
  'rehabilitation_applications',
  'rehabilitation_creditor_settings',
  'rehabilitation_creditors',
  'rehabilitation_secured_properties',
  'rehabilitation_properties',
  'rehabilitation_property_deductions',
  'rehabilitation_family_members',
  'rehabilitation_income_settings',
  'rehabilitation_affidavits',
  'rehabilitation_plan_sections',
  'rehabilitation_prohibition_orders',
  // insolvency shared
  'insolvency_creditors',
  'insolvency_repayment_plans',
  'insolvency_repayment_allocations',
  'insolvency_collaterals',
  'insolvency_client_action_packets',
  'insolvency_client_action_items',
];

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.warn('[check-schema-drift] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set; skipping.');
  process.exit(0);
}

// PostgREST는 information_schema 직접 조회를 지원하지 않으므로, public에 노출된
// 각 테이블을 HEAD 요청으로 존재 여부만 확인한다 (service_role은 RLS 우회).
async function tableExists(name) {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(name)}?select=*&limit=0`;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    });
    // PostgREST returns 200 with Content-Range on existing tables; 404 on missing.
    return res.ok;
  } catch (err) {
    console.error(`[check-schema-drift] network error for ${name}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

const results = await Promise.all(
  EXPECTED_TABLES.map(async (name) => ({ name, present: await tableExists(name) }))
);

const missing = results.filter((r) => !r.present).map((r) => r.name);

if (missing.length) {
  console.error('[check-schema-drift] MISSING TABLES on remote:');
  missing.forEach((t) => console.error(`  - ${t}`));
  console.error('');
  console.error('→ forward-only hotfix migration으로 복구하세요.');
  process.exit(2);
}

console.log(`[check-schema-drift] ${EXPECTED_TABLES.length} expected tables all present on remote.`);
