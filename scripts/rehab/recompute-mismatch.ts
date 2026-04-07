/**
 * P1-6(b) 마이그레이션 케이스 재집계 및 mismatch 리포트
 *
 * 데이터 소스 (DB에 colaw_snapshot 컬럼이 없으므로 폴백):
 *   scripts/colaw-migration/data/*.json (pilot JSON 덤프)
 *
 * 비교 대상 (P0/P1 엔진 적용):
 *   - net_salary / monthlyIncome
 *   - livingCost (P1-1 자동 클램프 적용 후)
 *   - planDurationMonths (P1-2 자동결정 적용 후)
 *   - presentValue (P0-1 leibniz 적용 후)
 *   - totalDebt / unsecuredTotal (P0-3 별제권 부족액 포함)
 *
 * 출력:
 *   - docs/reports/mismatch-recompute-{YYYY-MM-DD}.csv
 *   - stdout 요약
 *
 * 실행:
 *   npx tsx scripts/rehab/recompute-mismatch.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import * as path from 'path';

import { adjustLivingCost } from '../../src/lib/rehabilitation/median-income';
import { presentValue } from '../../src/lib/rehabilitation/leibniz';
import { decideRepaymentPeriod } from '../../src/lib/rehabilitation/repayment-period';

// ─── 환경 변수 ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경 변수 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── 유틸 ─────────────────────────────────────────────────────────
function parseAmount(s: string | number | null | undefined): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  return parseInt(String(s).replace(/,/g, ''), 10) || 0;
}

interface MismatchRow {
  caseId: string;
  clientName: string;
  field: string;
  vsValue: number | string;
  colawValue: number | string;
  delta: number;
  tolerance: number;
  status: 'match' | 'mismatch' | 'missing_db';
}

const TOL = {
  monthlyAvailable: 1,
  livingCost: 1,
  planDurationMonths: 0,
  presentValue: 1,
  totalDebt: 1,
  unsecuredTotal: 1,
};

// ─── pilot JSON 로드 ─────────────────────────────────────────────
function loadPilotData(): any[] {
  const dir = path.join(process.cwd(), 'scripts/colaw-migration/data');
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const all: any[] = [];
  for (const f of files) {
    const json = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    if (Array.isArray(json.cases)) all.push(...json.cases);
  }
  return all;
}

// ─── VS DB에서 케이스 상태 가져오기 ──────────────────────────────
async function fetchVsCase(caseId: string) {
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, opened_on, case_number')
    .eq('id', caseId)
    .maybeSingle();

  const { data: income } = await supabase
    .from('rehabilitation_income_settings')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  const { data: app } = await supabase
    .from('rehabilitation_applications')
    .select('application_date, repayment_start_date, created_at')
    .eq('case_id', caseId)
    .maybeSingle();

  const { data: creditors } = await supabase
    .from('rehabilitation_creditors')
    .select('capital, interest, is_secured, secured_collateral_value, is_other_unconfirmed')
    .eq('case_id', caseId);

  const { data: properties } = await supabase
    .from('rehabilitation_properties')
    .select('amount')
    .eq('case_id', caseId);

  const { data: deductions } = await supabase
    .from('rehabilitation_property_deductions')
    .select('deduction_amount')
    .eq('case_id', caseId);

  return { caseRow, income, app, creditors: creditors ?? [], properties: properties ?? [], deductions: deductions ?? [] };
}

// ─── VS 엔진으로 재계산 ──────────────────────────────────────────
function computeFromVs(vs: Awaited<ReturnType<typeof fetchVsCase>>) {
  const income = vs.income ?? {};
  const householdSize = 1 + (Number(income.dependent_count) || 0);
  const yearFromDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  };
  const caseYear =
    yearFromDate(vs.app?.application_date) ??
    yearFromDate(vs.app?.created_at) ??
    new Date().getFullYear();
  const incomeYear = Number(income.median_income_year) || caseYear;

  const monthlyIncome = (Number(income.net_salary) || 0) + (Number(income.extra_income) || 0);
  const livingInput = Number(income.living_cost) || 0;
  const livingAdj = adjustLivingCost(livingInput, householdSize, incomeYear);
  const livingCost = livingAdj.adjusted;
  const extraLiving = Number(income.extra_living_cost) || 0;
  const childSupport = Number(income.child_support) || 0;
  const commissionRate = Number(income.trustee_comm_rate) || 0;
  const rawAvailable = monthlyIncome - livingCost - extraLiving - childSupport;
  const commission = Math.floor((rawAvailable * commissionRate) / 100);
  const monthlyAvailable = rawAvailable - commission;

  // 채권/청산
  const totalDebt = vs.creditors.reduce(
    (s, c) => s + (Number(c.capital) || 0) + (Number(c.interest) || 0),
    0,
  );
  const unsecuredTotal = vs.creditors.reduce((s, c) => {
    const claim = (Number(c.capital) || 0) + (Number(c.interest) || 0);
    if (c.is_secured) {
      const collateral = Math.min(Number(c.secured_collateral_value) || 0, claim);
      return s + Math.max(0, claim - collateral);
    }
    return s + claim;
  }, 0);
  const totalProp = vs.properties.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalDeduct = vs.deductions.reduce((s, d) => s + (Number(d.deduction_amount) || 0), 0);
  const liquidationValue = Math.max(0, totalProp - totalDeduct);

  // 변제기간 자동결정 (없으면 P1-2 호출)
  const explicit = Number(income.repay_months) || 0;
  let planDurationMonths: 36 | 48 | 60;
  if (explicit === 36 || explicit === 48 || explicit === 60) {
    planDurationMonths = explicit as 36 | 48 | 60;
  } else if (monthlyAvailable > 0) {
    planDurationMonths = decideRepaymentPeriod({
      monthlyPayment: monthlyAvailable,
      liquidationValue,
      unsecuredTotal,
    }).period;
  } else {
    planDurationMonths = 36;
  }

  const pv = monthlyAvailable > 0 ? presentValue(monthlyAvailable, planDurationMonths) : 0;

  return {
    monthlyIncome,
    livingCost,
    monthlyAvailable,
    planDurationMonths,
    presentValue: pv,
    totalDebt,
    unsecuredTotal,
    liquidationValue,
  };
}

// ─── colaw pilot snapshot에서 기댓값 추출 ────────────────────────
function extractColawExpected(snap: any) {
  const income = snap.income || {};
  const summary = snap.summary || {};
  const creditors = snap.creditors || [];

  // 콜로 ground truth는 income/summary 텍스트에서 파싱
  const monthlyIncome = parseAmount(income.net_salary || income.gross_salary);
  const livingCost = parseAmount(income.living_cost);
  const repayMonths = parseInt(income.repay_months || '0', 10) || null;
  const totalDebt = parseAmount(summary.total_debt);
  const securedDebt = parseAmount(summary.secured_debt);
  const unsecuredDebt = parseAmount(summary.unsecured_debt);

  // 콜로의 monthlyAvailable / presentValue가 snapshot에 직접 없으면 추정 불가 → null
  // (B_29 PV는 snapshot.B_19 같은 별도 캡처에 의존)
  return {
    monthlyIncome,
    livingCost,
    planDurationMonths: repayMonths,
    totalDebt,
    securedDebt,
    unsecuredDebt,
    creditorCount: creditors.length,
  };
}

// ─── 비교 ─────────────────────────────────────────────────────────
function compareCase(
  caseId: string,
  clientName: string,
  vs: ReturnType<typeof computeFromVs>,
  colaw: ReturnType<typeof extractColawExpected>,
): MismatchRow[] {
  const rows: MismatchRow[] = [];
  const checks = [
    { field: 'monthlyIncome', vs: vs.monthlyIncome, colaw: colaw.monthlyIncome, tol: TOL.monthlyAvailable },
    { field: 'livingCost', vs: vs.livingCost, colaw: colaw.livingCost, tol: TOL.livingCost },
    { field: 'planDurationMonths', vs: vs.planDurationMonths, colaw: colaw.planDurationMonths ?? 0, tol: TOL.planDurationMonths },
    { field: 'totalDebt', vs: vs.totalDebt, colaw: colaw.totalDebt, tol: TOL.totalDebt },
    { field: 'unsecuredTotal', vs: vs.unsecuredTotal, colaw: colaw.unsecuredDebt, tol: TOL.unsecuredTotal },
  ];

  for (const x of checks) {
    if (x.colaw === 0 || x.colaw == null) continue;
    const delta = Math.abs((Number(x.vs) || 0) - (Number(x.colaw) || 0));
    const status = delta <= x.tol ? 'match' : 'mismatch';
    rows.push({
      caseId,
      clientName,
      field: x.field,
      vsValue: x.vs,
      colawValue: x.colaw,
      delta,
      tolerance: x.tol,
      status,
    });
  }

  return rows;
}

// ─── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 P1-6(b) 마이그레이션 케이스 재집계\n');

  const pilots = loadPilotData();
  console.log(`📂 pilot JSON 로드: ${pilots.length}건\n`);

  if (pilots.length === 0) {
    console.error('❌ 데이터 소스 없음. scripts/colaw-migration/data/*.json 필요');
    process.exit(1);
  }

  const allRows: MismatchRow[] = [];
  let matchCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  for (const snap of pilots) {
    const caseId = snap.vsCaseId as string;
    const clientName = snap.name as string;

    const vsRaw = await fetchVsCase(caseId);
    if (!vsRaw.caseRow) {
      allRows.push({
        caseId,
        clientName,
        field: '_case',
        vsValue: '',
        colawValue: '',
        delta: 0,
        tolerance: 0,
        status: 'missing_db',
      });
      missingCount++;
      continue;
    }

    const vs = computeFromVs(vsRaw);
    const colaw = extractColawExpected(snap);
    const rows = compareCase(caseId, clientName, vs, colaw);
    allRows.push(...rows);
    matchCount += rows.filter((r) => r.status === 'match').length;
    mismatchCount += rows.filter((r) => r.status === 'mismatch').length;

    console.log(`── ${clientName} (${caseId.slice(0, 8)}...) ──`);
    rows.forEach((r) => {
      const icon = r.status === 'match' ? '✅' : '❌';
      console.log(`  ${icon} ${r.field}: VS=${r.vsValue} / colaw=${r.colawValue} (delta=${r.delta})`);
    });
    console.log();
  }

  // CSV 출력
  const today = new Date().toISOString().slice(0, 10);
  const outPath = `docs/reports/mismatch-recompute-${today}.csv`;
  const header = 'caseId,clientName,field,vsValue,colawValue,delta,tolerance,status\n';
  const body = allRows
    .map(
      (r) =>
        `${r.caseId},"${r.clientName}",${r.field},${r.vsValue},${r.colawValue},${r.delta},${r.tolerance},${r.status}`,
    )
    .join('\n');
  writeFileSync(outPath, header + body);

  console.log('═══ 재집계 완료 ═══');
  console.log(`총 비교: ${allRows.length}개 필드 (케이스 ${pilots.length}건)`);
  console.log(`✅ match:    ${matchCount}`);
  console.log(`❌ mismatch: ${mismatchCount}`);
  console.log(`⚠️  missing:  ${missingCount}`);
  console.log(`📄 리포트:   ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
