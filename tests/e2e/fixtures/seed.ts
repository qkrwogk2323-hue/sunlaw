/**
 * Playwright fixture: 보안 경계 E2E 테스트용 사건 3종(general / rehab / bankruptcy)
 * 을 매 spec 실행마다 setup하고 teardown.
 *
 * 정적 시드(조직 + 사용자 5명)는 supabase/seeds/0002_e2e_test_data.sql +
 * scripts/seed-e2e-users.mjs로 사전 적용 가정.
 *
 * 환경변수:
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   E2E_SEED_USER_ASSIGNED_PROFILE_ID — 사건 담당자
 *   E2E_SEED_USER_CLIENT_PROFILE_ID   — 사건 의뢰인
 */
import { test as base } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ORG_A = '11111111-1111-4111-8111-aaaaaaaaaaa1';

export type SeedCases = {
  caseGeneralId: string;
  caseRehabId: string;
  caseBankruptcyId: string;
};

export type SeedFixtures = {
  seed: SeedCases;
  admin: SupabaseClient;
};

function makeAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required for E2E seed fixture.');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createCase(
  admin: SupabaseClient,
  args: {
    title: string;
    caseType: 'civil' | 'insolvency';
    insolvencySubtype: string | null;
    actorId: string;
    assignedId: string;
    clientName: string;
  },
): Promise<string> {
  const referenceNo = `E2E-${args.caseType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: caseId, error } = await admin.rpc('create_case_atomic', {
    p_organization_id: ORG_A,
    p_reference_no: referenceNo,
    p_title: args.title,
    p_case_type: args.caseType,
    p_stage_template_key: 'general-default',
    p_stage_key: 'intake',
    p_module_flags: { billing: true },
    p_principal_amount: 0,
    p_opened_on: new Date().toISOString().slice(0, 10),
    p_court_name: null,
    p_case_number: null,
    p_summary: '[E2E_SEED]',
    p_actor_id: args.actorId,
    p_actor_name: 'E2E Seed Actor',
    p_can_manage_collection: false,
    p_insolvency_subtype: args.insolvencySubtype,
    p_client_name: args.clientName,
    p_client_role: '의뢰인',
  });
  if (error || !caseId) {
    throw new Error(`create_case_atomic failed: ${error?.message ?? 'no id'}`);
  }
  // create_case_atomic은 호출자(p_actor_id)를 case_handlers로 등록하지만,
  // 보안 경계 검증을 위해 명시적으로 다른 assigned 사용자도 등록.
  if (args.assignedId !== args.actorId) {
    await admin.from('case_handlers').upsert(
      {
        organization_id: ORG_A,
        case_id: caseId as string,
        profile_id: args.assignedId,
        handler_name: 'E2E Assigned Handler',
        role: 'case_manager',
        created_by: args.actorId,
        updated_by: args.actorId,
      },
      { onConflict: 'case_id,profile_id,role' },
    );
  }
  return caseId as string;
}

export const test = base.extend<SeedFixtures>({
  admin: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(makeAdmin());
  },
  seed: async ({ admin }, use) => {
    const actorId = process.env.E2E_SEED_USER_MANAGER_PROFILE_ID;
    const assignedId = process.env.E2E_SEED_USER_ASSIGNED_PROFILE_ID;
    if (!actorId || !assignedId) {
      throw new Error(
        'E2E_SEED_USER_MANAGER_PROFILE_ID / E2E_SEED_USER_ASSIGNED_PROFILE_ID required.',
      );
    }
    const seed: SeedCases = {
      caseGeneralId: await createCase(admin, {
        title: '[E2E] 일반사건',
        caseType: 'civil',
        insolvencySubtype: null,
        actorId,
        assignedId,
        clientName: 'E2E 의뢰인',
      }),
      caseRehabId: await createCase(admin, {
        title: '[E2E] 회생사건',
        caseType: 'insolvency',
        insolvencySubtype: 'individual_rehabilitation',
        actorId,
        assignedId,
        clientName: 'E2E 의뢰인',
      }),
      caseBankruptcyId: await createCase(admin, {
        title: '[E2E] 파산사건',
        caseType: 'insolvency',
        insolvencySubtype: 'individual_bankruptcy',
        actorId,
        assignedId,
        clientName: 'E2E 의뢰인',
      }),
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(seed);
    // teardown — cases CASCADE
    await admin
      .from('cases')
      .delete()
      .in('id', [seed.caseGeneralId, seed.caseRehabId, seed.caseBankruptcyId]);
  },
});

export const expect = test.expect;
