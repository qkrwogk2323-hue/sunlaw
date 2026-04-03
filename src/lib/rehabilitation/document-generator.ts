/**
 * 개인회생 법원 제출 문서 생성기
 *
 * 한국 개인회생 절차에 필요한 모든 법원 제출 문서를 HTML 형식으로 생성합니다.
 * colaw.co.kr 출력 형식과 정확히 일치하도록 설계되었습니다.
 *
 * 문서 타입:
 * - application: 개시신청서 (신청서 + 신청이유서 + 첨부서류 + 정보수신신청서)
 * - delegation: 위임장
 * - creditor_list: 채권자목록
 * - property_list: 재산목록
 * - income_statement: 수입및지출목록
 * - affidavit: 진술서
 * - repayment_plan: 변제계획안 제출서
 */

export type DocumentType =
  | 'application'
  | 'delegation'
  | 'creditor_list'
  | 'property_list'
  | 'income_statement'
  | 'affidavit'
  | 'repayment_plan';

export interface DocumentData {
  application: Record<string, any> | null;
  creditorSettings: Record<string, any> | null;
  creditors: Record<string, any>[];
  securedProperties: Record<string, any>[];
  properties: Record<string, any>[];
  propertyDeductions: Record<string, any>[];
  familyMembers: Record<string, any>[];
  incomeSettings: Record<string, any> | null;
  affidavit: Record<string, any> | null;
  planSections: Record<string, any>[];
}

// ─── 헬퍼 함수 ───

/**
 * 숫자를 쉼표와 "원" 단위로 포맷팅합니다.
 * 예: 1234567 → "1,234,567원"
 */
function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0원';
  const formatted = Math.floor(n).toLocaleString('ko-KR');
  return `${formatted}원`;
}

/**
 * 숫자를 쉼표 구분으로만 포맷팅합니다 (단위 제외).
 * 예: 1234567 → "1,234,567"
 */
function formatAmountNoUnit(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return Math.floor(n).toLocaleString('ko-KR');
}

/**
 * 날짜를 "YYYY. MM. DD." 형식으로 포맷팅합니다.
 * ISO 문자열, Date 객체, 또는 "YYYY-MM-DD" 형식을 지원합니다.
 */
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

/**
 * HTML 특수문자 이스케이프
 */
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 기본 스타일시트 생성
 */
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
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
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

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right;
    }

    .section {
      margin: 20px 0;
    }

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

    td.number {
      text-align: right;
    }

    td.center {
      text-align: center;
    }

    .info-box {
      border: 1px solid #000;
      padding: 10px;
      margin: 10px 0;
    }

    .signature-area {
      margin-top: 40px;
      text-align: center;
    }

    .signature-line {
      display: inline-block;
      width: 150px;
      border-top: 1px solid #000;
      margin: 20px 0 5px 0;
    }

    .date-line {
      margin-top: 30px;
      text-align: center;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 11pt;
    }

    .page-break {
      page-break-after: always;
    }

    .emphasis {
      font-weight: bold;
    }

    .red {
      color: #c00;
    }

    ul, ol {
      margin: 10px 0 10px 30px;
    }

    li {
      margin: 5px 0;
    }

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

    .col-left {
      flex: 1;
    }

    .col-right {
      flex: 1;
      text-align: right;
    }
  `;
}

/**
 * HTML 문서 래퍼 (head + body)
 */
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
 * 1. 개시신청서 생성
 */
function generateApplication(data: DocumentData): string {
  const app = data.application || {};
  const caseNumber = app.case_number || '';
  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const agentEmail = app.agent_email || '';

  const content = `
    <div class="header-line">
      수원회생법원 ${caseNumber} 개회 호
    </div>

    <h1>개 시 신 청 서</h1>

    <div class="section">
      <h3>신청서</h3>
      <table>
        <tr>
          <td style="width: 30%;">채무자</td>
          <td>${esc(debtorName)}</td>
        </tr>
        <tr>
          <td>주민번호</td>
          <td>${esc(debtorBirth)}-*******</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>대리인</h3>
      <p>법 무 법 인: ${esc(agentName)}</p>
      <p>전 화: ${esc(agentPhone)}</p>
      <p>전자메일: ${esc(agentEmail)}</p>
    </div>

    <div class="signature-area">
      <p>2026년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
      <div style="margin-top: 40px;">
        <div style="display: inline-block; margin: 0 30px;">
          <p>채무자</p>
          <div class="signature-line"></div>
        </div>
        <div style="display: inline-block; margin: 0 30px;">
          <p>대리인</p>
          <div class="signature-line"></div>
        </div>
      </div>
    </div>
  `;

  return wrapDocument(content, '개시신청서');
}

/**
 * 2. 위임장 생성
 */
function generateDelegation(data: DocumentData): string {
  const app = data.application || {};
  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const agentName = app.agent_name || '';

  const content = `
    <h1>위 임 장</h1>

    <div class="section">
      <p>본인은 아래의 개인회생절차에 관련하여 ${esc(agentName)}을(를) 본인의 법정대리인으로 위임합니다.</p>
    </div>

    <div class="section">
      <table>
        <tr>
          <td style="width: 30%;">위임자</td>
          <td>${esc(debtorName)}</td>
        </tr>
        <tr>
          <td>주민번호</td>
          <td>${esc(debtorBirth)}-*******</td>
        </tr>
        <tr>
          <td>위임대리인</td>
          <td>${esc(agentName)}</td>
        </tr>
      </table>
    </div>

    <div class="signature-area">
      <p>위임자</p>
      <div class="signature-line"></div>
      <p style="margin-top: 20px;">2026년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
    </div>
  `;

  return wrapDocument(content, '위임장');
}

/**
 * 3. 채권자목록 생성 (Portrait)
 */
function generateCreditorList(data: DocumentData): string {
  const app = data.application || {};
  const creditorSettings = data.creditorSettings || {};
  const creditors = data.creditors || [];

  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const courtCode = '수원회생법원';
  const caseNumber = app.case_number || '2026 개회 호';
  const assessmentDate = creditorSettings.assessment_date || '';
  const listDate = creditorSettings.list_date || new Date().toISOString().split('T')[0];

  // 채권액 계산
  let totalCapital = 0;
  let totalInterest = 0;
  let securedTotal = 0;
  let unsecuredTotal = 0;

  creditors.forEach((cred: any) => {
    const capital = cred.capital || 0;
    const interest = cred.interest || 0;
    totalCapital += capital;
    totalInterest += interest;

    if (cred.is_secured) {
      securedTotal += capital;
    } else {
      unsecuredTotal += capital;
    }
  });

  const totalAmount = totalCapital + totalInterest;

  const headerLine = `${courtCode} ${caseNumber}  채무자 ${esc(debtorName)}(${esc(debtorBirth)}-*****)`;

  let creditorRows = '';
  creditors.forEach((cred: any, idx: number) => {
    const bondNumber = cred.bond_number || String(idx + 1);
    const creditorName = cred.creditor_name || '';
    const cause = cred.bond_cause || '';
    const causeDateStr = cred.cause_date || '';
    const address = cred.address || '';
    const phone = cred.phone || '';
    const fax = cred.fax || '';
    const mobile = cred.mobile || '';
    const capital = cred.capital || 0;
    const interest = cred.interest || 0;
    const attachments = cred.attachments || [];
    const attachmentYn = attachments.length > 0 ? '■' : '□';

    const addressLine = [address, phone && `(전화)${phone}`, fax && `(팩스)${fax}`, mobile && `(휴대전화)${mobile}`]
      .filter(Boolean)
      .join(' ');

    creditorRows += `
      <tr>
        <td style="width: 5%; text-align: center;">${esc(bondNumber)}</td>
        <td style="width: 15%; text-align: center;">${esc(creditorName)}</td>
        <td style="width: 15%; text-align: center;">${esc(cause)}<br/>${esc(causeDateStr)}</td>
        <td style="width: 20%;">${esc(addressLine)}</td>
        <td style="width: 25%;">원리금<br/>부속서류 ${attachmentYn}</td>
        <td style="width: 20%; text-align: right;">-</td>
      </tr>
      <tr>
        <td colspan="2">금 ${formatAmountNoUnit(capital)}원</td>
        <td colspan="3">부채증명서 참조(산정기준일: ${formatDate(assessmentDate)})</td>
        <td></td>
      </tr>
      <tr>
        <td colspan="2">이자 ${formatAmountNoUnit(interest)}원</td>
        <td colspan="3">부채증명서 참조(산정기준일: ${formatDate(assessmentDate)})</td>
        <td></td>
      </tr>
    `;
  });

  const content = `
    <div class="header-line">${esc(headerLine)}</div>

    <h1>개 인 회 생 채 권 자 목 록</h1>

    <div class="two-col">
      <div class="col-left">
        채권현재액 산정기준일: ${formatDate(assessmentDate)}
      </div>
      <div class="col-right">
        목록작성일: ${formatDate(listDate)}
      </div>
    </div>

    <div class="summary-box">
      <table>
        <tr>
          <td style="width: 20%; text-align: center; font-weight: bold;">채권현재액</td>
          <td style="width: 20%; text-align: right;">합계 ${formatAmount(totalAmount)}</td>
          <td style="width: 30%; text-align: right;">담보부 회생 ${formatAmount(securedTotal)}</td>
          <td style="width: 30%; text-align: right;">무담보 회생 ${formatAmount(unsecuredTotal)}</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;"></td>
          <td style="text-align: right;">원금 ${formatAmount(totalCapital)}</td>
          <td colspan="2" style="text-align: right;">채권액의 합계</td>
        </tr>
        <tr>
          <td style="text-align: center; font-weight: bold;"></td>
          <td style="text-align: right;">이자 ${formatAmount(totalInterest)}</td>
          <td colspan="2" style="text-align: right;"></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 10pt; margin: 15px 0;">
      ※ 개시후이자 등: 아래 각 채권의 개시결정일 이후의 이자·지연손해금 등은 채무자 회생 및 파산에 관한 법률
      제581조 제2항, 제446조 제1항 제1, 2호의 후순위채권입니다.
    </p>

    <table>
      <tr>
        <th rowspan="2" style="width: 5%;">채권번호</th>
        <th rowspan="2" style="width: 15%;">채권자</th>
        <th rowspan="2" style="width: 15%;">채권의 원인<br/>채권현재액<br/>(원금/이자)</th>
        <th rowspan="2" style="width: 20%;">주소 및 연락처</th>
        <th colspan="2" style="width: 45%;">채권의 내용 및 부속서류</th>
      </tr>
      <tr>
        <th style="width: 25%;">기재사항</th>
        <th style="width: 20%;">부속서류 유무</th>
      </tr>
      ${creditorRows}
    </table>

    <div class="page-break"></div>

    <h3>부속서류 1. 별제권부채권 및 이에 준하는 채권의 내역</h3>

    <table>
      <tr>
        <th style="width: 8%; text-align: center;">채권번호</th>
        <th style="width: 15%; text-align: center;">채권자</th>
        <th style="width: 18%; text-align: center;">①채권현재액<br/>(원금/이자)</th>
        <th style="width: 18%; text-align: center;">③별제권행사등으로<br/>변제가 예상되는<br/>채권액</th>
        <th style="width: 18%; text-align: center;">④별제권행사등으로도<br/>변제받을 수 없을<br/>채권액</th>
        <th style="width: 14%; text-align: center;">⑤담보부<br/>회생채권액</th>
      </tr>
      <tr>
        <td colspan="6" style="height: 60px;"></td>
      </tr>
      <tr>
        <td colspan="6" style="text-align: center; font-weight: bold;">⑥별제권 등의 내용 및 목적물</td>
      </tr>
      <tr>
        <td colspan="6" style="height: 40px;"></td>
      </tr>
      <tr>
        <td colspan="6" style="text-align: center; font-weight: bold;">합 계</td>
      </tr>
    </table>
  `;

  return wrapDocument(content, '채권자목록');
}

/**
 * 4. 재산목록 생성
 */
function generatePropertyList(data: DocumentData): string {
  const properties = data.properties || [];
  let totalValue = 0;

  properties.forEach((p: any) => {
    totalValue += p.amount || 0;
  });

  let propertyRows = '';
  properties.forEach((prop: any) => {
    const name = prop.name || '';
    const amount = prop.amount || 0;
    const hasSeizure = prop.has_seizure ? '있음' : '없음';
    const notes = prop.notes || '';

    propertyRows += `
      <tr>
        <td style="width: 25%; text-align: left;">${esc(name)}</td>
        <td style="width: 20%; text-align: right;">${formatAmount(amount)}</td>
        <td style="width: 15%; text-align: center;">${esc(hasSeizure)}</td>
        <td style="width: 40%; text-align: left;">${esc(notes)}</td>
      </tr>
    `;
  });

  const content = `
    <h1>재 산 목 록</h1>

    <table>
      <tr>
        <th style="width: 25%; text-align: center;">명 칭</th>
        <th style="width: 20%; text-align: center;">금액 또는 시가<br/>(단위:원)</th>
        <th style="width: 15%; text-align: center;">압류등유무</th>
        <th style="width: 40%; text-align: center;">비 고</th>
      </tr>
      ${propertyRows}
      <tr>
        <td style="font-weight: bold;">합 계</td>
        <td style="text-align: right; font-weight: bold;">${formatAmount(totalValue)}</td>
        <td colspan="2"></td>
      </tr>
      <tr>
        <td colspan="4" style="height: 40px;">면제재산 결정신청 금액 (1. 설명)</td>
      </tr>
      <tr>
        <td colspan="4" style="height: 40px;">면제재산 결정신청 금액 (2. 설명)</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">청산가치</td>
        <td style="text-align: right; font-weight: bold;">${formatAmount(totalValue)}</td>
        <td colspan="2"></td>
      </tr>
    </table>
  `;

  return wrapDocument(content, '재산목록');
}

/**
 * 5. 수입및지출목록 생성
 */
function generateIncomeStatement(data: DocumentData): string {
  const incomeSettings = data.incomeSettings || {};
  const familyMembers = data.familyMembers || [];

  const annualIncome = incomeSettings.annual_income || 0;
  const monthlyIncome = annualIncome / 12;
  const livingExpense = incomeSettings.living_expense || 0;

  let familyRows = '';
  familyMembers.forEach((member: any) => {
    const relationship = member.relationship || '';
    const name = member.name || '';
    const age = member.age || '';
    const cohabitation = member.cohabitation_status || '';
    const job = member.job || '';
    const monthlyIncome = member.monthly_income || 0;
    const totalProperty = member.total_property || 0;
    const isSupportDependent = member.is_support_dependent ? '있음' : '없음';

    familyRows += `
      <tr>
        <td style="width: 12%; text-align: center;">${esc(relationship)}</td>
        <td style="width: 12%; text-align: center;">${esc(name)}</td>
        <td style="width: 8%; text-align: center;">${esc(age)}</td>
        <td style="width: 18%; text-align: center;">${esc(cohabitation)}</td>
        <td style="width: 15%; text-align: center;">${esc(job)}</td>
        <td style="width: 12%; text-align: right;">${formatAmount(monthlyIncome)}</td>
        <td style="width: 12%; text-align: right;">${formatAmount(totalProperty)}</td>
        <td style="width: 11%; text-align: center;">${esc(isSupportDependent)}</td>
      </tr>
    `;
  });

  const content = `
    <h1>수입 및 지출에 관한 목록</h1>

    <h3>I. 현재의 수입목록 (단위 : 원)</h3>

    <table>
      <tr>
        <th style="width: 25%;">수입상황</th>
        <th style="width: 25%;">자영(상호)</th>
        <th style="width: 25%;">고용(직장명)</th>
        <th style="width: 25%;">-</th>
      </tr>
      <tr>
        <td colspan="4" style="height: 60px;"></td>
      </tr>
    </table>

    <table>
      <tr>
        <th style="width: 15%; text-align: center;">명목</th>
        <th style="width: 20%; text-align: center;">기간구분</th>
        <th style="width: 20%; text-align: center;">금액</th>
        <th style="width: 20%; text-align: center;">연간환산금액</th>
        <th style="width: 25%; text-align: center;">압류, 가압류 등 유무</th>
      </tr>
      <tr>
        <td style="text-align: center;">급여소득</td>
        <td colspan="4" style="height: 60px;"></td>
      </tr>
    </table>

    <p style="margin-top: 15px;">
      연 수입 ${formatAmount(annualIncome)} / 월 평균소득 ${formatAmount(monthlyIncome)}
    </p>

    <h3>II. 변제계획 수행시의 예상지출목록</h3>

    <p>
      ■채무자가 예상하는 생계비가 보건복지부 공표 기준 중위소득의 100분의 60 이하인 경우<br/>
      보건복지부 공표 (1)인 가구 기준 중위 소득 (2,564,238)원의 약 (60)%인 (1,538,543)원을 지출할 것으로 예상됩니다.
    </p>

    <h3>III. 가족관계</h3>

    <table>
      <tr>
        <th style="width: 12%; text-align: center;">관계</th>
        <th style="width: 12%; text-align: center;">성 명</th>
        <th style="width: 8%; text-align: center;">연령</th>
        <th style="width: 18%; text-align: center;">동거여부 및 기간</th>
        <th style="width: 15%; text-align: center;">직 업</th>
        <th style="width: 12%; text-align: center;">월 수입</th>
        <th style="width: 12%; text-align: center;">재산총액</th>
        <th style="width: 11%; text-align: center;">부양유무</th>
      </tr>
      ${familyRows}
    </table>
  `;

  return wrapDocument(content, '수입및지출목록');
}

/**
 * 6. 진술서 생성
 */
function generateAffidavit(data: DocumentData): string {
  const affidavit = data.affidavit || {};
  const app = data.application || {};

  const finalEducation = affidavit.final_education || '';
  const currentHousing = affidavit.current_housing || '';
  const housingDetails = affidavit.housing_details || '';
  const litigationExperience = affidavit.litigation_experience || '없음';
  const debtCircumstances = affidavit.debt_circumstances || '';
  const pastProcedures = affidavit.past_procedures || '';

  const content = `
    <h1>진 술 서</h1>

    <h3>I. 경력</h3>

    <ol style="margin-left: 20px;">
      <li>최종학력: ${affidavit.education_year || 'YYYY'}년도 : ${esc(finalEducation)} (졸업)</li>
      <li>과거 경력 (최근 경력부터 기재하여 주십시오)
        <table style="margin-top: 10px;">
          <tr>
            <th style="width: 20%; text-align: center;">기간</th>
            <th style="width: 20%; text-align: center;">업종</th>
            <th style="width: 25%; text-align: center;">직장명</th>
            <th style="width: 35%; text-align: center;">직위</th>
          </tr>
          <tr>
            <td style="height: 40px;"></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </table>
      </li>
      <li>과거 결혼, 이혼 경력: 와( )</li>
    </ol>

    <h3>II. 현재 주거상황</h3>

    <p>거주를 시작한 시점 ( ${affidavit.housing_start_date || 'YYYY.MM.DD'} )</p>

    <table style="margin-top: 10px;">
      <tr>
        <th style="width: 15%; text-align: center;">거주관계</th>
        <th style="width: 85%; text-align: center;">상세 내역</th>
      </tr>
      <tr>
        <td style="text-align: center;">■① 신청인 소유의 주택</td>
        <td>${esc(housingDetails)}</td>
      </tr>
      <tr>
        <td style="text-align: center;">□② 사택 또는 기숙사</td>
        <td style="height: 40px;"></td>
      </tr>
      <tr>
        <td style="text-align: center;">□③ 임차(전월·세) 주택</td>
        <td style="height: 40px;"></td>
      </tr>
      <tr>
        <td style="text-align: center;">□④ 친족 소유 주택에 무상 거주</td>
        <td style="height: 40px;"></td>
      </tr>
      <tr>
        <td style="text-align: center;">□⑤ 친족외 소유 주택에 무상 거주</td>
        <td style="height: 40px;"></td>
      </tr>
      <tr>
        <td style="text-align: center;">□⑥ 기타( )</td>
        <td style="height: 40px;"></td>
      </tr>
    </table>

    <h3>III. 부채 상황</h3>

    <ol style="margin-left: 20px;">
      <li>채권자로부터 소송, 지급명령, 전부명령, 압류, 가압류 등을 받은 경험( ${esc(litigationExperience)} )
        <table style="margin-top: 10px;">
          <tr>
            <th style="width: 25%; text-align: center;">내 역</th>
            <th style="width: 25%; text-align: center;">채권자</th>
            <th style="width: 25%; text-align: center;">관할법원</th>
            <th style="width: 25%; text-align: center;">사건번호</th>
          </tr>
          <tr>
            <td style="height: 40px;"></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </table>
      </li>
      <li>개인회생절차에 이르게 된 사정(여러 항목 중복 선택 가능)
        <p style="margin-top: 10px;">
          ☐사업의 실패·부진 / ☐실직·전업 / ☐급여감소 / ☐의료비 증가 / ☐금리 상승 / ☐기타( )
        </p>
      </li>
      <li>상세 사정 기재<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 100px; margin-top: 10px;">
          ${esc(debtCircumstances)}
        </div>
      </li>
    </ol>

    <h3>IV. 과거 면책절차 등의 이용 상황</h3>

    <table>
      <tr>
        <th style="width: 25%; text-align: center;">절차</th>
        <th style="width: 25%; text-align: center;">법원 또는 기관</th>
        <th style="width: 25%; text-align: center;">신청시기</th>
        <th style="width: 25%; text-align: center;">현재까지 진행상황</th>
      </tr>
      <tr>
        <td style="text-align: center;">□ 파산·면책절차</td>
        <td style="height: 40px;"></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="text-align: center;">□ 화의·회생·개인회생절차</td>
        <td style="height: 40px;"></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="text-align: center;">□ 신용회복위원회 워크아웃</td>
        <td style="height: 40px;">( )회</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td style="text-align: center;">□ 배드뱅크</td>
        <td style="height: 40px;">( )원 변제</td>
        <td></td>
        <td></td>
      </tr>
    </table>
  `;

  return wrapDocument(content, '진술서');
}

/**
 * 7. 변제계획안 생성
 */
function generateRepaymentPlan(data: DocumentData): string {
  const app = data.application || {};
  const planSections = data.planSections || [];
  const incomeSettings = data.incomeSettings || {};
  const creditorSettings = data.creditorSettings || {};

  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const agentName = app.agent_name || '';
  const agentFirm = app.agent_firm || '';
  const caseNumber = app.case_number || '2026 개회 호';

  const annualIncome = incomeSettings.annual_income || 0;
  const monthlyIncome = annualIncome / 12;
  const livingExpense = incomeSettings.living_expense || 0;
  const availableIncome = monthlyIncome - livingExpense;

  const planStartDate = planSections[0]?.start_date || '';
  const planEndDate = planSections[0]?.end_date || '';
  const planDurationMonths = planSections[0]?.duration_months || 36;

  let creditorTableRows = '';
  (data.creditors || []).forEach((cred: any, idx: number) => {
    const bondNumber = cred.bond_number || String(idx + 1);
    const creditorName = cred.creditor_name || '';
    const principalAmount = cred.capital || 0;
    const monthlyPayment = (principalAmount / planDurationMonths) || 0;
    const totalPayment = monthlyPayment * planDurationMonths;

    creditorTableRows += `
      <tr>
        <td style="text-align: center;">${esc(bondNumber)}</td>
        <td style="text-align: center;">${esc(creditorName)}</td>
        <td style="text-align: right;">${formatAmount(principalAmount)}</td>
        <td style="text-align: right;">${formatAmount(monthlyPayment)}</td>
        <td style="text-align: right;">${formatAmount(totalPayment)}</td>
      </tr>
    `;
  });

  const content = `
    <h1>변 제 계 획(안)</h1>

    <p style="text-align: center; margin-bottom: 30px;">
      사 건: ${esc(caseNumber)} 개인회생<br/>
      채 무 자: ${esc(debtorName)}<br/>
      대 리 인: ${esc(agentFirm)} / 변호사 ${esc(agentName)}
    </p>

    <p style="text-align: center; margin-bottom: 20px;">
      채무자는 별지와 같이 변제계획안을 작성하여 제출하니 인가하여 주시기 바랍니다.
    </p>

    <div class="signature-area">
      <p style="margin-top: 40px;">2026년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
      <div style="display: inline-block; margin: 20px 30px;">
        <p>채무자</p>
        <div class="signature-line"></div>
      </div>
      <div style="display: inline-block; margin: 20px 30px;">
        <p>대리인</p>
        <div class="signature-line"></div>
      </div>
    </div>

    <div class="page-break"></div>

    <h1>변 제 계 획(안)</h1>

    <p style="text-align: right; margin-bottom: 20px;">
      ${formatDate(new Date().toISOString())} 작성
    </p>

    <h3>1. 변제기간</h3>
    <p>
      [ ${new Date(planStartDate).getFullYear()} ]년 [ ${String(new Date(planStartDate).getMonth() + 1).padStart(2, '0')} ]월 [ ${String(new Date(planStartDate).getDate()).padStart(2, '0')} ]일부터
      [ ${new Date(planEndDate).getFullYear()} ]년 [ ${String(new Date(planEndDate).getMonth() + 1).padStart(2, '0')} ]월 [ ${String(new Date(planEndDate).getDate()).padStart(2, '0')} ]일까지
      [ ${planDurationMonths} ]개월간
    </p>

    <h3>2. 변제에 제공되는 소득 또는 재산</h3>

    <p><strong>가. 소득</strong></p>
    <table style="margin: 10px 0;">
      <tr>
        <th style="width: 50%; text-align: center;">항목</th>
        <th style="width: 50%; text-align: center;">금액</th>
      </tr>
      <tr>
        <td>(1) 수입</td>
        <td style="text-align: right;">${formatAmount(annualIncome)}/년</td>
      </tr>
      <tr>
        <td>(2) 생계비</td>
        <td style="text-align: right;">${formatAmount(livingExpense)}/월</td>
      </tr>
      <tr>
        <td>(3) 가용소득</td>
        <td style="text-align: right;">${formatAmount(availableIncome)}/월</td>
      </tr>
    </table>

    <p style="margin-top: 15px;"><strong>나. 기타 개인회생재단채권</strong> [ 해당있음 □ / 해당없음 ■ ]</p>

    <h3>3. 기타 개인회생재단채권에 대한 변제</h3>
    <p style="height: 40px;"></p>

    <h3>4. 일반의 우선권 있는 개인회생채권에 대한 변제</h3>
    <p style="height: 40px;"></p>

    <h3>5. 별제권부 채권 및 이에 준하는 채권의 처리</h3>
    <p>[ 해당있음 ■ / 해당없음 □ ]</p>

    <p><strong>가. 채권의 내용</strong></p>
    <table style="margin: 10px 0;">
      <tr>
        <th style="width: 15%; text-align: center;">채권번호</th>
        <th style="width: 25%; text-align: center;">채권자</th>
        <th style="width: 20%; text-align: center;">채권액</th>
        <th style="width: 20%; text-align: center;">월변제액</th>
        <th style="width: 20%; text-align: center;">총변제액</th>
      </tr>
      ${creditorTableRows}
    </table>

    <div class="page-break"></div>

    <h3>개인회생채권 변제예정액표</h3>

    <h4>1. 기초사항</h4>
    <p><strong>가. 채무자의 가용소득</strong></p>
    <table style="margin: 10px 0;">
      <tr>
        <th style="width: 30%; text-align: center;">항목</th>
        <th style="width: 20%; text-align: center;">월액</th>
        <th style="width: 20%; text-align: center;">연액</th>
        <th style="width: 30%; text-align: center;">비고</th>
      </tr>
      <tr>
        <td style="text-align: center;">가용소득</td>
        <td style="text-align: right;">${formatAmount(availableIncome)}</td>
        <td style="text-align: right;">${formatAmount(availableIncome * 12)}</td>
        <td></td>
      </tr>
    </table>

    <h4>2. 채권자별 변제예정액의 산정내역 및 변제율</h4>
    <p style="height: 60px; border: 1px solid #000;"></p>

    <h4>3. 청산가치와의 비교</h4>
    <p style="height: 60px; border: 1px solid #000;"></p>

    <div class="page-break"></div>

    <h3>별표(1) 가용소득에 의한 변제 내역</h3>

    <table style="font-size: 10pt;">
      <tr>
        <th style="width: 8%; text-align: center;">회차</th>
        <th style="width: 15%; text-align: center;">채권번호</th>
        <th style="width: 20%; text-align: center;">채권자</th>
        <th style="width: 15%; text-align: center;">(D)개인회생<br/>채권액</th>
        <th style="width: 15%; text-align: center;">(E)월변제<br/>예정액</th>
        <th style="width: 15%; text-align: center;">(F)총변제<br/>예정액</th>
        <th style="width: 12%; text-align: center;">비고</th>
      </tr>
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px 0;">
          [36회차 변제 일정표]
        </td>
      </tr>
    </table>
  `;

  return wrapDocument(content, '변제계획안');
}

// ─── 메인 문서 생성 함수 ───

/**
 * 문서 타입에 따라 해당 HTML 문서를 생성합니다.
 */
export function generateDocument(type: DocumentType, data: DocumentData): string {
  switch (type) {
    case 'application':
      return generateApplication(data);
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
    case 'repayment_plan':
      return generateRepaymentPlan(data);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}
