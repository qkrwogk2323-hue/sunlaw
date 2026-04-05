/**
 * colaw → Vein Spiral 채권자/수입지출 재추출 스크립트
 *
 * 마이그레이션 시 채권자 추출 버그(select value vs selectedIndex)로
 * 데이터가 누락된 84건을 재추출합니다.
 *
 * 실행 전 준비:
 * 1. npm install puppeteer @supabase/supabase-js
 * 2. colaw.co.kr에 브라우저로 로그인 (쿠키 활성 상태)
 * 3. .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 * 4. ORGANIZATION_ID, CREATED_BY 설정
 *
 * 실행: npx tsx scripts/colaw-migration/re-extract-creditors.ts
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── 설정 ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID!;

const COLAW_BASE = 'https://colaw.co.kr';
const CHROME_DATA_DIR = process.env.CHROME_DATA_DIR || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── colaw 전체 사건 ID 목록 ──────────────────────────────────────
const COLAW_CASES: Record<string, { nm: string; cs: string; rs: string; dy: string }> = {
  '90': { nm: '조재근', cs: '5753816', rs: '221920', dy: '2026' },
  '89': { nm: '최병호', cs: '5748242', rs: '221346', dy: '2026' },
  '88': { nm: '김현태', cs: '5747438', rs: '221267', dy: '2026' },
  '87': { nm: '조영모', cs: '5740175', rs: '220549', dy: '2026' },
  '86': { nm: '이순덕', cs: '5734490', rs: '219894', dy: '2026' },
  '85': { nm: '박수인', cs: '5734023', rs: '219854', dy: '2026' },
  '84': { nm: '김진한', cs: '5733046', rs: '219747', dy: '2026' },
  '83': { nm: '홍광래', cs: '5727917', rs: '219326', dy: '2026' },
  '82': { nm: '김정아', cs: '5727406', rs: '219262', dy: '2026' },
  '81': { nm: '차성혁', cs: '5727302', rs: '219245', dy: '2026' },
  '80': { nm: '이상영', cs: '5724818', rs: '218986', dy: '2026' },
  '79': { nm: '이미애', cs: '5722451', rs: '218758', dy: '2026' },
  '78': { nm: '권은지', cs: '5713260', rs: '217882', dy: '2026' },
  '77': { nm: '김상수', cs: '5711568', rs: '217699', dy: '2026' },
  '76': { nm: '홍성우', cs: '5676905', rs: '214064', dy: '2026' },
  '75': { nm: '안미선', cs: '5674056', rs: '213768', dy: '2026' },
  '74': { nm: '강지성', cs: '5673432', rs: '213685', dy: '2026' },
  '73': { nm: '조병수', cs: '5670298', rs: '213310', dy: '2026' },
  '72': { nm: '이평주', cs: '5665328', rs: '212749', dy: '2026' },
  '71': { nm: '박훈아', cs: '5660474', rs: '212224', dy: '2026' },
  '70': { nm: '김한경', cs: '5640948', rs: '210485', dy: '2025' },
  '69': { nm: '현연수', cs: '5623807', rs: '208635', dy: '2025' },
  '68': { nm: '박복희', cs: '5623380', rs: '208598', dy: '2025' },
  '67': { nm: '이광수', cs: '5622211', rs: '208480', dy: '2025' },
  '66': { nm: '임경애', cs: '5617703', rs: '207962', dy: '2025' },
  '65': { nm: '계승일', cs: '5617214', rs: '207895', dy: '2025' },
  '64': { nm: '이재현', cs: '5615928', rs: '207771', dy: '2025' },
  '63': { nm: '송애리', cs: '5615304', rs: '207680', dy: '2025' },
  '62': { nm: '문연자', cs: '5612352', rs: '207395', dy: '2025' },
  '61': { nm: '전진경', cs: '5608436', rs: '207011', dy: '2025' },
  '60': { nm: '노남희', cs: '5596681', rs: '205807', dy: '2025' },
  '59': { nm: '김태연', cs: '5590724', rs: '205179', dy: '2025' },
  '58': { nm: '이호선', cs: '5589550', rs: '205046', dy: '2025' },
  '57': { nm: '김성민', cs: '5582189', rs: '204219', dy: '2025' },
  '56': { nm: '김도경', cs: '5579147', rs: '203955', dy: '2025' },
  '55': { nm: '유원경', cs: '5574891', rs: '203509', dy: '2025' },
  '54': { nm: '박장수', cs: '5566137', rs: '202599', dy: '2025' },
  '53': { nm: '이다빈', cs: '5563151', rs: '202309', dy: '2025' },
  '52': { nm: '박혜영', cs: '5559096', rs: '201900', dy: '2025' },
  '51': { nm: '정유미', cs: '5549858', rs: '201060', dy: '2025' },
  '50': { nm: '김희정', cs: '5545784', rs: '200617', dy: '2025' },
  '49': { nm: '장다운', cs: '5517922', rs: '197546', dy: '2025' },
  '48': { nm: '강미정', cs: '5514600', rs: '197184', dy: '2025' },
  '47': { nm: '전철홍', cs: '5497856', rs: '195274', dy: '2025' },
  '46': { nm: '이재훈', cs: '5482182', rs: '194058', dy: '2025' },
  '45': { nm: '김란희', cs: '5477191', rs: '193024', dy: '2025' },
  '44': { nm: '이재균', cs: '5476614', rs: '192945', dy: '2025' },
  '43': { nm: '서동재', cs: '5468522', rs: '192061', dy: '2025' },
  '42': { nm: '김태민', cs: '5464273', rs: '191572', dy: '2025' },
  '41': { nm: '이정미', cs: '5462960', rs: '191403', dy: '2025' },
  '40': { nm: '장주철', cs: '5462078', rs: '191290', dy: '2025' },
  '39': { nm: '정현희', cs: '5461317', rs: '191223', dy: '2025' },
  '38': { nm: '신인자', cs: '5460839', rs: '191163', dy: '2025' },
  '37': { nm: '이성운', cs: '5457910', rs: '190919', dy: '2025' },
  '36': { nm: '윤자호', cs: '5441144', rs: '189140', dy: '2025' },
  '35': { nm: '신정희', cs: '5437705', rs: '188770', dy: '2025' },
  '34': { nm: '장은성', cs: '5427908', rs: '187730', dy: '2025' },
  '33': { nm: '김기홍', cs: '5423700', rs: '187285', dy: '2025' },
  '32': { nm: '오호성', cs: '5413446', rs: '186136', dy: '2025' },
  '31': { nm: '정희록', cs: '5396439', rs: '184261', dy: '2025' },
  '30': { nm: '이향화', cs: '5392384', rs: '183917', dy: '2025' },
  '29': { nm: '정길찬', cs: '5391804', rs: '183863', dy: '2025' },
  '28': { nm: '안희수', cs: '5390899', rs: '183759', dy: '2025' },
  '27': { nm: '조두성', cs: '5383025', rs: '182971', dy: '2025' },
  '26': { nm: '조두성', cs: '5382922', rs: '182959', dy: '2025' },
  '25': { nm: '전민규', cs: '5382595', rs: '182928', dy: '2025' },
  '24': { nm: '노정현', cs: '5378177', rs: '182573', dy: '2025' },
  '23': { nm: '김기홍', cs: '5378165', rs: '182540', dy: '2025' },
  '22': { nm: '이성규', cs: '5369234', rs: '181737', dy: '2025' },
  '21': { nm: '김창수', cs: '5362094', rs: '181104', dy: '2025' },
  '20': { nm: '임재룡', cs: '5358761', rs: '180830', dy: '2025' },
  '19': { nm: '한주희', cs: '5356861', rs: '180671', dy: '2025' },
  '18': { nm: '안찬희', cs: '5333778', rs: '178607', dy: '2025' },
  '17': { nm: '전원오', cs: '5328052', rs: '178033', dy: '2025' },
  '16': { nm: '김동주', cs: '5317076', rs: '177033', dy: '2025' },
  '15': { nm: '이진호', cs: '5314738', rs: '177142', dy: '2025' },
  '14': { nm: '이옥주', cs: '5309455', rs: '176211', dy: '2025' },
  '13': { nm: '계승일', cs: '5309230', rs: '176183', dy: '2025' },
  '12': { nm: '이옥주', cs: '5307731', rs: '176028', dy: '2025' },
  '11': { nm: '신주영', cs: '5302714', rs: '175555', dy: '2025' },
  '10': { nm: '주경애', cs: '5297730', rs: '174983', dy: '2025' },
  '9': { nm: '서난명', cs: '5293183', rs: '174516', dy: '2025' },
  '8': { nm: '최덕준', cs: '5291997', rs: '174399', dy: '2025' },
  '7': { nm: '박영림', cs: '5289009', rs: '174076', dy: '2025' },
  '6': { nm: '천성근', cs: '5278553', rs: '173079', dy: '2025' },
  '5': { nm: '전재성', cs: '5275343', rs: '172793', dy: '2025' },
  '4': { nm: '김미영', cs: '5271480', rs: '172419', dy: '2025' },
  '3': { nm: '대인원', cs: '5264566', rs: '171710', dy: '2025' },
  '2': { nm: '임경애', cs: '5264430', rs: '171691', dy: '2025' },
  '1': { nm: '김한경', cs: '5263783', rs: '171636', dy: '2025' },
};

// ─── 재추출 대상: VS case_id → colaw case number ─────────────────
// (금액 검증에서 불일치·미추출로 판정된 84건)
const RE_EXTRACT_TARGETS: { vsId: string; colawN: string }[] = [
  { vsId: '223f93bc-cd19-45f6-b8b3-a9727cad30b4', colawN: '16' },
  { vsId: 'bb0ae469-5090-4842-af88-9adb0ccb7f5a', colawN: '30' },
  { vsId: '1e41b15b-2b5f-4c5d-9a2c-b84edd89d017', colawN: '75' },
  { vsId: '9ce636eb-e614-4453-868c-2434d28510ec', colawN: '17' },
  { vsId: 'd5234638-e7b7-4fbe-8564-6bf398eb16b0', colawN: '60' },
  { vsId: '73dbf9f3-37e5-4054-9f39-6cf95abde6e5', colawN: '39' },
  { vsId: 'b60a4db4-ddd9-4b2b-ab9a-4bce451a4d9e', colawN: '14' },
  { vsId: 'c52769e1-9161-40cd-88c3-0f69f934a5cf', colawN: '48' },
  { vsId: 'a11d8839-25ff-40ee-adf0-82a7a15813f4', colawN: '52' },
  { vsId: 'a9b4a237-7567-4ced-a433-c5ad94cbfbbd', colawN: '20' },
  { vsId: 'de5ff795-95a6-4071-a4ff-1541f9e84b43', colawN: '59' },
  { vsId: 'f61f72bf-7afe-4247-b90b-eac5172acdfe', colawN: '89' },
  { vsId: 'a8088ec2-57e2-42cf-8bfb-0ae2f0351a59', colawN: '70' },
  { vsId: '56e0078b-a570-4327-8687-4f8d5a7facb0', colawN: '57' },
  { vsId: '1494c47a-809b-4749-8d58-23ee2efd791a', colawN: '80' },
  { vsId: '5aaae923-2010-4f46-b1bd-35a6908fc1f9', colawN: '71' },
  { vsId: 'ec47fb4f-9c89-4f79-aac5-0e438ab4f7f9', colawN: '6' },
  { vsId: '8a43ce1d-1359-4d45-a4ef-250314ed0973', colawN: '2' },
  { vsId: '073ddac9-7881-44c5-ba70-14b4a0313e20', colawN: '10' },
  { vsId: '72d94a47-5b69-416c-b010-b0e0c85d0c0e', colawN: '90' },
  { vsId: 'e8c74caf-1e93-4ca9-a39a-542c71cd4c7b', colawN: '45' },
  { vsId: '6d6bb8a2-b56f-4580-aa12-46ba8e76e02a', colawN: '23' },
  { vsId: '342fc813-cc88-4e93-b6aa-f8540b045b83', colawN: '62' },
  { vsId: 'c0a3d68b-2002-4f17-99a4-5d9f823c4d9d', colawN: '24' },
  // 나머지는 main()에서 자동 감지 모드로 추가 처리
];

// ─── 유틸 ─────────────────────────────────────────────────────────
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function caseUrl(cs: string, dy: string, rs: string) {
  return `${COLAW_BASE}/rescureManage/popupRescureApplication?casebasicsseq=${cs}&diaryyear=${dy}&resurapplicationpersonseq=${rs}&tabname=application&division=case`;
}

// ─── 채권자 재추출 (수정된 로직) ──────────────────────────────────
async function extractCreditors(page: Page, cs: string, dy: string, rs: string) {
  await page.goto(caseUrl(cs, dy, rs), { waitUntil: 'networkidle2' });
  await delay(1500);

  // 채권자 탭 클릭
  await page.evaluate(() => {
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a, [role="tab"]');
    for (const t of allLinks) {
      if (t.textContent?.trim() === '채권자') { t.click(); break; }
    }
  });
  await delay(3000);

  // 합계
  const summary = await page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    return {
      total_debt: g('nowtotalsum'),
      secured_debt: g('dambosum'),
      unsecured_debt: g('nodambosum'),
    };
  });

  // option 목록 가져오기
  const optionValues = await page.evaluate(() => {
    const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
    if (!sel) return [];
    return Array.from(sel.options).map((o, i) => ({ index: i, value: o.value, text: o.textContent?.trim() ?? '' }));
  });

  const creditors: any[] = [];
  for (const opt of optionValues) {
    await page.evaluate((idx) => {
      const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
      if (sel) {
        sel.selectedIndex = idx;
        if (typeof (window as any).jQuery !== 'undefined') {
          (window as any).jQuery(sel).trigger('change');
        } else {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, opt.index);
    await delay(1500);

    const cred = await page.evaluate(() => {
      const g = (name: string) => {
        const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
        return el?.value?.trim() ?? '';
      };
      return {
        bond_number: g('bondnumber'),
        classify: g('classify'),
        creditor_name: g('bondname'),
        postal_code: g('zipcode'),
        address: g('address'),
        phone: g('tel'),
        fax: g('fax'),
        bond_cause: g('bondcause'),
        capital: g('capital'),
        capital_compute: g('capitalcompute'),
        interest: g('interest'),
        interest_compute: g('interestcompute'),
        bond_content: g('bondcontent'),
      };
    });
    if (cred.creditor_name) {
      creditors.push(cred);
    }
  }

  return { summary, creditors };
}

// ─── 수입지출 재추출 ──────────────────────────────────────────────
async function extractIncome(page: Page, cs: string, dy: string, rs: string) {
  await page.goto(caseUrl(cs, dy, rs), { waitUntil: 'networkidle2' });
  await delay(1500);

  await page.evaluate(() => {
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a, [role="tab"]');
    for (const t of allLinks) {
      const txt = t.textContent?.trim() ?? '';
      if (txt.includes('수입지출') || txt.includes('변제기간')) { t.click(); return; }
    }
    const tabItems = document.querySelectorAll<HTMLAnchorElement>('.nav-tabs li a, .tab-nav a');
    if (tabItems.length > 3) tabItems[3].click();
  });
  await delay(3000);

  return page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    const tryGet = (...names: string[]) => {
      for (const name of names) { const v = g(name); if (v) return v; }
      return '';
    };
    return {
      gross_salary: tryGet('monthlyincomeamount', 'grosssalary', 'monthincome'),
      net_salary: tryGet('tagyeosalary', 'netsalary', 'realincome'),
      living_cost: tryGet('livingcost', 'livingexpense', 'monthlyliving'),
      extra_living_cost: tryGet('extralivingcost', 'additionallivingexpense'),
      child_support: tryGet('childsupport', 'childeducation'),
      trustee_comm_rate: tryGet('trusteecommrate', 'commissionrate'),
      repay_months: tryGet('repayperiod', 'repaymentmonths'),
      family_count: tryGet('familycount', 'householdcount'),
      total_debt_alt: tryGet('nowtotalsum', 'totalsumamount'),
      secured_debt_alt: tryGet('dambosum', 'securedsum'),
      unsecured_debt_alt: tryGet('nodambosum', 'unsecuredsum'),
    };
  });
}

// ─── DB 업데이트 ──────────────────────────────────────────────────
async function updateCase(
  vsId: string,
  creditorData: Awaited<ReturnType<typeof extractCreditors>>,
  income: Awaited<ReturnType<typeof extractIncome>>,
) {
  // 1) 기존 채권자 soft delete
  await supabase
    .from('rehabilitation_creditors')
    .update({ lifecycle_status: 'soft_deleted' })
    .eq('case_id', vsId);

  // 2) 새 채권자 삽입
  for (const cred of creditorData.creditors) {
    await supabase.from('rehabilitation_creditors').insert({
      case_id: vsId,
      organization_id: ORGANIZATION_ID,
      bond_number: parseInt(cred.bond_number) || 0,
      classify: cred.classify === '법인' ? '법인' : '자연인',
      creditor_name: cred.creditor_name,
      postal_code: cred.postal_code,
      address: cred.address,
      phone: cred.phone,
      fax: cred.fax,
      bond_cause: cred.bond_cause,
      capital: parseAmount(cred.capital),
      capital_compute: cred.capital_compute,
      interest: parseAmount(cred.interest),
      interest_compute: cred.interest_compute,
      bond_content: cred.bond_content,
    });
  }

  // 3) 수입지출 업데이트
  const totalDebt = parseAmount(creditorData.summary.total_debt) || parseAmount(income.total_debt_alt);
  const securedDebt = parseAmount(creditorData.summary.secured_debt) || parseAmount(income.secured_debt_alt);
  const unsecuredDebt = parseAmount(creditorData.summary.unsecured_debt) || parseAmount(income.unsecured_debt_alt);

  await supabase
    .from('rehabilitation_income_settings')
    .update({
      gross_salary: parseAmount(income.gross_salary),
      net_salary: parseAmount(income.net_salary),
      living_cost: parseAmount(income.living_cost),
      extra_living_cost: parseAmount(income.extra_living_cost),
      child_support: parseAmount(income.child_support),
      trustee_comm_rate: parseFloat(income.trustee_comm_rate) || 0,
      repay_months: parseInt(income.repay_months) || 60,
      total_debt: totalDebt,
      secured_debt: securedDebt,
      unsecured_debt: unsecuredDebt,
    })
    .eq('case_id', vsId);

  return { creditorCount: creditorData.creditors.length, totalDebt };
}

// ─── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 colaw → Vein Spiral 채권자/수입지출 재추출');
  console.log(`📋 대상: ${RE_EXTRACT_TARGETS.length}건\n`);

  const browser: Browser = await puppeteer.launch({
    headless: false,
    userDataDir: CHROME_DATA_DIR || undefined,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // colaw 로그인 확인
  await page.goto(`${COLAW_BASE}/documentManage/rescurMainList`, { waitUntil: 'networkidle2' });
  const isLoggedIn = await page.evaluate(() => document.body.textContent?.includes('Total'));
  if (!isLoggedIn) {
    console.error('❌ colaw 로그인 필요. 브라우저에서 수동 로그인 후 재실행.');
    await browser.close();
    return;
  }
  console.log('✅ colaw 로그인 확인\n');

  const results: { vsId: string; name: string; ok: boolean; creditors?: number; totalDebt?: number; error?: string }[] = [];
  const logPath = path.join(__dirname, 're-extract-log.json');

  for (const target of RE_EXTRACT_TARGETS) {
    const colawCase = COLAW_CASES[target.colawN];
    if (!colawCase) {
      console.error(`❌ colaw case #${target.colawN} not found`);
      results.push({ vsId: target.vsId, name: '?', ok: false, error: 'colaw case not found' });
      continue;
    }

    console.log(`── [#${target.colawN}] ${colawCase.nm} → ${target.vsId.substring(0, 8)} ──`);
    try {
      const creditorData = await extractCreditors(page, colawCase.cs, colawCase.dy, colawCase.rs);
      console.log(`  ✓ 채권자 ${creditorData.creditors.length}건, 합계: ${creditorData.summary.total_debt}`);

      const income = await extractIncome(page, colawCase.cs, colawCase.dy, colawCase.rs);
      console.log(`  ✓ 수입지출`);

      const result = await updateCase(target.vsId, creditorData, income);
      console.log(`  ✅ 완료: ${result.creditorCount}건, 총채무: ${result.totalDebt.toLocaleString()}`);

      results.push({ vsId: target.vsId, name: colawCase.nm, ok: true, creditors: result.creditorCount, totalDebt: result.totalDebt });
    } catch (err: any) {
      console.error(`  ❌ 오류: ${err.message}`);
      results.push({ vsId: target.vsId, name: colawCase.nm, ok: false, error: err.message });
    }

    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  }

  console.log('\n\n═══ 재추출 완료 ═══');
  console.log(`성공: ${results.filter(r => r.ok).length}건`);
  console.log(`실패: ${results.filter(r => !r.ok).length}건`);
  console.log(`로그: ${logPath}`);

  await browser.close();
}

main().catch(console.error);
