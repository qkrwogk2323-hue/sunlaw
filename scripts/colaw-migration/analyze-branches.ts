/**
 * 90건 회생 케이스의 모든 분기 조건 + plansection 자동 채움 패턴 매트릭스 분석
 *
 * 분기 축:
 *  A. 별제권 (0/1/N건, 부동산/자동차)
 *  B. 보증인 (0/1/N건)
 *  C. 미확정채권 (0/1/N건)
 *  D. 우선변제 (0/1/N건)
 *  E. 국가/지자체 채권자 (국세/지방세)
 *  F. 연금법채무
 *  G. 주담대 채무재조정
 *  H. 면제재산
 *  I. 부동산 소유
 *  J. 영업소득자 vs 급여소득자
 *  K. 변제기간 36/45/48/60
 *
 * 출력: audit/branch_analysis.md
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PARSED_DIR = path.join(ROOT, 'audit/colaw_parsed/rehab');
const OUT = path.join(ROOT, 'audit/branch_analysis.md');

type Case = any;
const all: Case[] = [];
for (let n = 1; n <= 90; n++) {
  const p = path.join(PARSED_DIR, `${n}.json`);
  if (!fs.existsSync(p)) continue;
  all.push(JSON.parse(fs.readFileSync(p, 'utf8')));
}

function feat(c: Case) {
  const creds = c.creditorData?.creditors || [];
  const sepCount = creds.filter((x: any) => x.has_separation_right).length;
  const guarSum = creds.reduce((s: number, x: any) => s + (x.guarantor_count || 0), 0);
  const unconfSum = creds.reduce((s: number, x: any) => s + (x.unconfirmed_count || 0), 0);
  const firstPayCount = creds.filter((x: any) => x.first_repayment).length;
  const annuityCount = creds.filter((x: any) => x.kind_annuity_debt).length;
  const restructCount = creds.filter((x: any) => x.apply_debt_restructuring).length;
  const govCount = creds.filter((x: any) => x.classify === '국가' || x.classify === '지방자치단체').length;
  const incomeType = c.application?.income_type === 'business' ? '영업' : (c.application?.income_type === 'salary' ? '급여' : '?');
  const repayMonths = parseInt(c.income?.forcingrepaymentmonth || '0', 10);
  const planSecs: any[] = c.planSections?.sections || [];
  const planFilled = planSecs.map((s: any) => (s.content || '').trim().length > 0 ? 1 : 0);

  return {
    n: c.n,
    name: c.application?.applicant_name || '',
    creditors: creds.length,
    sep: sepCount,
    guar: guarSum,
    unconf: unconfSum,
    firstPay: firstPayCount,
    annuity: annuityCount,
    restruct: restructCount,
    gov: govCount,
    incomeType,
    repayMonths,
    realEstate: c.properties?.has_real_estate ? 1 : 0,
    exempt: c.properties?.exempt_property ? 1 : 0,
    attachment: c.properties?.has_attachment ? 1 : 0,
    plan: planFilled, // [s1,s2,s3,s4,s5,s6]
  };
}

const features = all.map(feat);

// ─── 분포 ─────────────────────────────────────────────────────────
function dist(values: any[]): Record<string, number> {
  const d: Record<string, number> = {};
  for (const v of values) {
    const k = String(v);
    d[k] = (d[k] || 0) + 1;
  }
  return d;
}
function bucket(v: number) {
  if (v === 0) return '0';
  if (v === 1) return '1';
  if (v <= 3) return '2-3';
  return '4+';
}

const md: string[] = [];
md.push('# 회생 90건 분기 로직 매트릭스 분석\n');
md.push(`생성: ${new Date().toISOString()}\n`);

md.push('## 1. 단일 축 분포\n');
const axes: [string, (f: any) => any][] = [
  ['별제권 채권자 수', f => bucket(f.sep)],
  ['보증인 수', f => bucket(f.guar)],
  ['미확정채권 수', f => bucket(f.unconf)],
  ['우선변제 채권자 수', f => bucket(f.firstPay)],
  ['연금법채무', f => bucket(f.annuity)],
  ['주담대재조정', f => bucket(f.restruct)],
  ['국가/지자체 채권자 수', f => bucket(f.gov)],
  ['소득유형', f => f.incomeType],
  ['변제기간(개월)', f => f.repayMonths],
  ['부동산 소유', f => f.realEstate ? '있음' : '없음'],
  ['면제재산', f => f.exempt ? '있음' : '없음'],
  ['(가)압류적립금', f => f.attachment ? '있음' : '없음'],
];
for (const [name, fn] of axes) {
  md.push(`### ${name}`);
  const d = dist(features.map(fn));
  Object.entries(d).sort((a, b) => Number(b[1]) - Number(a[1])).forEach(([k, v]) => {
    md.push(`- \`${k}\`: ${v}건`);
  });
  md.push('');
}

// ─── plansection 채워짐 패턴 ─────────────────────────────────────
md.push('## 2. plansection form 채워짐 패턴\n');
md.push('plansection.html 안 frmPlanSection1~6의 textarea가 비어있는지(0)/채워졌는지(1).\n');
const planPatterns = dist(features.map(f => f.plan.join('')));
md.push('### 패턴 분포');
Object.entries(planPatterns).sort((a, b) => Number(b[1]) - Number(a[1])).forEach(([k, v]) => {
  md.push(`- \`${k}\`: ${v}건`);
});
md.push('');
md.push('* form 의미: [1=이직신고, 2=재산목록, 3=수정허가, 4=수시자료, 5=강제집행효력, 6=기타사항]');
md.push('');

// 패턴별 대표 케이스
md.push('### 패턴별 특성 (어떤 분기 조건과 연결되는가)');
const groups: Record<string, any[]> = {};
for (const f of features) {
  const k = f.plan.join('');
  (groups[k] = groups[k] || []).push(f);
}
for (const [pattern, list] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
  const cnt = list.length;
  const avgSep = (list.reduce((s, x) => s + x.sep, 0) / cnt).toFixed(1);
  const avgGuar = (list.reduce((s, x) => s + x.guar, 0) / cnt).toFixed(1);
  const avgFirst = (list.reduce((s, x) => s + x.firstPay, 0) / cnt).toFixed(1);
  const avgGov = (list.reduce((s, x) => s + x.gov, 0) / cnt).toFixed(1);
  const realE = list.filter(x => x.realEstate).length;
  const exempt = list.filter(x => x.exempt).length;
  const repayDist = dist(list.map(x => x.repayMonths));
  md.push(`#### 패턴 \`${pattern}\` (${cnt}건)`);
  md.push(`- 평균 별제권: ${avgSep}, 보증인: ${avgGuar}, 우선변제: ${avgFirst}, 국가/지자체: ${avgGov}`);
  md.push(`- 부동산소유: ${realE}/${cnt}, 면제재산: ${exempt}/${cnt}`);
  md.push(`- 변제기간 분포: ${Object.entries(repayDist).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  md.push(`- 케이스: ${list.slice(0, 8).map(x => `#${x.n} ${x.name}`).join(', ')}${list.length > 8 ? ' ...' : ''}`);
  md.push('');
}

// ─── 교차표: 별제권 × plansection5 ───────────────────────────────
md.push('## 3. 별제권 × plansection5 교차표 (가설: 별제권 → form5 자동 채움)\n');
const cross = { sep_y_form5_y: 0, sep_y_form5_n: 0, sep_n_form5_y: 0, sep_n_form5_n: 0 };
for (const f of features) {
  const sY = f.sep > 0;
  const f5Y = f.plan[4] === 1;
  if (sY && f5Y) cross.sep_y_form5_y++;
  else if (sY && !f5Y) cross.sep_y_form5_n++;
  else if (!sY && f5Y) cross.sep_n_form5_y++;
  else cross.sep_n_form5_n++;
}
md.push('| | form5 채움 | form5 비움 |');
md.push('|---|---|---|');
md.push(`| **별제권 있음** | ${cross.sep_y_form5_y} | ${cross.sep_y_form5_n} |`);
md.push(`| **별제권 없음** | ${cross.sep_n_form5_y} | ${cross.sep_n_form5_n} |`);
md.push('');

// ─── 교차표: 부동산 소유 × form5 ─────────────────────────────────
md.push('## 4. 부동산 소유 × plansection5 교차표\n');
const cross2 = { y_y: 0, y_n: 0, n_y: 0, n_n: 0 };
for (const f of features) {
  const rY = f.realEstate === 1;
  const f5Y = f.plan[4] === 1;
  if (rY && f5Y) cross2.y_y++;
  else if (rY && !f5Y) cross2.y_n++;
  else if (!rY && f5Y) cross2.n_y++;
  else cross2.n_n++;
}
md.push('| | form5 채움 | form5 비움 |');
md.push('|---|---|---|');
md.push(`| **부동산 소유** | ${cross2.y_y} | ${cross2.y_n} |`);
md.push(`| **부동산 없음** | ${cross2.n_y} | ${cross2.n_n} |`);
md.push('');

// ─── 변제기간 60개월 트리거 ──────────────────────────────────────
md.push('## 5. 변제기간 60개월 케이스 분석 (트리거 조건)\n');
const long = features.filter(f => f.repayMonths === 60);
md.push(`총 ${long.length}건\n`);
md.push('| n | 이름 | 별제권 | 보증인 | 우선변제 | 국가/지자체 | 채권자수 |');
md.push('|---|---|---|---|---|---|---|');
long.forEach(f => md.push(`| ${f.n} | ${f.name} | ${f.sep} | ${f.guar} | ${f.firstPay} | ${f.gov} | ${f.creditors} |`));
md.push('');

// ─── 연대보증인 케이스 ───────────────────────────────────────────
md.push('## 6. 보증인 있는 케이스\n');
const guarCases = features.filter(f => f.guar > 0);
md.push(`총 ${guarCases.length}건\n`);
md.push('| n | 이름 | 보증인 | 별제권 | plansection 패턴 |');
md.push('|---|---|---|---|---|');
guarCases.forEach(f => md.push(`| ${f.n} | ${f.name} | ${f.guar} | ${f.sep} | \`${f.plan.join('')}\` |`));
md.push('');

// ─── 우선변제 케이스 ─────────────────────────────────────────────
md.push('## 7. 우선변제 채권자 있는 케이스\n');
const firstCases = features.filter(f => f.firstPay > 0);
md.push(`총 ${firstCases.length}건\n`);
md.push('| n | 이름 | 우선변제 | 국가/지자체 | 변제기간 | plansection |');
md.push('|---|---|---|---|---|---|');
firstCases.forEach(f => md.push(`| ${f.n} | ${f.name} | ${f.firstPay} | ${f.gov} | ${f.repayMonths} | \`${f.plan.join('')}\` |`));
md.push('');

// ─── 국가/지자체 채권자 케이스 ───────────────────────────────────
md.push('## 8. 국가/지자체 채권자 (국세/지방세) 분포\n');
const govCases = features.filter(f => f.gov > 0);
md.push(`총 ${govCases.length}건\n`);
md.push('| n | 이름 | 국가/지자체 수 | 우선변제 동시 | 변제기간 |');
md.push('|---|---|---|---|---|');
govCases.forEach(f => md.push(`| ${f.n} | ${f.name} | ${f.gov} | ${f.firstPay} | ${f.repayMonths} |`));
md.push('');

// ─── 미확정채권 케이스 ───────────────────────────────────────────
md.push('## 9. 미확정채권 있는 케이스\n');
const unconfCases = features.filter(f => f.unconf > 0);
md.push(`총 ${unconfCases.length}건\n`);
md.push('| n | 이름 | 미확정 | 별제권 | plansection |');
md.push('|---|---|---|---|---|');
unconfCases.forEach(f => md.push(`| ${f.n} | ${f.name} | ${f.unconf} | ${f.sep} | \`${f.plan.join('')}\` |`));
md.push('');

fs.writeFileSync(OUT, md.join('\n'));
console.log(`✅ ${OUT}`);
console.log(`총 ${features.length}건 분석`);
console.log(`별제권: ${features.filter(f => f.sep > 0).length}건`);
console.log(`보증인: ${features.filter(f => f.guar > 0).length}건`);
console.log(`우선변제: ${features.filter(f => f.firstPay > 0).length}건`);
console.log(`국가/지자체 채권자: ${features.filter(f => f.gov > 0).length}건`);
console.log(`60개월: ${features.filter(f => f.repayMonths === 60).length}건`);
console.log(`영업소득: ${features.filter(f => f.incomeType === '영업').length}건`);
console.log(`부동산 소유: ${features.filter(f => f.realEstate).length}건`);
console.log(`plansection 패턴 종류: ${Object.keys(planPatterns).length}`);
