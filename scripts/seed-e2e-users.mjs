#!/usr/bin/env node
/**
 * E2E 보안 경계 테스트용 사용자 5명을 생성하고 멤버십을 연결한다.
 *
 * 이 스크립트는 dev / staging only. production에 절대 실행 금지.
 *
 * 전제:
 *   - supabase/seeds/0002_e2e_test_data.sql 적용 완료 (조직 A, B 존재)
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 세팅
 *   - E2E_SEED_USER_PASSWORD (모든 테스트 사용자 공통 패스워드)
 *
 * 실행:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... E2E_SEED_USER_PASSWORD=... \
 *     node scripts/seed-e2e-users.mjs
 *
 * 출력: 생성된 5명의 profile_id를 콘솔에 출력. CI secret으로 등록할 것.
 *
 * 멱등: 같은 이메일이 이미 있으면 skip하고 기존 id 반환.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.E2E_SEED_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[seed-e2e-users] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 16) {
  console.error('[seed-e2e-users] E2E_SEED_USER_PASSWORD required (>=16 chars, random recommended).');
  process.exit(1);
}

const ORG_A = '11111111-1111-4111-8111-aaaaaaaaaaa1';
const ORG_B = '11111111-1111-4111-8111-bbbbbbbbbbb1';

const USERS = [
  {
    key: 'manager',
    email: 'e2e+a-manager@veinspiral.test',
    fullName: 'E2E 매니저 A',
    org: ORG_A,
    role: 'org_manager',
    scope: 'all_org_cases',
  },
  {
    key: 'assigned',
    email: 'e2e+a-assigned@veinspiral.test',
    fullName: 'E2E 배정 스태프 A',
    org: ORG_A,
    role: 'org_staff',
    scope: 'assigned_cases_only',
  },
  {
    key: 'unassigned',
    email: 'e2e+a-unassigned@veinspiral.test',
    fullName: 'E2E 비배정 스태프 A',
    org: ORG_A,
    role: 'org_staff',
    scope: 'assigned_cases_only',
  },
  {
    key: 'otherorg',
    email: 'e2e+b-member@veinspiral.test',
    fullName: 'E2E 매니저 B',
    org: ORG_B,
    role: 'org_manager',
    scope: 'all_org_cases',
  },
  {
    key: 'client',
    email: 'e2e+client@veinspiral.test',
    fullName: 'E2E 의뢰인',
    org: null,
    role: null,
    scope: null,
  },
];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOrCreateUser(email, fullName, isClient) {
  // 기존 사용자 조회 (auth admin은 listUsers + filter 패턴)
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, signup_method: 'e2e_seed' },
  });
  if (createError || !created.user) {
    throw new Error(`createUser(${email}) failed: ${createError?.message ?? 'unknown'}`);
  }

  // profiles upsert
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: created.user.id,
      email,
      full_name: fullName,
      legal_name: fullName,
      legal_name_confirmed_at: new Date().toISOString(),
      is_client_account: isClient,
      client_account_status: isClient ? 'active' : 'pending_initial_approval',
    },
    { onConflict: 'id' },
  );
  if (profileError) throw new Error(`profile upsert(${email}) failed: ${profileError.message}`);

  return created.user.id;
}

async function ensureMembership(profileId, orgId, role, scope) {
  if (!orgId) return;
  const { error } = await admin.from('organization_memberships').upsert(
    {
      organization_id: orgId,
      profile_id: profileId,
      role,
      status: 'active',
      case_scope_policy: scope,
    },
    { onConflict: 'organization_id,profile_id' },
  );
  if (error) throw new Error(`membership upsert failed: ${error.message}`);
}

const results = {};
for (const user of USERS) {
  const id = await findOrCreateUser(user.email, user.fullName, user.key === 'client');
  await ensureMembership(id, user.org, user.role, user.scope);
  results[user.key] = id;
}

console.log('[seed-e2e-users] 완료. CI secrets에 다음 값을 등록하세요:');
console.log('');
console.log(`  E2E_SEED_USER_MANAGER_PROFILE_ID=${results.manager}`);
console.log(`  E2E_SEED_USER_ASSIGNED_PROFILE_ID=${results.assigned}`);
console.log(`  E2E_SEED_USER_UNASSIGNED_PROFILE_ID=${results.unassigned}`);
console.log(`  E2E_SEED_USER_OTHERORG_PROFILE_ID=${results.otherorg}`);
console.log(`  E2E_SEED_USER_CLIENT_PROFILE_ID=${results.client}`);
console.log('');
console.log('  E2E_SEED_USER_MANAGER_EMAIL=e2e+a-manager@veinspiral.test');
console.log('  E2E_SEED_USER_ASSIGNED_EMAIL=e2e+a-assigned@veinspiral.test');
console.log('  E2E_SEED_USER_UNASSIGNED_EMAIL=e2e+a-unassigned@veinspiral.test');
console.log('  E2E_SEED_USER_OTHERORG_EMAIL=e2e+b-member@veinspiral.test');
console.log('  E2E_SEED_USER_CLIENT_EMAIL=e2e+client@veinspiral.test');
