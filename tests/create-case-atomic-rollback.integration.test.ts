/**
 * create_case_atomic DB-backed rollback 통합 테스트.
 *
 * 지시서 DIRECTIVE_RESOLVE_CHAOS.md 4.6 — mock-only 금지.
 *
 * 검증 대상:
 *   "RPC 실행 중 어느 단계에서 실패하든 cases / case_handlers / case_organizations
 *    / case_clients 네 테이블에 잔존 row가 0인가?"
 *
 * 기법:
 *   - 유효한 (cases insert까지 성공) + 부적합 (case_handlers insert에서 FK 위반)
 *     파라미터 조합을 구성해 RPC를 호출한다.
 *   - 구체적으로, p_actor_id에 profiles에 존재하지 않는 UUID를 전달해
 *     case_handlers(profile_id) FK 위반을 유도한다. 이 FK는 ON DELETE SET NULL
 *     이라 실제로는 NOT NULL이 아니지만, 참조 무결성은 INSERT 시점에 확인된다.
 *   - Postgres 함수는 단일 트랜잭션으로 실행되므로 중간 실패 시 앞선 INSERT도
 *     롤백돼야 한다.
 *
 * 요구 env:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_TEST_ORG_ID (실존 org UUID — 테스트 시드에서 제공)
 *
 * env 미설정 시 skip — 로컬에서 무해.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_ORG_ID = process.env.SUPABASE_TEST_ORG_ID;

const hasEnv = Boolean(SUPABASE_URL && SERVICE_ROLE && TEST_ORG_ID);

describe.skipIf(!hasEnv)('create_case_atomic — DB-backed rollback', () => {
  const admin = hasEnv
    ? createClient(SUPABASE_URL!, SERVICE_ROLE!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  // 각 테스트마다 고유 reference_no로 격리
  const referenceNo = `TEST-ROLLBACK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const bogusActorId = '00000000-0000-0000-0000-000000000000'; // profiles에 존재하지 않는 UUID

  async function countReferences(): Promise<{
    cases: number;
    handlers: number;
    organizations: number;
    clients: number;
  }> {
    if (!admin) return { cases: 0, handlers: 0, organizations: 0, clients: 0 };
    const { data: cases } = await admin
      .from('cases')
      .select('id')
      .eq('organization_id', TEST_ORG_ID!)
      .eq('reference_no', referenceNo);
    const caseIds = (cases ?? []).map((c) => c.id);
    const byCase = caseIds.length ? caseIds : ['00000000-0000-0000-0000-000000000000'];
    const [{ data: h }, { data: o }, { data: cl }] = await Promise.all([
      admin.from('case_handlers').select('id').in('case_id', byCase),
      admin.from('case_organizations').select('id').in('case_id', byCase),
      admin.from('case_clients').select('id').in('case_id', byCase),
    ]);
    return {
      cases: cases?.length ?? 0,
      handlers: h?.length ?? 0,
      organizations: o?.length ?? 0,
      clients: cl?.length ?? 0,
    };
  }

  beforeAll(async () => {
    const before = await countReferences();
    // 사전 상태: 테스트 reference_no로 아무것도 없어야 함
    expect(before).toEqual({ cases: 0, handlers: 0, organizations: 0, clients: 0 });
  });

  afterAll(async () => {
    // 혹시 남아 있다면 정리 (정상 경로에서는 이 코드가 필요 없음)
    if (!admin) return;
    await admin
      .from('cases')
      .delete()
      .eq('organization_id', TEST_ORG_ID!)
      .eq('reference_no', referenceNo);
  });

  it('FK 위반으로 중간 실패 시 네 테이블 모두 잔존 row가 0이어야 한다', async () => {
    if (!admin) return;

    const { error } = await admin.rpc('create_case_atomic', {
      p_organization_id: TEST_ORG_ID!,
      p_reference_no: referenceNo,
      p_title: 'rollback-test',
      p_case_type: 'civil',
      p_stage_template_key: 'general-default',
      p_stage_key: 'intake',
      p_module_flags: { billing: true },
      p_principal_amount: 0,
      p_opened_on: new Date().toISOString().slice(0, 10),
      p_court_name: null,
      p_case_number: null,
      p_summary: null,
      p_actor_id: bogusActorId, // profiles에 없는 UUID → case_handlers FK 위반 유도
      p_actor_name: 'rollback-test',
      p_can_manage_collection: false,
      p_insolvency_subtype: null,
      p_client_name: 'rollback-test-client',
      p_client_role: '의뢰인',
    });

    // 실패가 반드시 발생해야 한다
    expect(error).toBeTruthy();

    // 실패 후 네 테이블 모두 잔존 0 검증 — "부분 커밋"이 일어나지 않음
    const after = await countReferences();
    expect(after).toEqual({ cases: 0, handlers: 0, organizations: 0, clients: 0 });
  });

  it('성공 경로는 네 테이블에 정확히 1건씩(cases 1, handlers 1, organizations 1, clients 1) 기록한다 (통제 케이스)', async () => {
    if (!admin) return;

    // 성공 경로 확인을 위해 실제 존재하는 actor UUID가 필요 — 시드에서 제공
    const SEEDED_ACTOR_ID = process.env.SUPABASE_TEST_ACTOR_ID;
    if (!SEEDED_ACTOR_ID) {
      // 시드가 없으면 이 케이스는 skip하되, 롤백 검증은 이미 위 테스트가 커버.
      return;
    }

    const successRef = `TEST-SUCCESS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: newCaseId, error } = await admin.rpc('create_case_atomic', {
      p_organization_id: TEST_ORG_ID!,
      p_reference_no: successRef,
      p_title: 'rollback-test-success',
      p_case_type: 'civil',
      p_stage_template_key: 'general-default',
      p_stage_key: 'intake',
      p_module_flags: { billing: true },
      p_principal_amount: 0,
      p_opened_on: new Date().toISOString().slice(0, 10),
      p_court_name: null,
      p_case_number: null,
      p_summary: null,
      p_actor_id: SEEDED_ACTOR_ID,
      p_actor_name: 'rollback-test-success',
      p_can_manage_collection: false,
      p_insolvency_subtype: null,
      p_client_name: 'success-client',
      p_client_role: '의뢰인',
    });

    expect(error).toBeNull();
    expect(newCaseId).toBeTruthy();

    const [{ data: cs }, { data: hs }, { data: os }, { data: cls }] = await Promise.all([
      admin.from('cases').select('id').eq('id', newCaseId as string),
      admin.from('case_handlers').select('id').eq('case_id', newCaseId as string),
      admin.from('case_organizations').select('id').eq('case_id', newCaseId as string),
      admin.from('case_clients').select('id').eq('case_id', newCaseId as string),
    ]);
    expect(cs?.length).toBe(1);
    expect(hs?.length).toBe(1);
    expect(os?.length).toBe(1);
    expect(cls?.length).toBe(1);

    // 정리
    await admin.from('cases').delete().eq('id', newCaseId as string);
  });
});
