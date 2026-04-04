/**
 * 개인파산 법원 제출 문서 생성기
 *
 * 한국 개인파산·면책 절차에 필요한 법원 제출 문서를 HTML 형식으로 생성합니다.
 *
 * 문서 타입:
 * - petition: 파산·면책신청서
 * - delegation: 위임장
 * - creditor_list: 채권자목록
 * - property_list: 재산목록
 * - income_statement: 수입및지출목록
 * - affidavit: 진술서
 */

export type BankruptcyDocumentType =
  | 'petition'
  | 'delegation'
  | 'creditor_list'
  | 'property_list'
  | 'income_statement'
  | 'affidavit';

export interface BankruptcyDocumentData {
  application: Record<string, any> | null;
  creditors: Array<{
    creditor_name: string;
    claim_class: string;
    principal_amount: number;
    interest_amount: number;
    penalty_amount: number;
    total_claim_amount: number;
    has_guarantor: boolean;
    guarantor_name: string | null;
    notes: string | null;
  }>;
  properties: Record<string, any>[];
  propertyDeductions: Record<string, any>[];
  familyMembers: Record<string, any>[];
  incomeSettings: Record<string, any> | null;
  affidavit: Record<string, any> | null;
}

// ─── 헬퍼 함수 ───

function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0원';
  return `${Math.floor(n).toLocaleString('ko-KR')}원`;
}

function formatAmountNoUnit(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.floor(n).toLocaleString('ko-KR');
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  let date: Date;
  if (typeof d === 'string') {
    date = new Date(d);
  } else if (d instanceof Date) {
    date = d;
  } else {
    return '';
  }
  if (isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}. ${mm}. ${dd}.`;
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      font-family: 'Batang', '바탕', 'Noto Sans KR', serif;
      font-size: 12pt;
      color: #000;
      line-height: 1.4;
      background: white;
    }

    @page {
      size: A4 portrait;
      margin: 20mm;
    }

    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }

    .document {
      width: 100%;
      max-width: 21cm;
      margin: 0 auto;
      padding: 40px;
      background: white;
    }

    h1 {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 30px;
      letter-spacing: 0.2em;
    }

    h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
      text-align: center;
    }

    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 15px 0 10px 0;
    }

    p {
      margin: 8px 0;
      text-align: left;
      word-break: keep-all;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .section { margin: 20px 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }

    th, td {
      border: 1px solid #000;
      padding: 8px 6px;
      text-align: left;
      word-break: keep-all;
    }

    th {
      background: #fff;
      font-weight: bold;
      text-align: center;
    }

    td.number { text-align: right; }
    td.center { text-align: center; }

    .signature-area { margin-top: 40px; text-align: center; }
    .signature-line {
      display: inline-block;
      width: 150px;
      border-top: 1px solid #000;
      margin: 20px 0 5px 0;
    }

    .date-line { margin-top: 30px; text-align: center; }

    .footer { text-align: center; margin-top: 40px; font-size: 11pt; }

    .page-break { page-break-after: always; }

    .emphasis { font-weight: bold; }

    ul, ol { margin: 10px 0 10px 30px; }
    li { margin: 5px 0; }

    .header-line {
      text-align: center;
      margin-bottom: 20px;
      font-size: 11pt;
    }

    .summary-box {
      margin: 15px 0;
      border: 1px solid #000;
    }

    .two-col {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }

    .col-left { flex: 1; }
    .col-right { flex: 1; text-align: right; }
  `;
}

function wrapDocument(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    ${baseStyles()}
  </style>
</head>
<body>
  <div class="document">
    ${content}
  </div>
</body>
</html>`;
}

// ─── 문서 생성 함수들 ───

/**
 * 1. 파산·면책신청서 생성
 *
 * 개인파산은 개인회생과 달리 변제계획이 없고,
 * 파산선고 + 면책을 동시에 신청합니다.
 */
function generatePetition(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const incomeSettings = data.incomeSettings || {};

  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const courtName = app.court_name || '○○지방법원';
  const caseNumber = app.case_number || '';

  // 주소
  const regAddr = app.registered_address || {};
  const curAddr = app.current_address || {};
  const registeredAddress = [regAddr.address, regAddr.detail].filter(Boolean).join(' ');
  const currentAddress = [curAddr.address, curAddr.detail].filter(Boolean).join(' ');

  // 대리인
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const agentFax = app.agent_fax || '';
  const agentEmail = app.agent_email || '';
  const agtAddr = app.agent_address || {};
  const agentAddress = [agtAddr.address, agtAddr.detail].filter(Boolean).join(' ');

  // 채무 총액
  const totalDebt = data.creditors.reduce((sum, c) => sum + (c.total_claim_amount || 0), 0);
  const creditorCount = data.creditors.length;

  // 재산
  const properties = data.properties || [];
  const totalProperty = properties.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

  // 소득
  const netSalary = Number(incomeSettings.net_salary) || 0;

  const content = `
    ${caseNumber ? `<div class="header-line">${esc(courtName)} ${esc(caseNumber)}</div>` : ''}

    <h1>파산·면책 신청서</h1>

    <div class="section">
      <h3>Ⅰ. 당사자</h3>

      <table>
        <tr>
          <th style="width: 20%;" rowspan="4">채 무 자<br/>(신청인)</th>
          <td style="width: 20%;">성 명</td>
          <td style="width: 60%;">${esc(debtorName)}</td>
        </tr>
        <tr>
          <td>주민등록번호</td>
          <td>${esc(debtorBirth)}-*******</td>
        </tr>
        <tr>
          <td>등록기준지</td>
          <td>${esc(registeredAddress)}</td>
        </tr>
        <tr>
          <td>주 소</td>
          <td>${esc(currentAddress || registeredAddress)}</td>
        </tr>
      </table>

      ${agentName ? `
      <table style="margin-top: 15px;">
        <tr>
          <th style="width: 20%;" rowspan="4">대 리 인</th>
          <td style="width: 20%;">성 명</td>
          <td style="width: 60%;">${esc(app.agent_type || '법무사')} ${esc(agentName)}</td>
        </tr>
        <tr>
          <td>사무소 주소</td>
          <td>${esc(agentAddress)}</td>
        </tr>
        <tr>
          <td>전화 / 팩스</td>
          <td>${esc(agentPhone)} / ${esc(agentFax)}</td>
        </tr>
        <tr>
          <td>전자메일</td>
          <td>${esc(agentEmail)}</td>
        </tr>
      </table>
      ` : ''}
    </div>

    <div class="section">
      <h3>Ⅱ. 신청 취지</h3>
      <p style="margin-left: 20px;">
        1. 채무자에 대하여 파산을 선고한다.<br/>
        2. 채무자에 대하여 면책을 허가한다.<br/>
        라는 결정을 구합니다.
      </p>
    </div>

    <div class="section">
      <h3>Ⅲ. 신청 원인</h3>

      <p><strong>1. 채무자의 현황</strong></p>
      <table>
        <tr>
          <td style="width: 30%;">직 업</td>
          <td>${esc(app.employer_name || '')} ${esc(app.position || '')}</td>
        </tr>
        <tr>
          <td>월 수입</td>
          <td>${formatAmount(netSalary)}</td>
        </tr>
        <tr>
          <td>재산 총액</td>
          <td>${formatAmount(totalProperty)}</td>
        </tr>
        <tr>
          <td>채무 총액</td>
          <td>${formatAmount(totalDebt)} (채권자 ${creditorCount}명)</td>
        </tr>
      </table>

      <p style="margin-top: 15px;"><strong>2. 지급불능 사유</strong></p>
      <p style="margin-left: 20px;">
        채무자는 현재 총 ${formatAmount(totalDebt)}의 채무를 부담하고 있으나,
        월 수입 ${formatAmount(netSalary)}으로는 최저생계비를 공제하면 채무를 변제할 수 없는
        지급불능 상태에 있으므로, 채무자 회생 및 파산에 관한 법률 제305조에 의하여
        파산선고를 구하며, 같은 법 제556조에 의하여 면책을 신청합니다.
      </p>
    </div>

    <div class="section">
      <h3>Ⅳ. 첨부서류</h3>
      <ol>
        <li>채권자목록 1부</li>
        <li>재산목록 1부</li>
        <li>수입 및 지출에 관한 목록 1부</li>
        <li>채무자의 재산 및 채무에 관한 진술서 1부</li>
        <li>위임장 1부</li>
        <li>주민등록등본 1부</li>
        <li>부채증명서 각 1부</li>
      </ol>
    </div>

    <div class="signature-area">
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>

      <div style="margin-top: 30px;">
        <p>위 신청인(채무자) ${esc(debtorName)} (인)</p>
        ${agentName ? `<p style="margin-top: 15px;">위 대리인 ${esc(app.agent_type || '법무사')} ${esc(agentName)} (인)</p>` : ''}
      </div>

      <p style="margin-top: 40px; font-size: 14pt; font-weight: bold;">${esc(courtName)} 귀중</p>
    </div>
  `;

  return wrapDocument(content, '파산·면책신청서');
}

/**
 * 2. 위임장 생성
 */
function generateDelegation(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const agentName = app.agent_name || '';
  const agentType = app.agent_type || '법무사';
  const agentPhone = app.agent_phone || '';

  const regAddr = app.registered_address || {};
  const registeredAddress = [regAddr.address, regAddr.detail].filter(Boolean).join(' ');

  const agtAddr = app.agent_address || {};
  const agentAddress = [agtAddr.address, agtAddr.detail].filter(Boolean).join(' ');

  const content = `
    <h1>위 임 장</h1>

    <div class="section">
      <h3>위임인 (채무자)</h3>
      <table>
        <tr>
          <td style="width: 25%;">성 명</td>
          <td>${esc(debtorName)}</td>
        </tr>
        <tr>
          <td>주민등록번호</td>
          <td>${esc(debtorBirth)}-*******</td>
        </tr>
        <tr>
          <td>주 소</td>
          <td>${esc(registeredAddress)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>수임인 (대리인)</h3>
      <table>
        <tr>
          <td style="width: 25%;">성 명</td>
          <td>${esc(agentType)} ${esc(agentName)}</td>
        </tr>
        <tr>
          <td>사무소 소재지</td>
          <td>${esc(agentAddress)}</td>
        </tr>
        <tr>
          <td>전 화</td>
          <td>${esc(agentPhone)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>위임사항</h3>
      <ol>
        <li>파산·면책 신청 및 그 절차에 관한 일체의 행위</li>
        <li>파산·면책 사건에 관한 서류의 수령</li>
        <li>파산선고 및 면책결정에 대한 불복신청</li>
        <li>기타 파산·면책 절차에 관한 일체의 행위</li>
      </ol>
    </div>

    <div class="signature-area">
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>

      <div style="margin-top: 30px;">
        <p>위임인(채무자)</p>
        <p>${esc(debtorName)} (인)</p>
      </div>
    </div>
  `;

  return wrapDocument(content, '위임장');
}

/**
 * 3. 채권자목록 생성
 *
 * 개인파산의 채권자목록은 개인회생과 구조가 유사하되,
 * 변제예정액 없이 채권현재액만 기재합니다.
 */
function generateCreditorList(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const creditors = data.creditors || [];

  const debtorName = app.applicant_name || '';
  const courtName = app.court_name || '○○지방법원';

  // 구분별 합계
  let securedTotal = 0;
  let priorityTotal = 0;
  let generalTotal = 0;

  creditors.forEach((c) => {
    const total = c.total_claim_amount || 0;
    if (c.claim_class === 'secured') securedTotal += total;
    else if (c.claim_class === 'priority') priorityTotal += total;
    else generalTotal += total;
  });

  const totalClaim = securedTotal + priorityTotal + generalTotal;

  const CLAIM_CLASS_LABEL: Record<string, string> = {
    secured: '별제권부',
    priority: '우선채권',
    general: '일반파산채권',
  };

  let creditorRows = '';
  creditors.forEach((cred, idx) => {
    const claimLabel = CLAIM_CLASS_LABEL[cred.claim_class] || '일반파산채권';
    creditorRows += `
      <tr>
        <td style="width: 6%; text-align: center;">${idx + 1}</td>
        <td style="width: 20%;">${esc(cred.creditor_name)}</td>
        <td style="width: 12%; text-align: center;">${esc(claimLabel)}</td>
        <td style="width: 16%; text-align: right;">${formatAmountNoUnit(cred.principal_amount)}</td>
        <td style="width: 16%; text-align: right;">${formatAmountNoUnit(cred.interest_amount + (cred.penalty_amount || 0))}</td>
        <td style="width: 16%; text-align: right;">${formatAmountNoUnit(cred.total_claim_amount)}</td>
        <td style="width: 14%;">${esc(cred.notes || '')}</td>
      </tr>
    `;
  });

  const content = `
    <h1>채 권 자 목 록</h1>

    <div class="section">
      <p>채무자: ${esc(debtorName)}</p>
      <p>사건: ${esc(courtName)} ${esc(app.case_number || '')} 파산·면책</p>
    </div>

    <div class="summary-box">
      <table>
        <tr>
          <th style="width: 25%;">구분</th>
          <th style="width: 25%;">건수</th>
          <th style="width: 50%;">금액</th>
        </tr>
        <tr>
          <td style="text-align: center;">별제권부</td>
          <td style="text-align: center;">${creditors.filter(c => c.claim_class === 'secured').length}건</td>
          <td style="text-align: right;">${formatAmount(securedTotal)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">우선채권</td>
          <td style="text-align: center;">${creditors.filter(c => c.claim_class === 'priority').length}건</td>
          <td style="text-align: right;">${formatAmount(priorityTotal)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">일반파산채권</td>
          <td style="text-align: center;">${creditors.filter(c => c.claim_class === 'general').length}건</td>
          <td style="text-align: right;">${formatAmount(generalTotal)}</td>
        </tr>
        <tr style="font-weight: bold;">
          <td style="text-align: center;">합 계</td>
          <td style="text-align: center;">${creditors.length}건</td>
          <td style="text-align: right;">${formatAmount(totalClaim)}</td>
        </tr>
      </table>
    </div>

    <table>
      <tr>
        <th style="width: 6%;">번호</th>
        <th style="width: 20%;">채권자</th>
        <th style="width: 12%;">구분</th>
        <th style="width: 16%;">원금</th>
        <th style="width: 16%;">이자·지연손해금</th>
        <th style="width: 16%;">채권현재액</th>
        <th style="width: 14%;">비고</th>
      </tr>
      ${creditorRows}
      <tr style="font-weight: bold; border-top: 2px solid #000;">
        <td colspan="3" style="text-align: center;">합 계</td>
        <td style="text-align: right;">${formatAmountNoUnit(creditors.reduce((s, c) => s + (c.principal_amount || 0), 0))}</td>
        <td style="text-align: right;">${formatAmountNoUnit(creditors.reduce((s, c) => s + (c.interest_amount || 0) + (c.penalty_amount || 0), 0))}</td>
        <td style="text-align: right;">${formatAmountNoUnit(totalClaim)}</td>
        <td></td>
      </tr>
    </table>

    ${creditors.some(c => c.has_guarantor) ? `
    <div class="section" style="margin-top: 30px;">
      <h3>보증인 현황</h3>
      <table>
        <tr>
          <th style="width: 10%;">번호</th>
          <th style="width: 30%;">채권자</th>
          <th style="width: 30%;">보증인</th>
          <th style="width: 30%;">비고</th>
        </tr>
        ${creditors.filter(c => c.has_guarantor).map((c, i) => `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${esc(c.creditor_name)}</td>
            <td>${esc(c.guarantor_name || '')}</td>
            <td></td>
          </tr>
        `).join('')}
      </table>
    </div>
    ` : ''}

    <div class="date-line">
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>
      <p style="margin-top: 10px;">위 채무자 ${esc(debtorName)}</p>
    </div>
  `;

  return wrapDocument(content, '채권자목록');
}

/**
 * 4. 재산목록 생성
 */
function generatePropertyList(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const properties = data.properties || [];
  const deductions = data.propertyDeductions || [];

  const debtorName = app.applicant_name || '';
  let totalValue = 0;
  properties.forEach((p: any) => {
    totalValue += Number(p.amount) || 0;
  });

  const totalDeduction = deductions.reduce((s: number, d: any) => s + (Number(d.deduction_amount) || 0), 0);

  let propertyRows = '';
  properties.forEach((prop: any) => {
    const name = prop.detail || prop.category || '';
    const amount = Number(prop.amount) || 0;
    const seizure = prop.seizure || '무';
    const notes = prop.repay_use || '';

    propertyRows += `
      <tr>
        <td style="width: 30%;">${esc(name)}</td>
        <td style="width: 20%; text-align: right;">${formatAmount(amount)}</td>
        <td style="width: 15%; text-align: center;">${esc(seizure)}</td>
        <td style="width: 35%;">${esc(notes)}</td>
      </tr>
    `;
  });

  const content = `
    <h1>재 산 목 록</h1>

    <div class="section">
      <p>채무자: ${esc(debtorName)}</p>
    </div>

    <p style="font-size: 10pt; margin-bottom: 15px;">
      ※ 채무자 회생 및 파산에 관한 법률 제308조 제2항에 따라 채무자의 재산을 아래와 같이 기재합니다.
    </p>

    <table>
      <tr>
        <th style="width: 30%;">명 칭</th>
        <th style="width: 20%;">금액 또는 시가<br/>(단위:원)</th>
        <th style="width: 15%;">압류등유무</th>
        <th style="width: 35%;">비 고</th>
      </tr>
      ${propertyRows || '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #666;">해당 재산 없음</td></tr>'}
      <tr>
        <td style="font-weight: bold;">합 계</td>
        <td style="text-align: right; font-weight: bold;">${formatAmount(totalValue)}</td>
        <td colspan="2"></td>
      </tr>
    </table>

    ${totalDeduction > 0 ? `
    <div class="section">
      <h3>면제재산</h3>
      <p>채무자 회생 및 파산에 관한 법률 제383조에 따른 면제재산: ${formatAmount(totalDeduction)}</p>
    </div>
    ` : ''}

    <div class="section">
      <p style="font-weight: bold;">
        위 목록은 사실과 다름이 없음을 확인합니다.
      </p>
    </div>

    <div class="signature-area">
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>
      <p style="margin-top: 20px;">위 채무자 ${esc(debtorName)} (인)</p>
    </div>
  `;

  return wrapDocument(content, '재산목록');
}

/**
 * 5. 수입및지출목록 생성
 */
function generateIncomeStatement(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const incomeSettings = data.incomeSettings || {};
  const familyMembers = data.familyMembers || [];

  const debtorName = app.applicant_name || '';
  const monthlySalary = Number(incomeSettings.net_salary) || 0;
  const extraIncome = Number(incomeSettings.extra_income) || 0;
  const monthlyIncome = monthlySalary + extraIncome;
  const annualIncome = monthlyIncome * 12;
  const livingExpense = Number(incomeSettings.living_cost) || 0;

  const incomeType = app.income_type || 'salary';
  const employerName = app.employer_name || '';

  let familyRows = '';
  familyMembers.forEach((member: any) => {
    familyRows += `
      <tr>
        <td style="text-align: center;">${esc(member.relation || '')}</td>
        <td style="text-align: center;">${esc(member.member_name || '')}</td>
        <td style="text-align: center;">${esc(member.age || '')}</td>
        <td style="text-align: center;">${esc(member.cohabitation || '')}</td>
        <td style="text-align: center;">${esc(member.occupation || '')}</td>
        <td style="text-align: right;">${formatAmount(Number(member.monthly_income) || 0)}</td>
        <td style="text-align: right;">${formatAmount(Number(member.total_property) || 0)}</td>
        <td style="text-align: center;">${member.is_dependent ? '있음' : '없음'}</td>
      </tr>
    `;
  });

  const content = `
    <h1>수입 및 지출에 관한 목록</h1>

    <div class="section">
      <p>채무자: ${esc(debtorName)}</p>
    </div>

    <h3>I. 현재의 수입목록 (단위 : 원)</h3>

    <table>
      <tr>
        <th style="width: 25%;">수입상황</th>
        <th style="width: 25%;">자영(상호)</th>
        <th style="width: 25%;">고용(직장명)</th>
        <th style="width: 25%;">비고</th>
      </tr>
      <tr>
        <td></td>
        <td style="text-align: center;">${incomeType === 'business' ? `■ ${esc(employerName)}` : '□'}</td>
        <td style="text-align: center;">${incomeType === 'salary' ? `■ ${esc(employerName)}` : '□'}</td>
        <td></td>
      </tr>
    </table>

    <table>
      <tr>
        <th style="width: 15%;">명목</th>
        <th style="width: 20%;">기간구분</th>
        <th style="width: 20%;">금액</th>
        <th style="width: 20%;">연간환산금액</th>
        <th style="width: 25%;">압류, 가압류 등 유무</th>
      </tr>
      <tr>
        <td style="text-align: center;">급여소득</td>
        <td style="text-align: center;">월</td>
        <td style="text-align: right;">${formatAmount(monthlySalary)}</td>
        <td style="text-align: right;">${formatAmount(monthlySalary * 12)}</td>
        <td style="text-align: center;">무</td>
      </tr>
      ${extraIncome > 0 ? `<tr>
        <td style="text-align: center;">기타소득</td>
        <td style="text-align: center;">월</td>
        <td style="text-align: right;">${formatAmount(extraIncome)}</td>
        <td style="text-align: right;">${formatAmount(extraIncome * 12)}</td>
        <td style="text-align: center;">무</td>
      </tr>` : ''}
    </table>

    <p style="margin-top: 15px;">
      연 수입 ${formatAmount(annualIncome)} / 월 평균소득 ${formatAmount(monthlyIncome)}
    </p>

    <h3>II. 현재의 지출목록</h3>

    <table>
      <tr>
        <th style="width: 40%;">항목</th>
        <th style="width: 30%;">월 지출액</th>
        <th style="width: 30%;">비고</th>
      </tr>
      <tr>
        <td>생계비</td>
        <td style="text-align: right;">${formatAmount(livingExpense)}</td>
        <td></td>
      </tr>
      <tr style="font-weight: bold;">
        <td>합 계</td>
        <td style="text-align: right;">${formatAmount(livingExpense)}</td>
        <td></td>
      </tr>
    </table>

    <p style="margin-top: 10px;">
      월 수입 ${formatAmount(monthlyIncome)} − 월 지출 ${formatAmount(livingExpense)} = 잔여소득 ${formatAmount(monthlyIncome - livingExpense)}
    </p>

    <h3>III. 가족관계</h3>

    <table>
      <tr>
        <th style="width: 12%;">관계</th>
        <th style="width: 12%;">성 명</th>
        <th style="width: 8%;">연령</th>
        <th style="width: 18%;">동거여부 및 기간</th>
        <th style="width: 15%;">직 업</th>
        <th style="width: 12%;">월 수입</th>
        <th style="width: 12%;">재산총액</th>
        <th style="width: 11%;">부양유무</th>
      </tr>
      ${familyRows || '<tr><td colspan="8" style="text-align: center; padding: 15px; color: #666;">해당 없음</td></tr>'}
    </table>

    <div class="signature-area">
      <p style="margin-top: 30px;">위 목록은 사실과 다름이 없음을 확인합니다.</p>
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>
      <p style="margin-top: 15px;">위 채무자 ${esc(debtorName)} (인)</p>
    </div>
  `;

  return wrapDocument(content, '수입및지출목록');
}

/**
 * 6. 진술서 생성
 *
 * 개인파산 진술서는 개인회생 진술서와 유사하지만,
 * "변제계획 이행 전망" 대신 "면책 불허가 사유 해당여부"를 기재합니다.
 */
function generateAffidavit(data: BankruptcyDocumentData): string {
  const app = data.application || {};
  const affidavit = data.affidavit || {};

  const debtorName = app.applicant_name || '';

  // income_change에 JSON 구조 데이터가 저장될 수 있음
  let structured: Record<string, any> = {};
  try {
    if (typeof affidavit.income_change === 'string' && affidavit.income_change.startsWith('{')) {
      structured = JSON.parse(affidavit.income_change);
    }
  } catch { /* ignore */ }

  const finalEducation = structured.school_name || '';
  const educationYear = structured.graduation_year || '';
  const graduationStatus = structured.graduation_status || '졸업';
  const careers: Array<{ period?: string; industry?: string; company?: string; position?: string }> = structured.careers || [];
  const marriageStatus = structured.marriage_status || '';
  const marriageNote = structured.marriage_note || '';
  const housingType = structured.housing_type || '1';
  const housingStart = structured.housing_start || '';
  const housingNote = structured.housing_note || '';
  const debtHasLawsuit = structured.debt_has_lawsuit || '없음';
  const debtCircumstances = affidavit.debt_history || '';
  const debtIncreaseReason = affidavit.property_change || '';
  const currentSituation = affidavit.living_situation || '';
  const dischargeStatement = affidavit.repay_feasibility || '';

  const content = `
    <h1>채무자의 재산 및 채무에 관한 진술서</h1>

    <div class="section">
      <p>채무자: ${esc(debtorName)}</p>
    </div>

    <h3>I. 경력</h3>

    <ol style="margin-left: 20px;">
      <li>최종학력: ${esc(educationYear) || 'YYYY'}년도 : ${esc(finalEducation)} (${esc(graduationStatus)})</li>
      <li>과거 경력 (최근 경력부터 기재)
        <table style="margin-top: 10px;">
          <tr>
            <th style="width: 20%;">기간</th>
            <th style="width: 20%;">업종</th>
            <th style="width: 25%;">직장명</th>
            <th style="width: 35%;">직위</th>
          </tr>
          ${careers.length > 0 ? careers.map(c => `<tr>
            <td style="text-align: center;">${esc(c.period || '')}</td>
            <td style="text-align: center;">${esc(c.industry || '')}</td>
            <td style="text-align: center;">${esc(c.company || '')}</td>
            <td style="text-align: center;">${esc(c.position || '')}</td>
          </tr>`).join('') : '<tr><td colspan="4" style="height: 40px; text-align: center; color: #666;">해당 없음</td></tr>'}
        </table>
      </li>
      <li>과거 결혼, 이혼 경력: ${esc(marriageStatus)}${marriageNote ? ` (${esc(marriageNote)})` : ''}</li>
    </ol>

    <h3>II. 현재 주거상황</h3>

    <p>거주를 시작한 시점 ( ${esc(housingStart) || 'YYYY.MM.DD'} )</p>

    <table style="margin-top: 10px;">
      <tr>
        <th style="width: 15%;">거주관계</th>
        <th style="width: 85%;">상세 내역</th>
      </tr>
      ${['1', '2', '3', '4', '5', '6'].map((n, i) => {
        const labels = ['① 신청인 소유의 주택', '② 사택 또는 기숙사', '③ 임차(전월·세) 주택', '④ 친족 소유 주택에 무상 거주', '⑤ 친족외 소유 주택에 무상 거주', '⑥ 기타'];
        const checked = housingType === n ? '■' : '□';
        return `<tr>
          <td style="text-align: center;">${checked}${labels[i]}</td>
          <td>${housingType === n ? esc(housingNote) : ''}</td>
        </tr>`;
      }).join('')}
    </table>

    <h3>III. 채무 발생 및 증가 경위</h3>

    <ol style="margin-left: 20px;">
      <li>채권자로부터 소송, 지급명령, 압류 등을 받은 경험( ${esc(debtHasLawsuit)} )</li>
      <li>채무 발생 경위<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 100px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(debtCircumstances) || '(미입력)'}
        </div>
      </li>
      <li>채무 증가 경위<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(debtIncreaseReason) || '(미입력)'}
        </div>
      </li>
      <li>현재 생활 상황<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(currentSituation) || '(미입력)'}
        </div>
      </li>
    </ol>

    <h3>IV. 면책 불허가 사유 해당 여부</h3>

    <p style="font-size: 10pt; margin-bottom: 10px;">
      ※ 채무자 회생 및 파산에 관한 법률 제564조 각호의 면책 불허가 사유에 해당하는 사항이 있으면 기재하십시오.
    </p>

    <div style="border: 1px solid #000; padding: 10px; min-height: 120px; white-space: pre-wrap;">
      ${esc(dischargeStatement) || '해당 사항 없음'}
    </div>

    <div class="signature-area">
      <p style="margin-top: 20px; font-weight: bold;">
        위 내용은 사실과 다름이 없음을 확인합니다.
      </p>
      <p>${formatDate(app.application_date || new Date().toISOString())}</p>
      <p style="margin-top: 15px;">위 채무자 ${esc(debtorName)} (인)</p>
    </div>
  `;

  return wrapDocument(content, '진술서');
}

// ─── 메인 문서 생성 함수 ───

export function generateBankruptcyDocument(type: BankruptcyDocumentType, data: BankruptcyDocumentData): string {
  switch (type) {
    case 'petition':
      return generatePetition(data);
    case 'delegation':
      return generateDelegation(data);
    case 'creditor_list':
      return generateCreditorList(data);
    case 'property_list':
      return generatePropertyList(data);
    case 'income_statement':
      return generateIncomeStatement(data);
    case 'affidavit':
      return generateAffidavit(data);
    default:
      throw new Error(`지원하지 않는 문서 타입입니다: ${type}`);
  }
}
