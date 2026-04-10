/**
 * audit/colaw_raw* HTML → 정규화 JSON 파서
 *
 * 입력: audit/colaw_raw/{1..90}/*.html (회생 90건 × 6 탭)
 *       audit/colaw_raw_bankrupt/{1..38}/*.html (파산 38건 × 7 탭)
 * 출력: audit/colaw_parsed/rehab/{n}.json, audit/colaw_parsed/bankrupt/{n}.json
 *
 * read-only. DB write 없음. 외부 호출 없음.
 *
 * 실행: npx tsx scripts/colaw-migration/parse-colaw-raw.ts
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const REHAB_DIR = path.join(ROOT, 'audit/colaw_raw');
const BANKRUPT_DIR = path.join(ROOT, 'audit/colaw_raw_bankrupt');
const OUT_DIR = path.join(ROOT, 'audit/colaw_parsed');

// ─── 유틸 ────────────────────────────────────────────────────────
function readHtml(dir: string, file: string): cheerio.CheerioAPI | null {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  return cheerio.load(fs.readFileSync(p, 'utf8'));
}

function val($: cheerio.CheerioAPI, sel: string): string {
  return ($(sel).attr('value') ?? $(sel).val() ?? '').toString().trim();
}

function txt($: cheerio.CheerioAPI, sel: string): string {
  return $(sel).text().trim();
}

function checked($: cheerio.CheerioAPI, sel: string): boolean {
  return $(sel).is('[checked]');
}

function num(s: string | undefined | null): number {
  if (!s) return 0;
  return parseInt(String(s).replace(/[,\s]/g, ''), 10) || 0;
}

// ─── 회생 ─ application 탭 ────────────────────────────────────────
function parseApplication($: cheerio.CheerioAPI) {
  const g = (name: string) => val($, `[name="${name}"]`);
  const gr = (name: string) => val($, `[name="${name}"]:checked`);

  // incomegubun: jQuery 런타임에 prop('checked')로 설정 → cheerio는 static HTML만 읽음.
  // 해결: <script> 내 `var incomegubun = "0"` 변수에서 직접 추출.
  const scriptText = $('script').text();
  const incomeGubunMatch = scriptText.match(/var\s+incomegubun\s*=\s*"(\d)"/);
  const incomeGubun = incomeGubunMatch?.[1] ?? '';

  return {
    applicant_name: g('applicationname'),
    resident_number: g('applicationjumin'),
    registered_zip: g('applicationzip'),
    registered_address: g('applicationaddress'),
    current_zip: g('nowapplicationzip'),
    current_address: g('nowapplicationaddress'),
    office_zip: g('officezip'),
    office_address: g('officeaddress'),
    delivery_zip: g('deliveryzip'),
    delivery_address: g('deliveryaddress'),
    delivery_recipient: g('deliveryreceiptname'),
    phone_home: g('deliveryreceipttel'),
    phone_mobile: g('deliveryreceiptmobile'),
    return_account: g('returnbanknameaccount'),
    income_type: gr('incomegubun'),
    employer_name: g('officename'),
    position: g('officeorder'),
    work_period: g('workyearmonth'),
    application_date: g('applicateplandate'),
    repayment_start_date: g('repaymentfromdate'),
    agent_name: g('agentname'),
    agent_tel: g('agenttel'),
    agent_fax: g('agentfax'),
    agent_zip: g('agentzip'),
    agent_address: g('agentaddress'),
    agent_email: g('agentemail'),
    agent_gubun: gr('agentgubun'),
    agent_law_firm: g('agentlawfirm') || g('companydeliveryname'),
    net_salary: g('tagyeosalary'),
    gross_salary: g('monthlyincomeamount'),
    // incomegubun: 0=영업소득자, 1=급여소득자 (jQuery runtime → script 변수에서 추출)
    income_gubun: incomeGubun,
    income_type: incomeGubun === '1' ? 'salary' : incomeGubun === '0' ? 'business' : '',
    court_name: g('courtname'),                 // 인천지방법원 등
    case_year: g('diaryyear'),                  // 2025
    case_number: g('casenumber'),               // 법원 사건번호 (빈 경우 다수)
    case_basic_seq: g('casebasicsseq'),         // colaw 내부 ID
    charge_justice: g('chargejustice'),         // 담당재판부
  };
}

// ─── 회생 ─ creditors 탭 ──────────────────────────────────────────
function parseCreditors($: cheerio.CheerioAPI) {
  // 채권 합계
  const summary = {
    total_debt: num(val($, '[name="nowtotalsum"]')),
    secured_debt: num(val($, '[name="dambosum"]')),
    unsecured_debt: num(val($, '[name="nodambosum"]')),
  };

  // 채권자 div_creditor_<seq> 모두 추출 (placeholder seq=0 제외)
  const creditors: any[] = [];
  $('[id^="div_creditor_"]').each((_, el) => {
    const id = $(el).attr('id') || '';
    const seq = id.replace('div_creditor_', '');
    if (!seq || seq === '0') return; // placeholder

    const $c = $(el);

    const f = (name: string): string =>
      ($c.find(`[name="${name}"]`).first().attr('value') ?? '').toString().trim();
    const fchk = (idPrefix: string): boolean => {
      const $el = $c.find(`#${idPrefix}_${seq}`);
      return $el.length > 0 && $el.is('[checked]');
    };
    const fsel = (name: string): string => {
      const $sel = $c.find(`select[name="${name}"]`).first();
      return ($sel.find('option[selected]').attr('value') ?? '').toString().trim();
    };

    const bondname = f('bondname');
    if (!bondname) return; // 빈 채권자 건너뜀

    // 부속서류/미확정/보증인 카운트 (채권자별)
    const attachedTitle = $c.find('#number-attached-documents-title').text().trim();
    const unconfirmedTitle = $c.find('#number-unconfirmed-bond-title').text().trim();
    const guarantorTitle = $c.find('#number-guarantor-debt-title').text().trim();
    const numFrom = (s: string) => parseInt((s.match(/(\d+)/)?.[1]) || '0', 10);

    creditors.push({
      seq,
      bond_number: f('bondnumber'),
      classify: fsel('classify'),       // 인격구분: 법인/자연인
      creditor_name: bondname,
      branch_name: f('branchname'),
      postal_code: f('zipcode'),
      address: f('address'),
      phone: f('tel') || f('phone'),
      fax: f('fax'),
      bond_cause: f('bondcause'),
      capital: num(f('capital')),
      capital_compute: f('capitalcompute'),
      interest: num(f('interest')),
      interest_compute: f('interestcompute'),
      bond_content: f('bondcontent'),
      delay_rate: f('delayrate'),
      // 채권 유형 4종 checkbox
      first_repayment: fchk('firstrepayment'),
      unsettlement_bond: fchk('unsettlementbond'),
      kind_annuity_debt: fchk('kindannuitydebt'),
      apply_debt_restructuring: fchk('applydebtrestructuring'),
      // 부속서류/미확정/보증인 라벨 + 카운트
      attached_label: attachedTitle,
      attached_count: numFrom(attachedTitle),
      unconfirmed_count: numFrom(unconfirmedTitle),
      guarantor_count: numFrom(guarantorTitle),
      has_separation_right: /별제권/.test(attachedTitle),
      has_rehab_secured: /회생담보권/.test(attachedTitle),
    });
  });

  return { summary, creditors };
}

// ─── 회생 ─ properties 탭 ────────────────────────────────────────
// 카테고리 14종 (현금/예금/보험/자동차/부동산/임차보증금/매출금채권/대여금채권/
//   사업용설비/공탁금/(가)압류적립금/예상퇴직금/면제재산/기타)
// PR#1 단계: 카테고리 식별 + 금액성 input 합계만. 상세 매핑은 PR#4.
function parseProperties($: cheerio.CheerioAPI) {
  const sectionHeaders: string[] = [];
  $('h5.popup-title, h4, h3, legend').each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length < 30) sectionHeaders.push(t);
  });

  // 모든 amount input value 수집 (콤마 포함 숫자)
  const amounts: { name: string; value: number }[] = [];
  $('input[type="text"], input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const v = $(el).attr('value') || '';
    const n = num(v);
    if (n > 0 && /money|amount|moneyetc|estatemortgage|autoconversion|cashbigo|deposit|leasemoney|fixtures|guaranty/i.test(name)) {
      amounts.push({ name, value: n });
    }
  });

  // 부동산 (estatesquare/estateposition 비어있지 않으면 소유)
  const hasRealEstate = $('input[name="estatesquare"]').toArray().some(el => ($(el).attr('value') || '').trim() !== '');
  // 면제재산 chk
  const exemptChecked =
    $('input[name="excusecontractchk"][checked], input[name="excuseetcchk"][checked], input[name="excusecopychk"][checked], input[name="excusedecisiondatechk"][checked]').length > 0;
  // (가)압류적립금
  const hasAttachment = $('input[name="attachmentyn"][value="1"], input[name="attachmentcontents"]').toArray().some(el => ($(el).attr('value') || '').trim() !== '');

  return {
    section_headers: sectionHeaders,
    amount_fields: amounts,
    total_amount: amounts.reduce((s, a) => s + a.value, 0),
    raw_field_count: $('input').length,
    has_real_estate: hasRealEstate,
    exempt_property: exemptChecked,
    has_attachment: hasAttachment,
  };
}

// ─── 회생 ─ income 탭 ────────────────────────────────────────────
function parseIncome($: cheerio.CheerioAPI) {
  const g = (name: string) => val($, `[name="${name}"]`);
  return {
    // 변제기간 (P1-1, P1-8, PR-1)
    forcingrepaymentmonth: g('forcingrepaymentmonth'),
    forcingrepaymentmonthoption: g('forcingrepaymentmonthoption'),
    change_forcingrepaymentmonth: g('change_forcingrepaymentmonth'),
    // 소득 (P1-7)
    monthincome: g('monthincome'),
    monthaverageincomemoney: g('monthaverageincomemoney'),
    // 생계비 (PR-3 hotfix Y')
    lowestlivingmoney: g('lowestlivingmoney'),
    lowestlivingmoneyrate: g('lowestlivingmoneyrate'),
    livingmoneycalcumethod: g('livingmoneycalcumethod'),
    modifythecostoflivingenlargedapply: g('modifythecostoflivingenlargedapply'),
    // 라이프니츠 (P1-10)
    leibniz: g('leibniz'),
    except_leibniz: g('except_leibniz'),
    // 가족
    numberDependents: g('numberDependents'),
    // 비교
    comparisonssumprincipalinterest: g('comparisonssumprincipalinterest'),
    estatetotalmoney: g('estatetotalmoney'),
    // 추가 설정
    additionalsetting1: g('additionalsetting1'),
    additionalsetting2: g('additionalsetting2'),
    additionalsetting3: g('additionalsetting3'),
    additionalsetting4: g('additionalsetting4'),
    additionalsetting5: g('additionalsetting5'),
    // 직업
    occupation: g('occupation'),
    age: g('age'),
  };
}

// ─── 회생 ─ affidavit 탭 ─────────────────────────────────────────
function parseAffidavit($: cheerio.CheerioAPI) {
  // textarea 전체 dump (key=name)
  const textareas: Record<string, string> = {};
  $('textarea').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('id') || '';
    if (!name) return;
    const v = $(el).text().trim();
    if (v) textareas[name] = v;
  });

  // 핵심 input 필드
  const g = (name: string) => val($, `[name="${name}"]`);
  return {
    education: g('education'),
    occupation: g('occupation'),
    businesstype: g('businesstype'),
    careerfromdate: g('careerfromdate'),
    careertodate: g('careertodate'),
    bankruptcy: g('bankruptcy'),
    badbank: g('badbank'),
    applicationownhouse: g('applicationownhouse'),
    textareas,
    textarea_count: Object.keys(textareas).length,
  };
}

// ─── 회생 ─ plansection 탭 ───────────────────────────────────────
function parsePlanSections($: cheerio.CheerioAPI) {
  // frmPlanSection1~N form 안의 textarea/content
  const sections: { form: string; content: string }[] = [];
  $('form[id^="frmPlanSection"]').each((_, el) => {
    const form = $(el).attr('id') || '';
    const content = $(el).find('textarea').text().trim();
    sections.push({ form, content });
  });
  // 참고: 별도 textarea content
  const allTextareas = $('textarea').length;
  return { sections, all_textarea_count: allTextareas };
}

// ─── 회생 한 건 파싱 ─────────────────────────────────────────────
function parseRehabCase(n: number) {
  const dir = path.join(REHAB_DIR, String(n));
  if (!fs.existsSync(dir)) return null;
  const $app = readHtml(dir, 'application.html');
  const $cr = readHtml(dir, 'creditors.html');
  const $pr = readHtml(dir, 'properties.html');
  const $in = readHtml(dir, 'income.html');
  const $af = readHtml(dir, 'affidavit.html');
  const $ps = readHtml(dir, 'plansection.html');
  if (!$app || !$cr) return null;
  return {
    n,
    type: 'rehab' as const,
    application: parseApplication($app),
    creditorData: parseCreditors($cr),
    properties: $pr ? parseProperties($pr) : null,
    income: $in ? parseIncome($in) : null,
    affidavit: $af ? parseAffidavit($af) : null,
    planSections: $ps ? parsePlanSections($ps) : null,
  };
}

// ─── 91건 일괄 파싱 + 분포 리포트 ─────────────────────────────────
function main() {
  fs.mkdirSync(path.join(OUT_DIR, 'rehab'), { recursive: true });

  const all: any[] = [];
  for (let n = 1; n <= 90; n++) {
    const c = parseRehabCase(n);
    if (!c) continue;
    all.push(c);
    fs.writeFileSync(path.join(OUT_DIR, 'rehab', `${n}.json`), JSON.stringify(c, null, 2));
  }

  console.log(`✅ 회생 ${all.length}건 파싱 완료`);

  // 분포 리포트
  const courtDist: Record<string, number> = {};
  const classifyDist: Record<string, number> = {};
  const flagDist = { first_repayment: 0, unsettlement_bond: 0, kind_annuity_debt: 0, apply_debt_restructuring: 0, has_separation_right: 0 };
  let totalCreditors = 0;
  let casesWithMissingCourt = 0;
  let casesWithMissingCaseNo = 0;

  for (const c of all) {
    const court = c.application.court_name || '(빈값)';
    courtDist[court] = (courtDist[court] || 0) + 1;
    if (!c.application.court_name) casesWithMissingCourt++;
    if (!c.application.case_number) casesWithMissingCaseNo++;

    for (const cred of c.creditorData.creditors) {
      totalCreditors++;
      const cls = cred.classify || '(빈)';
      classifyDist[cls] = (classifyDist[cls] || 0) + 1;
      if (cred.first_repayment) flagDist.first_repayment++;
      if (cred.unsettlement_bond) flagDist.unsettlement_bond++;
      if (cred.kind_annuity_debt) flagDist.kind_annuity_debt++;
      if (cred.apply_debt_restructuring) flagDist.apply_debt_restructuring++;
      if (cred.has_separation_right) flagDist.has_separation_right++;
    }
  }

  console.log('\n=== 법원명 분포 ===');
  Object.entries(courtDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));
  console.log(`  (법원명 누락: ${casesWithMissingCourt}건, 사건번호 누락: ${casesWithMissingCaseNo}건)`);

  console.log('\n=== 채권자 인격구분 분포 ===');
  Object.entries(classifyDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));

  console.log(`\n=== 채권자 플래그 분포 (총 ${totalCreditors}건) ===`);
  console.log(`  우선변제:        ${flagDist.first_repayment}건`);
  console.log(`  미확정채권:      ${flagDist.unsettlement_bond}건`);
  console.log(`  연금법채무:      ${flagDist.kind_annuity_debt}건`);
  console.log(`  주담대재조정:    ${flagDist.apply_debt_restructuring}건`);
  console.log(`  별제권(부속서류): ${flagDist.has_separation_right}건`);

  // income/properties 분포
  const repayMonthsDist: Record<string, number> = {};
  const repayOptionDist: Record<string, number> = {};
  const livingMethodDist: Record<string, number> = {};
  let propsWithSections = 0;
  let planSectionCounts: number[] = [];
  for (const c of all) {
    if (c.income) {
      const m = c.income.forcingrepaymentmonth || '(빈)';
      repayMonthsDist[m] = (repayMonthsDist[m] || 0) + 1;
      const o = c.income.forcingrepaymentmonthoption || '(빈)';
      repayOptionDist[o] = (repayOptionDist[o] || 0) + 1;
      const l = c.income.livingmoneycalcumethod || '(빈)';
      livingMethodDist[l] = (livingMethodDist[l] || 0) + 1;
    }
    if (c.properties && c.properties.section_headers.length > 0) propsWithSections++;
    if (c.planSections) planSectionCounts.push(c.planSections.sections.length);
  }
  console.log('\n=== forcingrepaymentmonth 분포 ===');
  Object.entries(repayMonthsDist).sort((a, b) => Number(b[0]) - Number(a[0])).forEach(([k, v]) => console.log(`  ${k}개월: ${v}건`));
  console.log('\n=== forcingrepaymentmonthoption 분포 ===');
  Object.entries(repayOptionDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));
  console.log('\n=== livingmoneycalcumethod 분포 ===');
  Object.entries(livingMethodDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}건`));
  console.log(`\n=== properties 섹션 헤더 가진 케이스: ${propsWithSections}/${all.length} ===`);
  console.log(`=== plansection 폼 수 분포: min=${Math.min(...planSectionCounts)} max=${Math.max(...planSectionCounts)} ===`);

  console.log(`\n출력: ${OUT_DIR}/rehab/{1..90}.json`);
}

main();
