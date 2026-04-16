#!/usr/bin/env node
/**
 * 문서 알림 검증용 임시 페르소나 시드 스크립트 (staging 전용).
 *
 * 목적: cdc29bc (notifyDocumentStakeholders) 이후 도입된 문서 생성 → 이해당사자
 * 알림 경로를 검증관이 실환경에서 재현할 수 있도록, 필요한 페르소나·조직·사건을
 * 한 번에 시딩한다. 멱등하므로 재실행 시 기존 row는 UPDATE만 수행.
 *
 * 실행:
 *   VERIFICATION_SEED=1 \
 *   NEXT_PUBLIC_SUPABASE_URL=<staging> \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging_service_role> \
 *   VERIFICATION_SEED_PASSWORD=<16자 이상> \
 *   node scripts/seed-verification-personas.mjs
 *
 * production 실수 차단:
 *   - VERIFICATION_SEED=1 env가 없으면 abort
 *   - SUPABASE_URL에 'prod' 문자열이 들어있으면 abort (heuristic)
 *
 * 출력: credentials JSON을 stdout에 출력 — 검증관에게 전달.
 *
 * 구조 (CURRENT_CONTEXT §5 참조):
 *   - Org1 (law_firm, "검증용 법무법인") + Org2 (collection_company, 격리용)
 *   - 6 profiles:
 *       Staff A — Org1 org_manager, 사건 handler, 문서 등록자(actor)
 *       Staff B — Org1 org_manager, handler 아님. DOCUMENT_CREATED 수신 기대
 *       Staff C — Org1 org_staff, 사건 handler. DOCUMENT_CREATED 수신 기대
 *       Client D — 포털 활성 의뢰인. client_visible 문서 시 수신 기대
 *       Client E — 포털 비활성 의뢰인. 절대 수신 금지 (negative)
 *       Staff F — Org2 org_manager, Org1 사건 무관. 절대 수신 금지 (isolation)
 *   - 1 case (Org1 소유) + case_organizations(managing_org=Org1)
 *   - 2 case_handlers (A, C) + 2 case_clients (D portal-on, E portal-off)
 *
 * 페르소나 UUID는 auth.admin.createUser 결과로부터 받아오고,
 * 조직/사건 UUID는 아래 상수 고정 (재실행 시 같은 row를 가리키게 함).
 */
import { createClient } from '@supabase/supabase-js';

const SEED_FLAG = process.env.VERIFICATION_SEED;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.VERIFICATION_SEED_PASSWORD;

if (SEED_FLAG !== '1') {
  console.error('[seed-verification-personas] VERIFICATION_SEED=1 env required (prod safety).');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[seed-verification-personas] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}
if (/prod/i.test(SUPABASE_URL)) {
  console.error(`[seed-verification-personas] URL looks like production (${SUPABASE_URL}). Abort.`);
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 16) {
  console.error('[seed-verification-personas] VERIFICATION_SEED_PASSWORD required (>=16 chars).');
  process.exit(1);
}

const ORG1_ID = 'aaaaaaaa-1111-4111-8111-000000000001';
const ORG2_ID = 'aaaaaaaa-1111-4111-8111-000000000002';
const CASE_ID = 'aaaaaaaa-2222-4222-8222-000000000001';

const PERSONAS = [
  {
    key: 'staff_a_actor',
    email: 'verify+staff-a@veinspiral.test',
    fullName: '검증용 직원 A (Actor·Manager)',
    isClient: false,
    org: ORG1_ID,
    role: 'org_manager',
    scope: 'all_org_cases',
    handlerRole: 'manager', // 사건 담당자로 등록 (handler_name과 별개)
  },
  {
    key: 'staff_b_manager',
    email: 'verify+staff-b@veinspiral.test',
    fullName: '검증용 직원 B (다른 Manager)',
    isClient: false,
    org: ORG1_ID,
    role: 'org_manager',
    scope: 'all_org_cases',
    handlerRole: null, // handler 아님
  },
  {
    key: 'staff_c_handler',
    email: 'verify+staff-c@veinspiral.test',
    fullName: '검증용 직원 C (Staff Handler)',
    isClient: false,
    org: ORG1_ID,
    role: 'org_staff',
    scope: 'assigned_cases_only',
    handlerRole: 'assistant',
  },
  {
    key: 'client_d_portal_on',
    email: 'verify+client-d@veinspiral.test',
    fullName: '검증용 의뢰인 D (Portal On)',
    isClient: true,
    org: null,
    role: null,
    scope: null,
    portalEnabled: true,
  },
  {
    key: 'client_e_portal_off',
    email: 'verify+client-e@veinspiral.test',
    fullName: '검증용 의뢰인 E (Portal Off, negative)',
    isClient: true,
    org: null,
    role: null,
    scope: null,
    portalEnabled: false,
  },
  {
    key: 'staff_f_other_org',
    email: 'verify+staff-f@veinspiral.test',
    fullName: '검증용 직원 F (다른 조직, isolation)',
    isClient: false,
    org: ORG2_ID,
    role: 'org_manager',
    scope: 'all_org_cases',
    handlerRole: null,
  },
];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertOrganization(id, slug, name, kind) {
  const { error } = await admin.from('organizations').upsert(
    { id, slug, name, kind, lifecycle_status: 'active' },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`org upsert(${name}) failed: ${error.message}`);
}

async function findOrCreateAuthUser(email, fullName, isClient) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);
  const existing = list.users.find((u) => u.email === email);
  let id;
  if (existing) {
    id = existing.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, signup_method: 'verification_seed' },
    });
    if (createError || !created?.user) {
      throw new Error(`createUser(${email}) failed: ${createError?.message ?? 'unknown'}`);
    }
    id = created.user.id;
  }
  const nowIso = new Date().toISOString();
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id,
      email,
      full_name: fullName,
      legal_name: fullName,
      legal_name_confirmed_at: nowIso,
      is_client_account: isClient,
      client_account_status: isClient ? 'active' : 'pending_initial_approval',
      is_active: true,
    },
    { onConflict: 'id' },
  );
  if (profileError) throw new Error(`profile upsert(${email}) failed: ${profileError.message}`);
  return id;
}

async function upsertMembership(profileId, orgId, role, scope) {
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

async function upsertCase(caseId, organizationId) {
  const { error } = await admin.from('cases').upsert(
    {
      id: caseId,
      organization_id: organizationId,
      reference_no: 'VERIFY-DOC-NOTIF-001',
      title: '검증용 사건 · 문서 알림 시나리오',
      case_type: 'advisory',
      case_status: 'intake',
      lifecycle_status: 'active',
      stage_key: 'intake',
      opened_on: new Date().toISOString().slice(0, 10),
      summary: '문서 등록 시 알림 전파를 검증하기 위한 사건. 실제 업무 데이터 없음.',
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`case upsert failed: ${error.message}`);
}

async function upsertCaseOrganization(caseId, organizationId) {
  // unique (case_id, organization_id, role) — role=managing_org로 고정
  // enum 값은 supabase/migrations/20260410000002_enums.sql 기준:
  //   case_access_scope: full | collection_only | legal_only | billing_only | read_only
  //   case_billing_scope: none | direct_client_billing | upstream_settlement | internal_settlement_only
  //   case_communication_scope: internal_only | cross_org_only | client_visible
  const { error } = await admin.from('case_organizations').upsert(
    {
      case_id: caseId,
      organization_id: organizationId,
      role: 'managing_org',
      status: 'active',
      access_scope: 'full',
      billing_scope: 'direct_client_billing',
      communication_scope: 'client_visible',
      is_lead: true,
    },
    { onConflict: 'case_id,organization_id,role' },
  );
  if (error) throw new Error(`case_organization upsert failed: ${error.message}`);
}

async function upsertCaseHandler(caseId, organizationId, profileId, handlerName, role) {
  const { error } = await admin.from('case_handlers').upsert(
    {
      case_id: caseId,
      organization_id: organizationId,
      profile_id: profileId,
      handler_name: handlerName,
      role,
    },
    { onConflict: 'case_id,profile_id,role' },
  );
  if (error) throw new Error(`case_handler upsert(${handlerName}) failed: ${error.message}`);
}

async function upsertCaseClient(caseId, organizationId, profileId, clientName, email, portalEnabled) {
  // case_clients에 (case_id, profile_id) 조합으로 검색 후 upsert — unique 제약이 없어
  // 수동으로 조회 → insert/update.
  // case_clients에 lifecycle_status 컬럼은 없다. link_status로만 활성/비활성을 구분.
  const { data: existing } = await admin
    .from('case_clients')
    .select('id')
    .eq('case_id', caseId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existing) {
    const { error } = await admin
      .from('case_clients')
      .update({
        organization_id: organizationId,
        client_name: clientName,
        client_email_snapshot: email,
        is_portal_enabled: portalEnabled,
        link_status: 'linked',
      })
      .eq('id', existing.id);
    if (error) throw new Error(`case_client update(${clientName}) failed: ${error.message}`);
    return;
  }
  const { error } = await admin.from('case_clients').insert({
    organization_id: organizationId,
    case_id: caseId,
    profile_id: profileId,
    client_name: clientName,
    client_email_snapshot: email,
    is_portal_enabled: portalEnabled,
    link_status: 'linked',
  });
  if (error) throw new Error(`case_client insert(${clientName}) failed: ${error.message}`);
}

async function main() {
  console.error('[seed-verification-personas] 시드 시작.');

  await upsertOrganization(ORG1_ID, 'verify-org-law-firm', '검증용 법무법인 (Org1)', 'law_firm');
  await upsertOrganization(ORG2_ID, 'verify-org-collector', '검증용 추심사 (Org2, isolation)', 'collection_company');
  console.error('[seed-verification-personas] 조직 2개 시딩 완료.');

  const results = {};
  for (const persona of PERSONAS) {
    const profileId = await findOrCreateAuthUser(persona.email, persona.fullName, persona.isClient);
    await upsertMembership(profileId, persona.org, persona.role, persona.scope);
    results[persona.key] = { profileId, email: persona.email, fullName: persona.fullName };
  }
  console.error('[seed-verification-personas] 페르소나 6개 시딩 완료.');

  await upsertCase(CASE_ID, ORG1_ID);
  await upsertCaseOrganization(CASE_ID, ORG1_ID);
  console.error('[seed-verification-personas] 사건 1건 + case_organizations 시딩 완료.');

  for (const persona of PERSONAS) {
    if (!persona.handlerRole) continue;
    await upsertCaseHandler(
      CASE_ID,
      ORG1_ID,
      results[persona.key].profileId,
      persona.fullName,
      persona.handlerRole,
    );
  }

  for (const persona of PERSONAS) {
    if (!persona.isClient) continue;
    await upsertCaseClient(
      CASE_ID,
      ORG1_ID,
      results[persona.key].profileId,
      persona.fullName,
      persona.email,
      Boolean(persona.portalEnabled),
    );
  }
  console.error('[seed-verification-personas] handler/client 링크 시딩 완료.');

  const summary = {
    staging_url: SUPABASE_URL,
    password: PASSWORD,
    organization: { id: ORG1_ID, name: '검증용 법무법인 (Org1)' },
    isolation_organization: { id: ORG2_ID, name: '검증용 추심사 (Org2)' },
    case: { id: CASE_ID, title: '검증용 사건 · 문서 알림 시나리오' },
    personas: results,
  };

  // stdout: 구조화된 JSON (검증관에게 전달).
  // stderr: 진행 로그 (위에서 사용).
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error('[seed-verification-personas] 실패:', err.message ?? err);
  process.exit(1);
});
