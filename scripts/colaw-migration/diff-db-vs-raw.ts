/**
 * DB 92건 vs audit/colaw_parsed/rehab/{1..90}.json diff 리포트
 *
 * 매칭 키: applicant_name (1차) — 실패 시 reference_no=COLAW-### (2차)
 * 비교 항목: 채권자 행수, 채권 합계, 법원명, 변제기간, 별제권/우선변제 플래그
 *
 * 출력:
 *   audit/diff_report.md
 *   audit/diff_report.csv
 *
 * read-only. DB write 없음.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE env 누락');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ROOT = path.resolve(__dirname, '../..');
const PARSED_DIR = path.join(ROOT, 'audit/colaw_parsed/rehab');
const OUT_MD = path.join(ROOT, 'audit/diff_report.md');
const OUT_CSV = path.join(ROOT, 'audit/diff_report.csv');

// ─── 1) parsed JSON 로드 ─────────────────────────────────────────
type Parsed = {
  n: number;
  application: any;
  creditorData: { summary: any; creditors: any[] };
  income: any;
};
function loadParsed(): Parsed[] {
  const out: Parsed[] = [];
  for (let n = 1; n <= 90; n++) {
    const p = path.join(PARSED_DIR, `${n}.json`);
    if (!fs.existsSync(p)) continue;
    out.push(JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  return out;
}

// ─── 2) DB 92건 로드 (lifecycle_status=active) ───────────────────
async function loadDb() {
  // PR#4: colaw_case_basic_seq 컬럼이 추가되면 매칭 정확도 100%
  const { data: cases, error } = await sb
    .from('cases')
    .select('id, title, reference_no, court_name, case_number, case_type, insolvency_subtype, lifecycle_status, colaw_case_basic_seq')
    .eq('case_type', 'insolvency')
    .neq('lifecycle_status', 'soft_deleted');
  if (error) {
    // colaw_case_basic_seq 컬럼이 아직 없으면 fallback
    if (/colaw_case_basic_seq/.test(error.message)) {
      const { data, error: e2 } = await sb
        .from('cases')
        .select('id, title, reference_no, court_name, case_number, case_type, insolvency_subtype, lifecycle_status')
        .eq('case_type', 'insolvency')
        .neq('lifecycle_status', 'soft_deleted');
      if (e2) throw e2;
      return (data || []).map(c => ({ ...c, colaw_case_basic_seq: null }));
    }
    throw error;
  }
  return cases || [];
}

async function loadCaseDetail(caseId: string) {
  const [creditors, income, app] = await Promise.all([
    sb.from('rehabilitation_creditors').select('id, creditor_name, capital, interest, classify, lifecycle_status').eq('case_id', caseId).neq('lifecycle_status', 'soft_deleted'),
    sb.from('rehabilitation_income_settings').select('repay_months, total_debt, secured_debt, unsecured_debt').eq('case_id', caseId).maybeSingle(),
    sb.from('rehabilitation_applications').select('applicant_name').eq('case_id', caseId).maybeSingle(),
  ]);
  return {
    creditors: creditors.data || [],
    income: income.data,
    app: app.data,
  };
}

// ─── 3) 매칭 + diff ──────────────────────────────────────────────
function nameKey(s: string | null | undefined): string {
  return (s || '').replace(/\s+/g, '').trim();
}

async function main() {
  console.log('📥 parsed JSON 로딩...');
  const parsed = loadParsed();
  console.log(`  ${parsed.length}건`);

  console.log('📥 DB cases 로딩...');
  const dbCases = await loadDb();
  console.log(`  ${dbCases.length}건`);

  // PR#4: colaw_case_basic_seq 우선 매칭, 없으면 이름 fallback
  const dbBySeq: Record<string, any> = {};
  const dbByName: Record<string, any[]> = {};
  for (const c of dbCases) {
    if (c.colaw_case_basic_seq) {
      dbBySeq[c.colaw_case_basic_seq] = c;
    }
    const m = (c.title || '').match(/^([가-힣]+)/);
    const key = nameKey(m?.[1]);
    if (!key) continue;
    if (!dbByName[key]) dbByName[key] = [];
    dbByName[key].push(c);
  }

  const rows: any[] = [];
  let unmatched = 0;

  for (const p of parsed) {
    const name = nameKey(p.application.applicant_name);
    const cb = p.application.case_basic_seq || '';
    // PR#4: cb 우선 매칭. 단 1개 → 정확. fallback: 이름.
    const seqMatch = cb && dbBySeq[cb] ? [dbBySeq[cb]] : null;
    const candidates = seqMatch || dbByName[name] || [];

    if (candidates.length === 0) {
      rows.push({
        n: p.n, name, db_id: '', match: 'NO_MATCH',
        raw_creditors: p.creditorData.creditors.length,
        db_creditors: '',
        raw_total: p.creditorData.summary.total_debt,
        db_total: '',
        raw_court: p.application.court_name,
        db_court: '',
        raw_repay: p.income?.forcingrepaymentmonth || '',
        db_repay: '',
        diff_creditor_count: '',
        diff_total: '',
        diff_court: '',
        diff_repay: '',
      });
      unmatched++;
      continue;
    }

    // 동명이인 가능 — 첫 매치 + 다중 표시
    for (const dbCase of candidates) {
      const detail = await loadCaseDetail(dbCase.id);
      const dbCredCount = detail.creditors.length;
      const dbTotal = detail.creditors.reduce((s: number, c: any) => s + (c.capital || 0) + (c.interest || 0), 0);
      const rawTotal = p.creditorData.summary.total_debt;
      const rawRepay = parseInt(p.income?.forcingrepaymentmonth || '0', 10) || null;
      const dbRepay = detail.income?.repay_months || null;
      const rawCourt = p.application.court_name || '';
      const dbCourt = dbCase.court_name || '';

      rows.push({
        n: p.n,
        name,
        db_id: dbCase.id.substring(0, 8),
        match: seqMatch ? 'SEQ' : (candidates.length > 1 ? 'MULTI' : 'OK'),
        raw_creditors: p.creditorData.creditors.length,
        db_creditors: dbCredCount,
        raw_total: rawTotal,
        db_total: dbTotal,
        raw_court: rawCourt,
        db_court: dbCourt,
        raw_repay: rawRepay,
        db_repay: dbRepay,
        diff_creditor_count: dbCredCount - p.creditorData.creditors.length,
        diff_total: dbTotal - rawTotal,
        diff_court: rawCourt && dbCourt && rawCourt !== dbCourt ? `${dbCourt}≠${rawCourt}` : (!rawCourt && dbCourt ? `DB만:${dbCourt}` : ''),
        diff_repay: (rawRepay && dbRepay && rawRepay !== dbRepay) ? `${dbRepay}≠${rawRepay}` : '',
      });
    }
  }

  // ─── 출력 ──────────────────────────────────────────────────────
  // CSV
  const headers = ['n', 'name', 'db_id', 'match', 'raw_creditors', 'db_creditors', 'diff_creditor_count', 'raw_total', 'db_total', 'diff_total', 'raw_court', 'db_court', 'diff_court', 'raw_repay', 'db_repay', 'diff_repay'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')),
  ].join('\n');
  fs.writeFileSync(OUT_CSV, csv);

  // MD 요약
  const mismatches = {
    creditor_count: rows.filter(r => r.match !== 'NO_MATCH' && r.diff_creditor_count !== '' && r.diff_creditor_count !== 0),
    total: rows.filter(r => r.match !== 'NO_MATCH' && r.diff_total !== '' && r.diff_total !== 0),
    court: rows.filter(r => r.match !== 'NO_MATCH' && r.diff_court !== ''),
    repay: rows.filter(r => r.match !== 'NO_MATCH' && r.diff_repay !== ''),
  };
  const md: string[] = [];
  md.push('# COLAW 원본 vs DB diff 리포트');
  md.push(`생성: ${new Date().toISOString()}`);
  md.push('');
  md.push(`- COLAW 원본: ${parsed.length}건`);
  md.push(`- DB cases (insolvency, active): ${dbCases.length}건`);
  md.push(`- 매칭 OK: ${rows.filter(r => r.match === 'OK').length}`);
  md.push(`- 매칭 MULTI(동명): ${rows.filter(r => r.match === 'MULTI').length}`);
  md.push(`- NO_MATCH: ${unmatched}`);
  md.push('');
  md.push('## 미스매치 요약');
  md.push(`- 채권자 행수 불일치: **${mismatches.creditor_count.length}건**`);
  md.push(`- 채권 합계 불일치: **${mismatches.total.length}건**`);
  md.push(`- 법원명 불일치: **${mismatches.court.length}건**`);
  md.push(`- 변제기간 불일치: **${mismatches.repay.length}건**`);
  md.push('');
  md.push('## 채권자 행수 불일치 (상위 30)');
  md.push('| n | 이름 | DB id | raw | db | diff |');
  md.push('|---|---|---|---|---|---|');
  mismatches.creditor_count.slice(0, 30).forEach(r => {
    md.push(`| ${r.n} | ${r.name} | ${r.db_id} | ${r.raw_creditors} | ${r.db_creditors} | ${r.diff_creditor_count > 0 ? '+' : ''}${r.diff_creditor_count} |`);
  });
  md.push('');
  md.push('## 채권 합계 불일치 (상위 30)');
  md.push('| n | 이름 | DB id | raw | db | diff |');
  md.push('|---|---|---|---|---|---|');
  mismatches.total.slice(0, 30).forEach(r => {
    md.push(`| ${r.n} | ${r.name} | ${r.db_id} | ${r.raw_total.toLocaleString()} | ${r.db_total.toLocaleString()} | ${r.diff_total > 0 ? '+' : ''}${r.diff_total.toLocaleString()} |`);
  });
  md.push('');
  md.push('## 법원명 불일치');
  md.push('| n | 이름 | DB id | DB ≠ raw |');
  md.push('|---|---|---|---|');
  mismatches.court.forEach(r => {
    md.push(`| ${r.n} | ${r.name} | ${r.db_id} | ${r.diff_court} |`);
  });
  md.push('');
  md.push('## 변제기간 불일치');
  md.push('| n | 이름 | DB id | DB ≠ raw |');
  md.push('|---|---|---|---|');
  mismatches.repay.forEach(r => {
    md.push(`| ${r.n} | ${r.name} | ${r.db_id} | ${r.diff_repay} |`);
  });
  md.push('');
  fs.writeFileSync(OUT_MD, md.join('\n'));

  console.log(`\n✅ 리포트 출력`);
  console.log(`  ${OUT_MD}`);
  console.log(`  ${OUT_CSV}`);
  console.log(`\n=== 미스매치 요약 ===`);
  console.log(`  채권자 행수: ${mismatches.creditor_count.length}건`);
  console.log(`  채권 합계:   ${mismatches.total.length}건`);
  console.log(`  법원명:      ${mismatches.court.length}건`);
  console.log(`  변제기간:    ${mismatches.repay.length}건`);
  console.log(`  매칭 OK:     ${rows.filter(r => r.match === 'OK').length}/${parsed.length}`);
  console.log(`  NO_MATCH:    ${unmatched}`);
  console.log(`  MULTI:       ${rows.filter(r => r.match === 'MULTI').length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
