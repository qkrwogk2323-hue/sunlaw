/**
 * colaw → Vein Spiral 개인회생 사건 마이그레이션 스크립트
 *
 * 실행 전 준비:
 * 1. npm install puppeteer @supabase/supabase-js
 * 2. colaw.co.kr에 브라우저로 로그인 (쿠키 활성 상태)
 * 3. .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
 * 4. ORGANIZATION_ID, CREATED_BY (프로필 uuid) 설정
 *
 * 실행: npx tsx scripts/colaw-migration/migrate-colaw-to-vs.ts
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── 설정 ────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ORGANIZATION_ID = process.env.ORGANIZATION_ID!;
const CREATED_BY = process.env.CREATED_BY!;

const COLAW_BASE = 'https://colaw.co.kr';
const CHROME_DATA_DIR = process.env.CHROME_DATA_DIR || ''; // Chrome 프로필 경로 (쿠키 재활용)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── colaw 전체 사건 ID 목록 (90건) ──────────────────────────────
const COLAW_CASES = [
  { n: '90', nm: '조재근', cs: '5753816', rs: '221920', dy: '2026' },
  { n: '89', nm: '최병호', cs: '5748242', rs: '221346', dy: '2026' },
  { n: '88', nm: '김현태', cs: '5747438', rs: '221267', dy: '2026' },
  { n: '87', nm: '조영모', cs: '5740175', rs: '220549', dy: '2026' },
  { n: '86', nm: '이순덕', cs: '5734490', rs: '219894', dy: '2026' },
  { n: '85', nm: '박수인', cs: '5734023', rs: '219854', dy: '2026' },
  { n: '84', nm: '김진한', cs: '5733046', rs: '219747', dy: '2026' },
  { n: '83', nm: '홍광래', cs: '5727917', rs: '219326', dy: '2026' },
  { n: '82', nm: '김정아', cs: '5727406', rs: '219262', dy: '2026' },
  { n: '81', nm: '차성혁', cs: '5727302', rs: '219245', dy: '2026' },
  { n: '80', nm: '이상영', cs: '5724818', rs: '218986', dy: '2026' },
  { n: '79', nm: '이미애', cs: '5722451', rs: '218758', dy: '2026' },
  { n: '78', nm: '권은지', cs: '5713260', rs: '217882', dy: '2026' },
  { n: '77', nm: '김상수', cs: '5711568', rs: '217699', dy: '2026' },
  { n: '76', nm: '홍성우', cs: '5676905', rs: '214064', dy: '2026' },
  { n: '75', nm: '안미선', cs: '5674056', rs: '213768', dy: '2026' },
  { n: '74', nm: '강지성', cs: '5673432', rs: '213685', dy: '2026' },
  { n: '73', nm: '조병수', cs: '5670298', rs: '213310', dy: '2026' },
  { n: '72', nm: '이평주', cs: '5665328', rs: '212749', dy: '2026' },
  { n: '71', nm: '박훈아', cs: '5660474', rs: '212224', dy: '2026' },
  { n: '70', nm: '김한경', cs: '5640948', rs: '210485', dy: '2025' },
  { n: '69', nm: '현연수', cs: '5623807', rs: '208635', dy: '2025' },
  { n: '68', nm: '박복희', cs: '5623380', rs: '208598', dy: '2025' },
  { n: '67', nm: '이광수', cs: '5622211', rs: '208480', dy: '2025' },
  { n: '66', nm: '임경애', cs: '5617703', rs: '207962', dy: '2025' },
  { n: '65', nm: '계승일', cs: '5617214', rs: '207895', dy: '2025' },
  { n: '64', nm: '이재현', cs: '5615928', rs: '207771', dy: '2025' },
  { n: '63', nm: '송애리', cs: '5615304', rs: '207680', dy: '2025' },
  { n: '62', nm: '문연자', cs: '5612352', rs: '207395', dy: '2025' },
  { n: '61', nm: '전진경', cs: '5608436', rs: '207011', dy: '2025' },
  { n: '60', nm: '노남희', cs: '5596681', rs: '205807', dy: '2025' },
  { n: '59', nm: '김태연', cs: '5590724', rs: '205179', dy: '2025' },
  { n: '58', nm: '이호선', cs: '5589550', rs: '205046', dy: '2025' },
  { n: '57', nm: '김성민', cs: '5582189', rs: '204219', dy: '2025' },
  { n: '56', nm: '김도경', cs: '5579147', rs: '203955', dy: '2025' },
  { n: '55', nm: '유원경', cs: '5574891', rs: '203509', dy: '2025' },
  { n: '54', nm: '박장수', cs: '5566137', rs: '202599', dy: '2025' },
  { n: '53', nm: '이다빈', cs: '5563151', rs: '202309', dy: '2025' },
  { n: '52', nm: '박혜영', cs: '5559096', rs: '201900', dy: '2025' },
  { n: '51', nm: '정유미', cs: '5549858', rs: '201060', dy: '2025' },
  { n: '50', nm: '김희정', cs: '5545784', rs: '200617', dy: '2025' },
  { n: '49', nm: '장다운', cs: '5517922', rs: '197546', dy: '2025' },
  { n: '48', nm: '강미정', cs: '5514600', rs: '197184', dy: '2025' },
  { n: '47', nm: '전철홍', cs: '5497856', rs: '195274', dy: '2025' },
  { n: '46', nm: '이재훈', cs: '5482182', rs: '194058', dy: '2025' },
  { n: '45', nm: '김란희', cs: '5477191', rs: '193024', dy: '2025' },
  { n: '44', nm: '이재균', cs: '5476614', rs: '192945', dy: '2025' },
  { n: '43', nm: '서동재', cs: '5468522', rs: '192061', dy: '2025' },
  { n: '42', nm: '김태민', cs: '5464273', rs: '191572', dy: '2025' },
  { n: '41', nm: '이정미', cs: '5462960', rs: '191403', dy: '2025' },
  { n: '40', nm: '장주철', cs: '5462078', rs: '191290', dy: '2025' },
  { n: '39', nm: '정현희', cs: '5461317', rs: '191223', dy: '2025' },
  { n: '38', nm: '신인자', cs: '5460839', rs: '191163', dy: '2025' },
  { n: '37', nm: '이성운', cs: '5457910', rs: '190919', dy: '2025' },
  { n: '36', nm: '윤자호', cs: '5441144', rs: '189140', dy: '2025' },
  { n: '35', nm: '신정희', cs: '5437705', rs: '188770', dy: '2025' },
  { n: '34', nm: '장은성', cs: '5427908', rs: '187730', dy: '2025' },
  { n: '33', nm: '김기홍', cs: '5423700', rs: '187285', dy: '2025' },
  { n: '32', nm: '오호성', cs: '5413446', rs: '186136', dy: '2025' },
  { n: '31', nm: '정희록', cs: '5396439', rs: '184261', dy: '2025' },
  { n: '30', nm: '이향화', cs: '5392384', rs: '183917', dy: '2025' },
  { n: '29', nm: '정길찬', cs: '5391804', rs: '183863', dy: '2025' },
  { n: '28', nm: '안희수', cs: '5390899', rs: '183759', dy: '2025' },
  { n: '27', nm: '조두성', cs: '5383025', rs: '182971', dy: '2025' },
  { n: '26', nm: '조두성', cs: '5382922', rs: '182959', dy: '2025' },
  { n: '25', nm: '전민규', cs: '5382595', rs: '182928', dy: '2025' },
  { n: '24', nm: '노정현', cs: '5378177', rs: '182573', dy: '2025' },
  { n: '23', nm: '김기홍', cs: '5378165', rs: '182540', dy: '2025' },
  { n: '22', nm: '이성규', cs: '5369234', rs: '181737', dy: '2025' },
  { n: '21', nm: '김창수', cs: '5362094', rs: '181104', dy: '2025' },
  { n: '20', nm: '임재룡', cs: '5358761', rs: '180830', dy: '2025' },
  { n: '19', nm: '한주희', cs: '5356861', rs: '180671', dy: '2025' },
  { n: '18', nm: '안찬희', cs: '5333778', rs: '178607', dy: '2025' },
  { n: '17', nm: '전원오', cs: '5328052', rs: '178033', dy: '2025' },
  { n: '16', nm: '김동주', cs: '5317076', rs: '177033', dy: '2025' },
  { n: '15', nm: '이진호', cs: '5314738', rs: '177142', dy: '2025' },
  { n: '14', nm: '이옥주', cs: '5309455', rs: '176211', dy: '2025' },
  { n: '13', nm: '계승일', cs: '5309230', rs: '176183', dy: '2025' },
  { n: '12', nm: '이옥주', cs: '5307731', rs: '176028', dy: '2025' },
  { n: '11', nm: '신주영', cs: '5302714', rs: '175555', dy: '2025' },
  { n: '10', nm: '주경애', cs: '5297730', rs: '174983', dy: '2025' },
  { n: '9', nm: '서난명', cs: '5293183', rs: '174516', dy: '2025' },
  { n: '8', nm: '최덕준', cs: '5291997', rs: '174399', dy: '2025' },
  { n: '7', nm: '박영림', cs: '5289009', rs: '174076', dy: '2025' },
  { n: '6', nm: '천성근', cs: '5278553', rs: '173079', dy: '2025' },
  { n: '5', nm: '전재성', cs: '5275343', rs: '172793', dy: '2025' },
  { n: '4', nm: '김미영', cs: '5271480', rs: '172419', dy: '2025' },
  { n: '3', nm: '대인원', cs: '5264566', rs: '171710', dy: '2025' },
  { n: '2', nm: '임경애', cs: '5264430', rs: '171691', dy: '2025' },
  { n: '1', nm: '김한경', cs: '5263783', rs: '171636', dy: '2025' },
];

// ─── 유틸 ─────────────────────────────────────────────────────────
function parseAmount(s: string): number {
  if (!s) return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function caseUrl(cs: string, dy: string, rs: string, tab: string) {
  return `${COLAW_BASE}/rescureManage/popupRescureApplication?casebasicsseq=${cs}&diaryyear=${dy}&resurapplicationpersonseq=${rs}&tabname=${tab}&division=case`;
}

// ─── 1) 신청인 탭 추출 ───────────────────────────────────────────
async function extractApplication(page: Page, c: (typeof COLAW_CASES)[0]) {
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1000);

  return page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    const gc = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.checked ?? false;
    };
    const gr = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]:checked`);
      return el?.value?.trim() ?? '';
    };
    // 사건번호·법원명 추출: 페이지 상단 헤더에서 "인천지방법원 2025 개회 101101" 패턴 탐색
    const headerText = document.querySelector('.header, .case-header, h2, h3, .title')?.textContent?.trim() ?? '';
    // colaw 제목 영역에서 법원명과 사건번호를 추출
    const caseInfoMatch = headerText.match(/([\w가-힣]+(?:법원|회생법원))\s+(\d{4}\s*개회\s*\d+)/);
    const courtName = caseInfoMatch?.[1] ?? '';
    const caseNumber = caseInfoMatch?.[2] ?? '';

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
      income_type: gr('incomegubun'), // '1'=급여, '2'=영업
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
      agent_gubun: gr('agentgubun'), // '1'=법무사 등
      agent_law_firm: g('agentlawfirm') || g('companydeliveryname'),
      company_delivery_name: g('companydeliveryname'),
      net_salary: g('tagyeosalary'),       // 월 급여 (세후)
      gross_salary: g('monthlyincomeamount'), // 월 급여 (세전)
      court_name: courtName,
      case_number: caseNumber,
    };
  });
}

// ─── 2) 채권자 탭 추출 ───────────────────────────────────────────
async function extractCreditors(page: Page, c: (typeof COLAW_CASES)[0]) {
  // 신청인 탭에서 채권자 탭으로 이동
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1000);

  // 채권자 탭 클릭 (AJAX 로딩) — jQuery 이벤트 트리거 포함
  await page.evaluate(() => {
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a, [role="tab"], .tab-link');
    for (const t of allLinks) {
      if (t.textContent?.trim() === '채권자') {
        t.click();
        break;
      }
    }
  });
  await delay(3000); // AJAX 대기 증가 (2s → 3s)

  // 채권 합계
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

  // 각 채권자 레코드 추출 — 채권자 목록은 반복 form 구조
  // colaw는 채권자를 하나씩 표시하므로, creditor-add-list 셀렉트로 순회
  // 주의: option value는 순차 정수가 아니라 채권자 seq ID이므로 selectedIndex 사용
  const optionValues = await page.evaluate(() => {
    const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
    if (!sel) return [];
    return Array.from(sel.options).map((o, i) => ({
      index: i,
      value: o.value,
      text: o.textContent?.trim() ?? '',
    }));
  });

  const creditors: any[] = [];
  for (const opt of optionValues) {
    // selectedIndex로 정확히 선택 + jQuery trigger로 AJAX 호출 보장
    await page.evaluate((idx) => {
      const sel = document.querySelector<HTMLSelectElement>('[name="creditor-add-list"]');
      if (sel) {
        sel.selectedIndex = idx;
        // jQuery change 이벤트 + native change 이벤트 모두 발생
        if (typeof (window as any).jQuery !== 'undefined') {
          (window as any).jQuery(sel).trigger('change');
        } else {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, opt.index);
    await delay(1500); // AJAX 로딩 대기 시간 증가 (500ms → 1500ms)

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
    // 빈 채권자 스킵 (이름이 없으면 placeholder option)
    if (cred.creditor_name) {
      creditors.push(cred);
    }
  }

  return { summary, creditors };
}

// ─── 3) 재산 탭 추출 ─────────────────────────────────────────────
async function extractProperties(page: Page, c: (typeof COLAW_CASES)[0]) {
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.evaluate(() => {
    const tabs = document.querySelectorAll<HTMLAnchorElement>('a');
    for (const t of tabs) {
      if (t.textContent?.trim() === '재산') { t.click(); break; }
    }
  });
  await delay(2000);

  return page.evaluate(() => {
    // 재산 목록은 테이블 기반
    const rows = document.querySelectorAll('table tbody tr');
    const items: any[] = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 4) {
        const category = cells[0]?.textContent?.trim() ?? '';
        const detail = cells[1]?.textContent?.trim() ?? '';
        const amount = cells[2]?.textContent?.trim() ?? '';
        items.push({ category, detail, amount });
      }
    });
    return items;
  });
}

// ─── 4) 수입지출/변제기간 탭 추출 ────────────────────────────────
async function extractIncome(page: Page, c: (typeof COLAW_CASES)[0]) {
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1500);

  // 탭 클릭: 정확한 탭 선택 (텍스트 includes 대신 더 넓은 범위 탐색)
  await page.evaluate(() => {
    // 먼저 정확한 탭 링크 시도
    const allLinks = document.querySelectorAll<HTMLAnchorElement>('a, [role="tab"], .tab-link, li[data-tab]');
    for (const t of allLinks) {
      const txt = t.textContent?.trim() ?? '';
      if (txt.includes('수입지출') || txt.includes('변제기간')) {
        t.click();
        return true;
      }
    }
    // fallback: 4번째 탭 (0:신청인, 1:채권자, 2:재산, 3:수입지출/변제기간)
    const tabItems = document.querySelectorAll<HTMLAnchorElement>('.nav-tabs li a, .tab-nav a');
    if (tabItems.length > 3) {
      tabItems[3].click();
      return true;
    }
    return false;
  });
  await delay(3000); // AJAX 대기 시간 대폭 증가 (2s → 3s)

  // 데이터 추출 + 채권 합계도 이 탭에서 다시 시도
  return page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    // 여러 가능한 필드명을 시도 (colaw 버전에 따라 다를 수 있음)
    const tryGet = (...names: string[]) => {
      for (const name of names) {
        const val = g(name);
        if (val) return val;
      }
      return '';
    };
    return {
      gross_salary: tryGet('monthlyincomeamount', 'grosssalary', 'monthincome'),
      net_salary: tryGet('tagyeosalary', 'netsalary', 'realincome'),
      living_cost: tryGet('livingcost', 'livingexpense', 'monthlyliving'),
      extra_living_cost: tryGet('extralivingcost', 'additionallivingexpense', 'extraliving'),
      child_support: tryGet('childsupport', 'childeducation'),
      trustee_comm_rate: tryGet('trusteecommrate', 'commissionrate'),
      repay_months: tryGet('repayperiod', 'repaymentmonths', 'paymentperiod'),
      family_count: tryGet('familycount', 'householdcount', 'familymember'),
      // 채권 합계 (채권자 탭에서 못 가져온 경우를 대비)
      total_debt_alt: tryGet('nowtotalsum', 'totalsumamount'),
      secured_debt_alt: tryGet('dambosum', 'securedsum'),
      unsecured_debt_alt: tryGet('nodambosum', 'unsecuredsum'),
    };
  });
}

// ─── 5) 진술서 탭 추출 ───────────────────────────────────────────
async function extractAffidavit(page: Page, c: (typeof COLAW_CASES)[0]) {
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.evaluate(() => {
    const tabs = document.querySelectorAll<HTMLAnchorElement>('a');
    for (const t of tabs) {
      if (t.textContent?.trim() === '진술서') { t.click(); break; }
    }
  });
  await delay(2000);

  return page.evaluate(() => {
    const g = (name: string) => {
      const el = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`[name="${name}"]`);
      return el?.value?.trim() ?? '';
    };
    return {
      debt_history: g('debthistory') || g('debtreason'),
      property_change: g('propertychange'),
      income_change: g('incomechange'),
      living_situation: g('livingsituation'),
      repay_feasibility: g('repayfeasibility'),
    };
  });
}

// ─── 6) 변제계획안 10항 추출 ──────────────────────────────────────
async function extractPlanSections(page: Page, c: (typeof COLAW_CASES)[0]) {
  await page.goto(caseUrl(c.cs, c.dy, c.rs, 'application'), { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.evaluate(() => {
    const tabs = document.querySelectorAll<HTMLAnchorElement>('a');
    for (const t of tabs) {
      if (t.textContent?.includes('변제계획안10항')) { t.click(); break; }
    }
  });
  await delay(2000);

  return page.evaluate(() => {
    const sections: { section_number: number; content: string }[] = [];
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    textareas.forEach((ta, idx) => {
      sections.push({
        section_number: idx + 1,
        content: ta.value?.trim() ?? '',
      });
    });
    return sections;
  });
}

// ─── DB 삽입 ──────────────────────────────────────────────────────
async function insertCase(
  caseData: {
    colawCase: (typeof COLAW_CASES)[0];
    application: Awaited<ReturnType<typeof extractApplication>>;
    creditorData: Awaited<ReturnType<typeof extractCreditors>>;
    properties: Awaited<ReturnType<typeof extractProperties>>;
    income: Awaited<ReturnType<typeof extractIncome>>;
    affidavit: Awaited<ReturnType<typeof extractAffidavit>>;
    planSections: Awaited<ReturnType<typeof extractPlanSections>>;
  }
) {
  const { colawCase, application, creditorData, properties, income, affidavit, planSections } = caseData;
  const app = application;

  // 주민번호 분리
  const [rrnFront, rrnBack] = (app.resident_number || '').split('-');

  // 1) cases 테이블에 사건 생성
  const refNo = `COLAW-${colawCase.n.padStart(3, '0')}`;
  const { data: caseRow, error: caseErr } = await supabase
    .from('cases')
    .insert({
      organization_id: ORGANIZATION_ID,
      title: `${app.applicant_name} 개인회생`,
      reference_no: refNo,
      case_type: 'insolvency',
      insolvency_subtype: 'individual_rehabilitation',
      case_status: 'intake',
      lifecycle_status: 'active',
      stage_template_key: 'general-default',
      stage_key: 'intake',
      module_flags: { billing: true, insolvency: true },
      court_name: app.court_name || '인천지방법원',
      case_number: app.case_number || `${colawCase.dy} 개회`,
      summary: `colaw #${colawCase.n} ${colawCase.nm} 마이그레이션`,
      created_by: CREATED_BY,
      updated_by: CREATED_BY,
    })
    .select('id')
    .single();

  if (caseErr) {
    console.error(`❌ [${colawCase.n}] ${colawCase.nm} — cases insert failed:`, caseErr.message);
    return null;
  }
  const caseId = caseRow.id;
  console.log(`✅ [${colawCase.n}] ${colawCase.nm} — case created: ${caseId}`);

  // 2) rehabilitation_applications
  const { error: appErr } = await supabase.from('rehabilitation_applications').insert({
    organization_id: ORGANIZATION_ID,
    case_id: caseId,
    applicant_name: app.applicant_name,
    resident_number_front: rrnFront,
    resident_number_hash: rrnBack, // 운영 시 해시 변환 필요
    registered_address: {
      postal_code: app.registered_zip,
      address: app.registered_address,
    },
    current_address: {
      postal_code: app.current_zip,
      address: app.current_address,
    },
    office_address: {
      postal_code: app.office_zip,
      address: app.office_address,
    },
    service_address: {
      postal_code: app.delivery_zip,
      address: app.delivery_address,
    },
    service_recipient: app.delivery_recipient,
    phone_home: app.phone_home,
    phone_mobile: app.phone_mobile,
    return_account: app.return_account,
    income_type: app.income_type === '1' ? 'salary' : 'business',
    employer_name: app.employer_name,
    position: app.position,
    work_period: app.work_period,
    application_date: app.application_date || null,
    repayment_start_date: app.repayment_start_date || null,
    agent_type: app.agent_gubun === '1' ? '법무사' : app.agent_gubun === '2' ? '변호사' : '기타',
    agent_name: app.agent_name,
    agent_law_firm: app.agent_law_firm || null,
    agent_phone: app.agent_tel,
    agent_fax: app.agent_fax,
    agent_email: app.agent_email,
    agent_address: {
      postal_code: app.agent_zip,
      address: app.agent_address,
    },
    created_by: CREATED_BY,
  });
  if (appErr) console.error(`  ⚠ rehabilitation_applications:`, appErr.message);

  // 3) rehabilitation_creditor_settings
  const { error: credSetErr } = await supabase.from('rehabilitation_creditor_settings').insert({
    case_id: caseId,
    repay_type: 'sequential',
  });
  if (credSetErr) console.error(`  ⚠ creditor_settings:`, credSetErr.message);

  // 4) rehabilitation_creditors
  for (const cred of creditorData.creditors) {
    const { error: credErr } = await supabase.from('rehabilitation_creditors').insert({
      case_id: caseId,
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
    if (credErr) console.error(`  ⚠ creditor ${cred.creditor_name}:`, credErr.message);
  }

  // 5) rehabilitation_properties
  for (const prop of properties) {
    if (prop.detail || parseAmount(prop.amount) > 0) {
      const { error: propErr } = await supabase.from('rehabilitation_properties').insert({
        case_id: caseId,
        category: prop.category,
        detail: prop.detail,
        amount: parseAmount(prop.amount),
      });
      if (propErr) console.error(`  ⚠ property ${prop.category}:`, propErr.message);
    }
  }

  // 6) rehabilitation_income_settings
  // 채권 합계: 채권자 탭에서 가져온 값 우선, 없으면 수입지출 탭에서 가져온 대체 값 사용
  const totalDebt = parseAmount(creditorData.summary.total_debt) || parseAmount(income.total_debt_alt);
  const securedDebt = parseAmount(creditorData.summary.secured_debt) || parseAmount(income.secured_debt_alt);
  const unsecuredDebt = parseAmount(creditorData.summary.unsecured_debt) || parseAmount(income.unsecured_debt_alt);

  const { error: incomeErr } = await supabase.from('rehabilitation_income_settings').insert({
    case_id: caseId,
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
  });
  if (incomeErr) console.error(`  ⚠ income_settings:`, incomeErr.message);

  // 7) rehabilitation_affidavits
  if (affidavit.debt_history || affidavit.living_situation) {
    const { error: affErr } = await supabase.from('rehabilitation_affidavits').insert({
      case_id: caseId,
      debt_history: affidavit.debt_history,
      property_change: affidavit.property_change,
      income_change: affidavit.income_change,
      living_situation: affidavit.living_situation,
      repay_feasibility: affidavit.repay_feasibility,
    });
    if (affErr) console.error(`  ⚠ affidavit:`, affErr.message);
  }

  // 8) rehabilitation_plan_sections
  for (const sec of planSections) {
    if (sec.content) {
      const { error: planErr } = await supabase.from('rehabilitation_plan_sections').insert({
        case_id: caseId,
        section_number: sec.section_number,
        content: sec.content,
      });
      if (planErr) console.error(`  ⚠ plan_section ${sec.section_number}:`, planErr.message);
    }
  }

  return caseId;
}

// ─── 재마이그레이션: 기존 사건의 채권자·수입지출만 업데이트 ────────
async function reExtractCase(
  page: Page,
  c: (typeof COLAW_CASES)[0],
  existingCaseId: string,
) {
  console.log(`  🔄 재추출: ${c.nm} (${existingCaseId.substring(0, 8)})`);

  // 1) 채권자 재추출
  const creditorData = await extractCreditors(page, c);
  console.log(`    ✓ 채권자: ${creditorData.creditors.length}건`);

  // 2) 수입지출 재추출
  const income = await extractIncome(page, c);
  console.log(`    ✓ 수입지출`);

  // 3) 기존 채권자 soft delete
  const { error: delErr } = await supabase
    .from('rehabilitation_creditors')
    .update({ lifecycle_status: 'soft_deleted' })
    .eq('case_id', existingCaseId);
  if (delErr) console.error(`    ⚠ 기존 채권자 soft_delete 실패:`, delErr.message);

  // 4) 새 채권자 삽입
  for (const cred of creditorData.creditors) {
    const { error: credErr } = await supabase.from('rehabilitation_creditors').insert({
      case_id: existingCaseId,
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
    if (credErr) console.error(`    ⚠ creditor ${cred.creditor_name}:`, credErr.message);
  }

  // 5) 수입지출 upsert (총채무 포함)
  const totalDebt = parseAmount(creditorData.summary.total_debt) || parseAmount(income.total_debt_alt);
  const securedDebt = parseAmount(creditorData.summary.secured_debt) || parseAmount(income.secured_debt_alt);
  const unsecuredDebt = parseAmount(creditorData.summary.unsecured_debt) || parseAmount(income.unsecured_debt_alt);

  const { error: incUpd } = await supabase
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
    .eq('case_id', existingCaseId);
  if (incUpd) console.error(`    ⚠ income_settings update:`, incUpd.message);

  return { creditorCount: creditorData.creditors.length, totalDebt };
}

// ─── 메인 실행 ────────────────────────────────────────────────────
async function main() {
  // 실행 모드: 'full' = 전체 마이그레이션, 'reextract' = 기존 사건 채권자/수입 재추출
  const MODE = (process.env.MIGRATION_MODE || 'full') as 'full' | 'reextract';
  // 재추출 대상 사건 ID 매핑 (VS case_id → colaw case index)
  const RE_EXTRACT_MAP: Record<string, string> = process.env.RE_EXTRACT_MAP
    ? JSON.parse(process.env.RE_EXTRACT_MAP)
    : {};

  console.log(`🚀 colaw → Vein Spiral 마이그레이션 시작 [모드: ${MODE}]`);
  console.log(`📋 총 ${COLAW_CASES.length}건 처리 예정\n`);

  const browser: Browser = await puppeteer.launch({
    headless: false, // colaw 세션 쿠키 활용을 위해 GUI 모드
    userDataDir: CHROME_DATA_DIR || undefined,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // colaw 로그인 확인
  await page.goto(`${COLAW_BASE}/documentManage/rescurMainList`, { waitUntil: 'networkidle2' });
  const isLoggedIn = await page.evaluate(() => document.body.textContent?.includes('Total'));
  if (!isLoggedIn) {
    console.error('❌ colaw 로그인이 필요합니다. 브라우저에서 수동 로그인 후 재실행하세요.');
    await browser.close();
    return;
  }
  console.log('✅ colaw 로그인 확인\n');

  const results: { n: string; nm: string; caseId: string | null; error?: string }[] = [];
  const logPath = path.join(__dirname, 'migration-log.json');

  for (const c of COLAW_CASES) {
    console.log(`\n── [${c.n}] ${c.nm} 처리 중 ──`);
    try {
      const application = await extractApplication(page, c);
      console.log(`  ✓ 신청인: ${application.applicant_name}`);

      const creditorData = await extractCreditors(page, c);
      console.log(`  ✓ 채권자: ${creditorData.creditors.length}건`);

      const properties = await extractProperties(page, c);
      console.log(`  ✓ 재산: ${properties.length}건`);

      const income = await extractIncome(page, c);
      console.log(`  ✓ 수입지출`);

      const affidavit = await extractAffidavit(page, c);
      console.log(`  ✓ 진술서`);

      const planSections = await extractPlanSections(page, c);
      console.log(`  ✓ 변제계획안: ${planSections.length}항`);

      const caseId = await insertCase({
        colawCase: c,
        application,
        creditorData,
        properties,
        income,
        affidavit,
        planSections,
      });

      results.push({ n: c.n, nm: c.nm, caseId });
    } catch (err: any) {
      console.error(`  ❌ 오류: ${err.message}`);
      results.push({ n: c.n, nm: c.nm, caseId: null, error: err.message });
    }

    // 로그 저장 (매 건마다)
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
  }

  console.log('\n\n═══ 마이그레이션 완료 ═══');
  console.log(`성공: ${results.filter((r) => r.caseId).length}건`);
  console.log(`실패: ${results.filter((r) => !r.caseId).length}건`);
  console.log(`로그: ${logPath}`);

  await browser.close();
}

main().catch(console.error);
