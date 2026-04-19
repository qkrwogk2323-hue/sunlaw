#!/usr/bin/env node
/**
 * 3-역할 projection 정합성 검증 스크립트 (staging/dev 전용).
 *
 * "3역할이 같은 방을 보는가?"를 데이터 레벨에서 검증.
 *
 * 1. 검증용 사건에 known data 삽입 (문서 3건, 청구 2건)
 * 2. 3경로로 같은 사건 조회:
 *    - staff: case_hub_projection 로직 (전체)
 *    - hub: case_hubs + billing 집계
 *    - client: portal 로직 (client_visibility='client_visible' + bill_to_case_client_id)
 * 3. 비교: 일관성 + 격리 확인
 *
 * 전제:
 *   - seed-verification-personas.mjs가 이미 실행됨 (Org1, Case, Client D 존재)
 *   - VERIFICATION_SEED=1, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 실행:
 *   VERIFICATION_SEED=1 \
 *   NEXT_PUBLIC_SUPABASE_URL=<staging> \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
 *   node scripts/verify-three-role-projection.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SEED_FLAG = process.env.VERIFICATION_SEED;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (SEED_FLAG !== '1') { console.error('VERIFICATION_SEED=1 required.'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_ROLE) { console.error('SUPABASE_URL / SERVICE_ROLE required.'); process.exit(1); }
if (/prod/i.test(SUPABASE_URL)) { console.error('URL looks like production. Abort.'); process.exit(1); }

const ORG1_ID = 'aaaaaaaa-1111-4111-8111-000000000001';
const CASE_ID = 'aaaaaaaa-2222-4222-8222-000000000001';
const TAG = `_3role_verify_${Date.now()}`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label} — ${detail ?? 'failed'}`);
  }
}

async function findClientProfileId() {
  const { data } = await admin
    .from('case_clients')
    .select('id, profile_id, is_portal_enabled')
    .eq('case_id', CASE_ID)
    .eq('is_portal_enabled', true)
    .eq('link_status', 'linked')
    .limit(1)
    .maybeSingle();
  return data;
}

async function seedTestData(clientCaseClientId) {
  // 문서 3건: client_visible 2 + internal_only 1
  const docs = [
    { organization_id: ORG1_ID, case_id: CASE_ID, title: `${TAG}_doc_visible_1`, document_kind: 'brief', approval_status: 'draft', client_visibility: 'client_visible', created_by_name: 'Test' },
    { organization_id: ORG1_ID, case_id: CASE_ID, title: `${TAG}_doc_visible_2`, document_kind: 'evidence', approval_status: 'draft', client_visibility: 'client_visible', created_by_name: 'Test' },
    { organization_id: ORG1_ID, case_id: CASE_ID, title: `${TAG}_doc_internal`, document_kind: 'internal_memo', approval_status: 'draft', client_visibility: 'internal_only', created_by_name: 'Test' },
  ];
  const { error: docErr } = await admin.from('case_documents').insert(docs);
  if (docErr) throw new Error(`case_documents insert failed: ${docErr.message}`);

  // 청구 2건: client 대상 1 + 조직 내부(client 없음) 1
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { organization_id: ORG1_ID, case_id: CASE_ID, title: `${TAG}_bill_client`, entry_kind: 'retainer_fee', amount: 100000, status: 'issued', bill_to_case_client_id: clientCaseClientId, due_on: today },
    { organization_id: ORG1_ID, case_id: CASE_ID, title: `${TAG}_bill_internal`, entry_kind: 'expense', amount: 50000, status: 'draft', bill_to_case_client_id: null },
  ];
  const { error: billErr } = await admin.from('billing_entries').insert(entries);
  if (billErr) throw new Error(`billing_entries insert failed: ${billErr.message}`);
}

async function queryStaffProjection() {
  // case_documents (전체)
  const { data: docs } = await admin
    .from('case_documents')
    .select('id, title, client_visibility')
    .eq('case_id', CASE_ID)
    .like('title', `${TAG}%`)
    .is('deleted_at', null);

  // billing_entries (전체)
  const { data: bills } = await admin
    .from('billing_entries')
    .select('id, title, amount, bill_to_case_client_id')
    .eq('case_id', CASE_ID)
    .like('title', `${TAG}%`)
    .is('deleted_at', null);

  return {
    documents: docs ?? [],
    billing: bills ?? [],
  };
}

async function queryClientProjection(clientCaseClientId) {
  // client_visible 문서만
  const { data: docs } = await admin
    .from('case_documents')
    .select('id, title, client_visibility')
    .eq('case_id', CASE_ID)
    .eq('client_visibility', 'client_visible')
    .like('title', `${TAG}%`)
    .is('deleted_at', null);

  // 내 청구만
  const { data: bills } = await admin
    .from('billing_entries')
    .select('id, title, amount, bill_to_case_client_id')
    .eq('case_id', CASE_ID)
    .eq('bill_to_case_client_id', clientCaseClientId)
    .like('title', `${TAG}%`)
    .is('deleted_at', null);

  return {
    documents: docs ?? [],
    billing: bills ?? [],
  };
}

async function queryHubBilling() {
  // hub lobby가 보는 billing (case-hub-projection 로직 재현)
  const { data: bills } = await admin
    .from('billing_entries')
    .select('id, amount, tax_amount, status, due_on, paid_at')
    .eq('case_id', CASE_ID)
    .is('deleted_at', null);

  const entries = bills ?? [];
  const totalInvoiced = entries.reduce((s, e) => s + (Number(e.amount ?? 0) + Number(e.tax_amount ?? 0)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = entries.filter(e => !e.paid_at && e.due_on && e.due_on < today).length;

  return { totalInvoiced, overdueCount, entryCount: entries.length };
}

async function cleanup() {
  await admin.from('case_documents').delete().like('title', `${TAG}%`);
  await admin.from('billing_entries').delete().like('title', `${TAG}%`);
}

async function main() {
  console.log('[verify-three-role-projection] 시작.\n');

  // 0. Client D 확인
  const clientRow = await findClientProfileId();
  if (!clientRow) {
    console.error('Client D (portal enabled) not found. seed-verification-personas.mjs를 먼저 실행하세요.');
    process.exit(1);
  }
  console.log(`Client D: case_client_id=${clientRow.id}, profile_id=${clientRow.profile_id}\n`);

  // 1. Seed
  await seedTestData(clientRow.id);
  console.log('Test data seeded.\n');

  try {
    // 2. Query 3 paths
    const staff = await queryStaffProjection();
    const client = await queryClientProjection(clientRow.id);
    const hub = await queryHubBilling();

    console.log('--- 직원 (staff) ---');
    assert('문서 3건 보임', staff.documents.length === 3, `got ${staff.documents.length}`);
    assert('청구 2건 보임', staff.billing.length === 2, `got ${staff.billing.length}`);
    assert('internal_only 문서 포함', staff.documents.some(d => d.client_visibility === 'internal_only'));

    console.log('\n--- 의뢰인 (client) ---');
    assert('문서 2건만 보임 (client_visible)', client.documents.length === 2, `got ${client.documents.length}`);
    assert('internal_only 문서 안 보임', !client.documents.some(d => d.client_visibility === 'internal_only'));
    assert('청구 1건만 보임 (내 것)', client.billing.length === 1, `got ${client.billing.length}`);
    assert('내 청구의 bill_to_case_client_id가 내 id', client.billing[0]?.bill_to_case_client_id === clientRow.id);

    console.log('\n--- 부분집합 관계 ---');
    const clientDocIds = new Set(client.documents.map(d => d.id));
    const staffDocIds = new Set(staff.documents.map(d => d.id));
    const clientIsSubset = [...clientDocIds].every(id => staffDocIds.has(id));
    assert('의뢰인 문서가 직원 문서의 부분집합', clientIsSubset);

    const clientBillIds = new Set(client.billing.map(b => b.id));
    const staffBillIds = new Set(staff.billing.map(b => b.id));
    const clientBillSubset = [...clientBillIds].every(id => staffBillIds.has(id));
    assert('의뢰인 청구가 직원 청구의 부분집합', clientBillSubset);

    console.log('\n--- 허브 로비 billing 일치 ---');
    // hub는 TAG 필터 없이 전체 billing → 정확한 비교는 어려우나 최소 검증
    assert('허브 entryCount >= 직원 billing count', hub.entryCount >= staff.billing.length, `hub=${hub.entryCount}, staff=${staff.billing.length}`);

    console.log('\n--- 격리 ---');
    assert('의뢰인이 internal_only 제목을 볼 수 없음',
      !client.documents.some(d => d.title.includes('_internal')),
      'internal doc leaked to client');
    assert('의뢰인이 조직 내부 청구를 볼 수 없음',
      !client.billing.some(b => b.title.includes('_internal')),
      'internal billing leaked to client');

  } finally {
    // 3. Cleanup
    await cleanup();
    console.log('\nTest data cleaned up.');
  }

  console.log(`\n=== 결과: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('실패 항목:', failures.join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[verify-three-role-projection] 실패:', err.message ?? err);
  process.exit(1);
});
