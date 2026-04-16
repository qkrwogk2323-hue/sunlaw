#!/usr/bin/env node
/**
 * 문서 알림 검증용 페르소나 teardown 스크립트 (staging 전용).
 *
 * seed-verification-personas.mjs가 만든 사건·링크를 soft-delete로 정리한다.
 * auth.users와 profiles는 유지 — 다음 검증 라운드에서 재사용 가능.
 *
 * 실행:
 *   VERIFICATION_SEED=1 \
 *   NEXT_PUBLIC_SUPABASE_URL=<staging> \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
 *   node scripts/teardown-verification-personas.mjs
 *
 * 동작:
 *   - cases.lifecycle_status = 'soft_deleted'
 *   - case_clients.lifecycle_status = 'soft_deleted'
 *   - case_handlers 삭제 (링크 row는 보관 불필요)
 *   - case_organizations.status = 'ended'
 *   - organization_memberships.status = 'inactive' (검증용 조직 2개 소속만)
 *   - organizations: 유지 (다음 검증용)
 *   - 문서 생성 테스트로 쌓인 case_documents, notifications는 teardown 범위 밖
 *     (검증관이 시나리오 중간에 직접 삭제 or 시드된 사건 재사용)
 */
import { createClient } from '@supabase/supabase-js';

const SEED_FLAG = process.env.VERIFICATION_SEED;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (SEED_FLAG !== '1') {
  console.error('[teardown-verification-personas] VERIFICATION_SEED=1 env required (prod safety).');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[teardown-verification-personas] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}
if (/prod/i.test(SUPABASE_URL)) {
  console.error(`[teardown-verification-personas] URL looks like production (${SUPABASE_URL}). Abort.`);
  process.exit(1);
}

const ORG1_ID = 'aaaaaaaa-1111-4111-8111-000000000001';
const ORG2_ID = 'aaaaaaaa-1111-4111-8111-000000000002';
const CASE_ID = 'aaaaaaaa-2222-4222-8222-000000000001';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function softDeleteCase() {
  const { error } = await admin
    .from('cases')
    .update({ lifecycle_status: 'soft_deleted', deleted_at: new Date().toISOString() })
    .eq('id', CASE_ID);
  if (error) throw new Error(`cases soft-delete failed: ${error.message}`);
}

async function softDeleteCaseClients() {
  // case_clients에는 lifecycle_status가 없다. link_status='unlinked' + is_portal_enabled=false로 비활성화.
  const { error } = await admin
    .from('case_clients')
    .update({ link_status: 'unlinked', is_portal_enabled: false, detached_at: new Date().toISOString() })
    .eq('case_id', CASE_ID);
  if (error) throw new Error(`case_clients unlink failed: ${error.message}`);
}

async function deleteCaseHandlers() {
  const { error } = await admin.from('case_handlers').delete().eq('case_id', CASE_ID);
  if (error) throw new Error(`case_handlers delete failed: ${error.message}`);
}

async function endCaseOrganizations() {
  const { error } = await admin
    .from('case_organizations')
    .update({ status: 'ended', ended_on: new Date().toISOString().slice(0, 10) })
    .eq('case_id', CASE_ID);
  if (error) throw new Error(`case_organizations end failed: ${error.message}`);
}

async function deactivateMemberships() {
  const { error } = await admin
    .from('organization_memberships')
    .update({ status: 'inactive' })
    .in('organization_id', [ORG1_ID, ORG2_ID]);
  if (error) throw new Error(`memberships deactivate failed: ${error.message}`);
}

async function main() {
  console.error('[teardown-verification-personas] teardown 시작.');
  await softDeleteCase();
  await softDeleteCaseClients();
  await deleteCaseHandlers();
  await endCaseOrganizations();
  await deactivateMemberships();
  console.error('[teardown-verification-personas] 완료. profiles/auth.users/조직은 유지됨.');
}

main().catch((err) => {
  console.error('[teardown-verification-personas] 실패:', err.message ?? err);
  process.exit(1);
});
