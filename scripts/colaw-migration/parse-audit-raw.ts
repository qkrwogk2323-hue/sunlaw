/**
 * PR#1: audit/colaw_raw*/{n}/*.html → 정규화 JSON 파서 (무해, schema 변경 없음)
 *
 * 입력:
 *   audit/colaw_raw/{1..90}/{application,creditors,properties,income,affidavit,plansection}.html
 *   audit/colaw_raw_bankrupt/{1..38}/{application,creditors,properties,income,lifestyle,affidavit,datasubmission}.html
 *
 * 출력:
 *   audit/colaw_normalized_rehab.json
 *   audit/colaw_normalized_bankrupt.json
 *   audit/colaw_normalized_summary.tsv   (n, type, applicant, creditors_n, properties_n, total_capital)
 *
 * 실행: npx tsx scripts/colaw-migration/parse-audit-raw.ts
 *
 * 주의:
 * - read-only: DB 접근 없음. 파일 쓰기는 audit/ 하위만.
 * - 파싱 규칙이 불확실한 필드는 raw 문자열 그대로 보존(`_raw` 접미사).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const REHAB_DIR = path.join(ROOT, 'audit', 'colaw_raw');
const BANKRUPT_DIR = path.join(ROOT, 'audit', 'colaw_raw_bankrupt');

// ─── HTML 파싱 유틸 (tolerant: name과 value 사이의 임의 속성 허용) ────
const num = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseInt(String(s).replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

function tagsWithName(html: string, name: string): string[] {
  const rx = new RegExp(`<input\\b[^>]*\\bname=["']${name}["'][^>]*>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) out.push(m[0]);
  return out;
}
function valueOfTag(tag: string): string {
  const m = /\bvalue=["']([^"']*)["']/.exec(tag);
  return m ? m[1] : '';
}
function collectByName(html: string, name: string): string[] {
  return tagsWithName(html, name).map(valueOfTag);
}
function firstNameValue(html: string, name: string): string {
  return collectByName(html, name)[0] || '';
}

/** select 안에서 selected option value */
function selectedOption(html: string, selectName: string): string {
  const selRx = new RegExp(
    `<select[^>]*\\bname=["']${selectName}["'][^>]*>([\\s\\S]*?)<\\/select>`,
  );
  const m = selRx.exec(html);
  if (!m) return '';
  const opt = /<option[^>]*\bselected[^>]*\bvalue=["']([^"']*)["']|<option[^>]*\bvalue=["']([^"']*)["'][^>]*\bselected/.exec(
    m[1],
  );
  return opt ? opt[1] || opt[2] || '' : '';
}

/** creditor 반복 form 파싱 — 회생: frm_creditor_, 파산: frm_bankruptcycreditlist_ */
function parseCreditors(html: string, formPrefix: string) {
  const rx = new RegExp(
    `<form[^>]*\\bid=["']${formPrefix}[^"']*["'][\\s\\S]*?<\\/form>`,
    'g',
  );
  const forms: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html)) !== null) forms.push(m[0]);

  return forms
    .map((block, i) => ({
      idx: i + 1,
      creditor_name:
        firstNameValue(block, 'bondname') || firstNameValue(block, 'creditornames'),
      capital: num(
        firstNameValue(block, 'capital') || firstNameValue(block, 'firstbondmoney'),
      ),
      interest: num(firstNameValue(block, 'interest')),
      is_secured:
        /name=["']capitalinterestarepayment["'][^>]*value=["']1["'][^>]*checked/.test(block),
    }))
    .filter((c) => c.creditor_name);
}

/** properties: estateseq 고유값으로 행 수 집계 */
function parseProperties(html: string) {
  const seqs = collectByName(html, 'estateseq').filter((v) => v && v !== '0');
  return { count: new Set(seqs).size, rawRows: seqs.length };
}

function parseIncome(html: string) {
  return {
    gross_salary: num(firstNameValue(html, 'gross_salary') || firstNameValue(html, 'grosssalary')),
    net_salary: num(firstNameValue(html, 'net_salary') || firstNameValue(html, 'netsalary')),
    living_cost: num(firstNameValue(html, 'living_cost') || firstNameValue(html, 'livingcost')),
    extra_living_cost: num(
      firstNameValue(html, 'extra_living_cost') || firstNameValue(html, 'extralivingcost'),
    ),
    child_support: num(firstNameValue(html, 'child_support') || firstNameValue(html, 'childsupport')),
    repay_months_raw: firstNameValue(html, 'repay_months') || firstNameValue(html, 'repaymonths'),
    total_debt_alt: firstNameValue(html, 'total_debt') || firstNameValue(html, 'totaldebt'),
  };
}

function parseApplication(html: string) {
  return {
    applicant_name: firstNameValue(html, 'applicationname'),
    jumin: firstNameValue(html, 'applicationjumin'),
    registered_address: firstNameValue(html, 'applicationaddress'),
    office_name: firstNameValue(html, 'officename'),
    office_industry: firstNameValue(html, 'officeorder'),
  };
}

// ─── 케이스 러너 ────────────────────────────────────────────────
function parseCase(dir: string, type: 'rehab' | 'bankrupt') {
  const read = (f: string): string =>
    fs.existsSync(path.join(dir, f))
      ? fs.readFileSync(path.join(dir, f), 'utf-8')
      : '';

  const application = parseApplication(read('application.html'));
  const creditors = parseCreditors(
    read('creditors.html'),
    type === 'rehab' ? 'frm_creditor_' : 'frm_bankruptcycreditlist_',
  );
  const properties = parseProperties(read('properties.html'));
  const income = parseIncome(read('income.html'));

  const total_capital = creditors.reduce((s, c) => s + c.capital, 0);
  const total_interest = creditors.reduce((s, c) => s + c.interest, 0);
  const secured_capital = creditors
    .filter((c) => c.is_secured)
    .reduce((s, c) => s + c.capital, 0);

  return {
    application,
    income,
    creditors,
    properties_n: properties.count,
    properties_raw_rows: properties.rawRows,
    derived: {
      creditors_n: creditors.length,
      total_capital,
      total_interest,
      secured_capital,
    },
  };
}

function run(rootDir: string, type: 'rehab' | 'bankrupt', outPath: string) {
  if (!fs.existsSync(rootDir)) {
    console.error(`missing dir: ${rootDir}`);
    return [];
  }
  const entries = fs
    .readdirSync(rootDir)
    .filter((d) => /^\d+$/.test(d))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const all: Record<string, ReturnType<typeof parseCase> & { n: string }> = {};
  const summaryRows: string[] = [
    ['n', 'type', 'applicant', 'creditors_n', 'properties_n', 'total_capital'].join('\t'),
  ];

  for (const n of entries) {
    const dir = path.join(rootDir, n);
    try {
      const parsed = parseCase(dir, type);
      all[n] = { n, ...parsed };
      summaryRows.push(
        [
          n,
          type,
          parsed.application.applicant_name,
          parsed.derived.creditors_n,
          parsed.properties_n,
          parsed.derived.total_capital,
          parsed.derived.secured_capital,
        ].join('\t'),
      );
    } catch (e) {
      console.error(`parse error ${type} ${n}:`, (e as Error).message);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`wrote ${outPath} (${Object.keys(all).length} cases)`);
  return summaryRows;
}

function main() {
  const outDir = path.join(ROOT, 'audit');
  const rehabRows = run(
    REHAB_DIR,
    'rehab',
    path.join(outDir, 'colaw_normalized_rehab.json'),
  );
  const bankRows = run(
    BANKRUPT_DIR,
    'bankrupt',
    path.join(outDir, 'colaw_normalized_bankrupt.json'),
  );
  const summary = [...rehabRows, ...bankRows.slice(1)].join('\n');
  fs.writeFileSync(path.join(outDir, 'colaw_normalized_summary.tsv'), summary, 'utf-8');
  console.log(`wrote ${path.join(outDir, 'colaw_normalized_summary.tsv')}`);
}

main();
