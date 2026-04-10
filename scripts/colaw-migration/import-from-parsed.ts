/**
 * audit/colaw_parsed/rehab/{1..90}.json → DB import (PR#3 + PR#4)
 *
 * 기존 migrate-colaw-to-vs.ts(791줄, puppeteer)는 COLAW 세션 의존 + 필드 누락 多.
 * 이 스크립트는 검증관이 받아둔 raw HTML을 파싱한 정규화 JSON을 단일 진실원본으로
 * 사용하여 DB에 적재한다. puppeteer 불필요. 재실행 가능.
 *
 * 신규 매핑 (기존 코드 미구현):
 *   - classify 4종 (자연인/법인/국가/지방자치단체) — migration 0096 필요
 *   - has_priority_repay (우선변제)
 *   - is_unsettled (미확정채권)
 *   - is_annuity_debt (연금법채무)
 *   - apply_restructuring (주담대 채무재조정)
 *   - is_secured (별제권 = has_separation_right)
 *   - guarantor_amount (보증인 카운트만 — 상세는 modal)
 *   - cases.colaw_case_basic_seq (PR#4) — 동명이인 매칭용
 *   - applications.court_name (콜로 원본 그대로, 인천 fallback 제거)
 *   - applications.case_number (콜로 원본 그대로)
 *
 * 모드:
 *   DRY_RUN=1 : payload만 출력, DB write 없음
 *   MODE=insert : 신규 사건 생성 (기존 같은 colaw_case_basic_seq 있으면 skip)
 *   MODE=update : colaw_case_basic_seq 매칭 시 채권자/applications만 갱신
 *
 * 실행:
 *   DRY_RUN=1 npx tsx scripts/colaw-migration/import-from-parsed.ts
 *   MODE=insert ORG_ID=... CREATED_BY=... npx tsx ...
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ORGANIZATION_ID = process.env.ORG_ID || '';
const CREATED_BY = process.env.CREATED_BY || '';
const DRY_RUN = process.env.DRY_RUN === '1';
const MODE = (process.env.MODE || 'dry') as 'dry' | 'insert' | 'update';

if (!DRY_RUN && (!ORGANIZATION_ID || !CREATED_BY)) {
  console.error('실제 실행은 ORG_ID, CREATED_BY 환경변수가 필요합니다. DRY_RUN=1 로 시작하세요.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROOT = path.resolve(__dirname, '../..');
const PARSED_DIR = path.join(ROOT, 'audit/colaw_parsed/rehab');

// ─── 인격구분 매핑 ───────────────────────────────────────────────
function mapClassify(c: string): '자연인' | '법인' | '국가' | '지방자치단체' {
  if (c === '법인') return '법인';
  if (c === '국가') return '국가';
  if (c === '지방자치단체') return '지방자치단체';
  return '자연인'; // default
}

// ─── 1건 import ──────────────────────────────────────────────────
async function importCase(parsed: any) {
  const app = parsed.application || {};
  const cd = parsed.creditorData || { creditors: [], summary: {} };
  const inc = parsed.income || {};
  const colawSeq = app.case_basic_seq || '';

  // PR#4: colaw_case_basic_seq로 기존 사건 검색 → fallback 이름 매칭
  let existing: any = null;
  if (colawSeq) {
    const { data } = await sb
      .from('cases')
      .select('id, lifecycle_status')
      .eq('colaw_case_basic_seq', colawSeq)
      .neq('lifecycle_status', 'soft_deleted')
      .maybeSingle();
    existing = data;
  }
  // fallback: 이름 매칭 (colaw_case_basic_seq 미설정 시)
  if (!existing && app.applicant_name) {
    const { data: candidates } = await sb
      .from('cases')
      .select('id, title, lifecycle_status, colaw_case_basic_seq')
      .eq('case_type', 'insolvency')
      .neq('lifecycle_status', 'soft_deleted')
      .ilike('title', `${app.applicant_name}%`);
    // 동명이인: colaw_case_basic_seq 비어있는 것만 매칭
    const unlinked = (candidates || []).filter(c => !c.colaw_case_basic_seq);
    if (unlinked.length === 1) {
      existing = unlinked[0];
    } else if (unlinked.length > 1) {
      // 동명이인 중 첫 미매칭 사용
      existing = unlinked[0];
      console.log(`  ⚠ 동명이인 ${unlinked.length}건 — 첫 미매칭 사용`);
    }
  }

  let caseId: string | null = existing?.id || null;

  // payload 생성
  const casePayload = {
    organization_id: ORGANIZATION_ID,
    title: `${app.applicant_name} 개인회생`,
    case_type: 'insolvency',
    insolvency_subtype: 'individual_rehabilitation',
    case_status: 'intake',
    lifecycle_status: 'active',
    stage_template_key: 'general-default',
    stage_key: 'intake',
    module_flags: { billing: true, insolvency: true },
    // PR#2: 콜로 원본 그대로 (fallback 제거)
    court_name: app.court_name || null,
    case_number: app.case_number || null,
    summary: `colaw cb=${colawSeq} ${app.applicant_name}`,
    // PR#4: 동명이인 매칭용 식별자
    colaw_case_basic_seq: colawSeq,
    created_by: CREATED_BY,
    updated_by: CREATED_BY,
  };

  if (DRY_RUN) {
    console.log(`[DRY] case payload:`, JSON.stringify({
      title: casePayload.title,
      court_name: casePayload.court_name,
      case_number: casePayload.case_number,
      colaw_case_basic_seq: casePayload.colaw_case_basic_seq,
      existing: !!existing,
    }));
  } else if (MODE === 'insert' && !existing) {
    const { data, error } = await sb.from('cases').insert(casePayload).select('id').single();
    if (error) { console.error(`  cases insert:`, error.message); return null; }
    caseId = data.id;
  } else if (MODE === 'update' && existing) {
    await sb.from('cases').update({
      court_name: casePayload.court_name,
      case_number: casePayload.case_number,
      colaw_case_basic_seq: colawSeq || null,
    }).eq('id', existing.id);
    caseId = existing.id;
  }

  if (!caseId && !DRY_RUN) return null;

  // 채권자 — 4종 인격구분 + 4 플래그 + 카운트
  const creditorRows = cd.creditors.map((c: any, i: number) => ({
    case_id: caseId!,
    organization_id: ORGANIZATION_ID,
    bond_number: parseInt(c.bond_number, 10) || (i + 1),
    classify: mapClassify(c.classify),
    creditor_name: c.creditor_name || '',
    branch_name: c.branch_name || null,
    postal_code: c.postal_code || null,
    address: c.address || null,
    phone: c.phone || null,
    fax: c.fax || null,
    bond_cause: c.bond_cause || null,
    capital: c.capital || 0,
    capital_compute: c.capital_compute || null,
    interest: c.interest || 0,
    interest_compute: c.interest_compute || null,
    bond_content: c.bond_content || null,
    delay_rate: parseFloat(c.delay_rate) || 0,
    // 4 플래그 (PR#3)
    has_priority_repay: !!c.first_repayment,
    is_unsettled: !!c.unsettlement_bond,
    is_annuity_debt: !!c.kind_annuity_debt,
    apply_restructuring: !!c.apply_debt_restructuring,
    // 별제권: is_secured=true는 secured_property_id FK가 필수 (0088 check 제약).
    // secured_property_id는 modal 데이터 미수집 → 별도 PR에서 처리.
    // is_secured: false로 유지, has_separation_right 정보는 guarantor_text에 메모.
    is_secured: false,
    // 카운트는 attachments int[] 또는 별도 컬럼 (스키마는 attachments int[])
    // 여기선 부속서류 존재 표시만 (상세는 modal — 검증관 워크스루 후 추가)
    attachments: c.attached_count > 0 ? [1] : [],
    // 보증인 카운트 + 별제권 메모 (상세는 modal — 별도 PR)
    guarantor_text: [
      c.guarantor_count > 0 ? `보증인 ${c.guarantor_count}명` : '',
      c.has_separation_right ? `별제권 있음 (secured_property 미연결)` : '',
    ].filter(Boolean).join('; ') || null,
    // 미확정 카운트
    unsettled_text: c.unconfirmed_count > 0 ? `미확정 ${c.unconfirmed_count}건 (modal 데이터 미수집)` : null,
    sort_order: i,
  }));

  if (DRY_RUN) {
    console.log(`  채권자 ${creditorRows.length}건. 4 플래그 분포:`, {
      priority: creditorRows.filter((r: any) => r.has_priority_repay).length,
      unsettled: creditorRows.filter((r: any) => r.is_unsettled).length,
      annuity: creditorRows.filter((r: any) => r.is_annuity_debt).length,
      restructuring: creditorRows.filter((r: any) => r.apply_restructuring).length,
      secured: creditorRows.filter((r: any) => r.is_secured).length,
    });
    return { caseId: 'dry', creditors: creditorRows.length };
  }

  // 가드: raw 채권자 0건이면 기존 DB 채권자 덮어쓰기 금지 (미입력 사건)
  if (creditorRows.length === 0) {
    console.log(`  ⚠ raw 채권자 0건 — DB 채권자 보존 (미입력 사건)`);
    return { caseId, creditors: 0, skipped_creditors: true };
  }

  // 기존 채권자 soft delete 후 재삽입
  if (MODE === 'update' && existing) {
    await sb.from('rehabilitation_creditors')
      .update({ lifecycle_status: 'soft_deleted' })
      .eq('case_id', caseId);
  }
  const { error: cErr } = await sb.from('rehabilitation_creditors').insert(creditorRows);
  if (cErr) console.error(`  creditors insert:`, cErr.message);

  return { caseId, creditors: creditorRows.length };
}

// ─── main ────────────────────────────────────────────────────────
async function main() {
  console.log(`MODE=${MODE} DRY_RUN=${DRY_RUN}`);
  const files = fs.readdirSync(PARSED_DIR).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`📂 ${files.length}건 처리 시작\n`);

  const summary = { ok: 0, fail: 0, skipped: 0 };
  for (const f of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(PARSED_DIR, f), 'utf8'));
    const n = parsed.n;
    const name = parsed.application?.applicant_name || '?';
    process.stdout.write(`[${n}] ${name}: `);
    try {
      const r = await importCase(parsed);
      if (r) { console.log(`OK`); summary.ok++; }
      else { console.log(`SKIP`); summary.skipped++; }
    } catch (e: any) {
      console.log(`FAIL ${e.message}`);
      summary.fail++;
    }
  }
  console.log(`\n=== 완료: OK ${summary.ok} / SKIP ${summary.skipped} / FAIL ${summary.fail} ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
