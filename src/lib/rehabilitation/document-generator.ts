import { adjustLivingCost } from './median-income';
import { computeMonthlyAvailable } from './monthly-available';
import { decideRepaymentPeriod, type RepaymentPeriod } from './repayment-period';
import { decidePeriodSetting, type PeriodSetting } from './period-setting';
import { buildAdjustedSchedule } from './rounding';

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
  | 'delegation_with_attorney'
  | 'attorney_designation'
  | 'prohibition_order'
  | 'stay_order'
  | 'creditor_list'
  | 'property_list'
  | 'income_statement'
  | 'affidavit'
  | 'repayment_plan'
  | 'cover_page'
  | 'creditor_summary'
  | 'document_checklist';

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
      font-family: '휴먼명조', 'Batang', serif;
      font-size: 12pt;
      color: #000;
      line-height: 200%;
      background: white;
    }

    @page {
      size: A4 portrait;
      margin: 45mm 20mm 30mm 20mm;
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
      font-size: 10pt;
      line-height: 160%;
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
  const courtName = app.court_name || app.court_detail || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorPhone = app.phone_mobile || app.phone || '';
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const agentEmail = app.agent_email || '';
  const agentFax = app.agent_fax || '';
  const agentLawFirm = app.agent_law_firm || agentName || '';

  // colaw 형식: "인천지방법원 2025 개회 101101 호" → cases.case_number에 "2025 개회 101101" 형태로 저장됨
  const headerLine = courtName && caseNumber
    ? `${courtName} ${caseNumber} 호`
    : courtName
      ? `${courtName}`
      : '';

  const content = `
    <div class="header-line">
      ${esc(headerLine)}
    </div>

    <h1>개 시 신 청 서</h1>

    <div class="section">
      <h3>신청서</h3>
      <table>
        <tr>
          <td style="width: 30%;">채무자</td>
          <td>${esc(debtorName)} (${esc(debtorBirth)}-*******)</td>
        </tr>
        <tr>
          <td>전화번호</td>
          <td>${esc(debtorPhone)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>대리인</h3>
      <table>
        <tr>
          <td style="width: 30%;">법무법인</td>
          <td>${esc(agentLawFirm)}</td>
        </tr>
        <tr>
          <td>담당자</td>
          <td>${esc(agentName)}</td>
        </tr>
        <tr>
          <td>전화</td>
          <td>${esc(agentPhone)}</td>
        </tr>
        ${agentFax ? `<tr><td>팩스</td><td>${esc(agentFax)}</td></tr>` : ''}
        <tr>
          <td>전자메일</td>
          <td>${esc(agentEmail)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>신청의 취지</h3>
      <p>채무자에 대하여 개인회생절차를 개시한다.</p>
      <p>라는 결정을 구합니다.</p>
    </div>

    <div class="section">
      <h3>첨부서류</h3>
      <p>1. 채권자목록 1통</p>
      <p>2. 재산목록 1통</p>
      <p>3. 수입 및 지출에 관한 목록 1통</p>
      <p>4. 진술서 1통</p>
      <p>5. 변제계획안 1통</p>
      <p>6. 위임장 1통</p>
    </div>

    <div class="signature-area">
      <p>${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
      <div style="margin-top: 40px;">
        <div style="display: inline-block; margin: 0 30px;">
          <p>채무자 ${esc(debtorName)}</p>
          <div class="signature-line"></div>
        </div>
        <div style="display: inline-block; margin: 0 30px;">
          <p>대리인 ${esc(agentName)}</p>
          <div class="signature-line"></div>
        </div>
      </div>
      <p class="text-center" style="margin-top: 20px;">${esc(courtName)} 귀중</p>
    </div>
  `;

  return wrapDocument(content, '개시신청서');
}

/**
 * 2. 위임장 생성
 */
function generateDelegation(data: DocumentData): string {
  const app = data.application || {};
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorPhone = app.phone_mobile || app.phone || '';
  const agentName = app.agent_name || '';
  const agentLawFirm = app.agent_law_firm || agentName || '';
  const agentPhone = app.agent_phone || '';
  const agentEmail = app.agent_email || '';

  const content = `
    <h1>위 임 장</h1>

    <div class="section">
      <p style="text-align: center; margin-bottom: 20px;">
        ${courtName && caseNumber ? `사 건: ${esc(courtName)} ${esc(caseNumber)} 개인회생` : ''}
      </p>
    </div>

    <div class="section">
      <h3>위임인 (채무자)</h3>
      <table>
        <tr>
          <td style="width: 30%;">성명</td>
          <td>${esc(debtorName)}</td>
        </tr>
        <tr>
          <td>주민번호</td>
          <td>${esc(debtorBirth)}-*******</td>
        </tr>
        <tr>
          <td>전화번호</td>
          <td>${esc(debtorPhone)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>수임인 (대리인)</h3>
      <table>
        <tr>
          <td style="width: 30%;">법무법인</td>
          <td>${esc(agentLawFirm)}</td>
        </tr>
        <tr>
          <td>담당자</td>
          <td>${esc(agentName)}</td>
        </tr>
        <tr>
          <td>전화</td>
          <td>${esc(agentPhone)}</td>
        </tr>
        <tr>
          <td>전자메일</td>
          <td>${esc(agentEmail)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3>위임사항</h3>
      <p>1. 개인회생 개시신청 및 변제계획안 제출</p>
      <p>2. 개인회생절차에 관한 일체의 행위</p>
      <p>3. 채권자 이의에 대한 대응</p>
      <p>4. 변제계획 인가결정에 관한 행위</p>
      <p>5. 기타 개인회생절차에 부수하는 행위</p>
    </div>

    <div class="signature-area">
      <p>${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
      <div style="margin-top: 30px;">
        <p>위임자 ${esc(debtorName)}</p>
        <div class="signature-line"></div>
      </div>
      <p class="text-center" style="margin-top: 20px;">${esc(courtName)} 귀중</p>
    </div>
  `;

  return wrapDocument(content, '위임장');
}

/**
 * 2-1. 위임장 + 담당변호사지정서 (법무법인인 경우)
 *
 * 대리인이 법무법인인 경우 위임장에 법무법인명 + 대표변호사 + 담당변호사지정서를
 * 함께 출력합니다. (한 문서로 연속 출력)
 */
function generateDelegationWithAttorney(data: DocumentData): string {
  const app = data.application || {};
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorPhone = app.phone_mobile || app.phone || '';
  const debtorAddr = app.current_address?.address || app.registered_address?.address || '';
  const agentLawFirm = app.agent_law_firm || '';
  const agentName = app.agent_name || ''; // 담당변호사
  const agentPhone = app.agent_phone || '';
  const agentFax = app.agent_fax || '';
  const agentEmail = app.agent_email || '';
  const agentAddr = app.agent_address?.address || '';
  const agentZip = app.agent_address?.postal_code || '';
  const representativeLawyer = app.representative_lawyer || ''; // 대표변호사

  const content = `
    <h1>위 임 장</h1>

    <div class="section">
      <p style="text-align: center; margin-bottom: 20px;">
        ${courtName && caseNumber ? `사 건: ${esc(courtName)} ${esc(caseNumber)} 개인회생` : ''}
      </p>
    </div>

    <div class="section">
      <h3>위임인 (채무자)</h3>
      <table>
        <tr><td style="width: 25%;">성 명</td><td>${esc(debtorName)}</td></tr>
        <tr><td>주민등록번호</td><td>${esc(debtorBirth)}-*******</td></tr>
        <tr><td>주 소</td><td>${esc(debtorAddr)}</td></tr>
        <tr><td>전화번호</td><td>${esc(debtorPhone)}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>수임인 (대리인)</h3>
      <table>
        <tr><td style="width: 25%;">법무법인</td><td>${esc(agentLawFirm)}</td></tr>
        <tr><td>대표변호사</td><td>${esc(representativeLawyer)}</td></tr>
        <tr><td>담당변호사</td><td>${esc(agentName)}</td></tr>
        <tr><td>사무소 주소</td><td>${agentZip ? `(${esc(agentZip)}) ` : ''}${esc(agentAddr)}</td></tr>
        <tr><td>전화</td><td>${esc(agentPhone)}</td></tr>
        <tr><td>팩스</td><td>${esc(agentFax)}</td></tr>
        <tr><td>전자우편</td><td>${esc(agentEmail)}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>위임사항</h3>
      <p>위 위임인은 아래 사건에 관하여 위 수임인을 대리인으로 선임하고, 다음 사항을 위임합니다.</p>
      <ol>
        <li>개인회생절차 개시신청 및 변제계획안 제출에 관한 행위</li>
        <li>개인회생절차에 관한 일체의 소송행위</li>
        <li>채권자 이의 및 이의에 대한 대응</li>
        <li>변제계획 인가결정에 관한 행위</li>
        <li>강제집행 금지·중지 명령 신청</li>
        <li>기타 개인회생절차에 부수하는 일체의 행위</li>
      </ol>
    </div>

    <div class="signature-area">
      <p>${formatDate(new Date())}</p>
      <div style="margin-top: 30px; text-align: right;">
        <p>위임인: ${esc(debtorName)} (인)</p>
      </div>
      <p class="text-center" style="margin-top: 40px;">${esc(courtName)} 귀중</p>
    </div>

    <div class="page-break"></div>

    ${generateAttorneyDesignationContent(data)}
  `;

  return wrapDocument(content, '위임장 및 담당변호사지정서');
}

/**
 * 2-2. 담당변호사지정서 (단독 출력용)
 */
function generateAttorneyDesignation(data: DocumentData): string {
  const content = generateAttorneyDesignationContent(data);
  return wrapDocument(content, '담당변호사지정서');
}

/**
 * 담당변호사지정서 내용 (공용 헬퍼)
 */
function generateAttorneyDesignationContent(data: DocumentData): string {
  const app = data.application || {};
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const agentLawFirm = app.agent_law_firm || '';
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const representativeLawyer = app.representative_lawyer || '';

  return `
    <h1>담당변호사 지정서</h1>

    <div class="section">
      <p style="text-align: center; margin-bottom: 20px;">
        ${courtName && caseNumber ? `사 건: ${esc(courtName)} ${esc(caseNumber)} 개인회생` : ''}
      </p>
      <p style="text-align: center; margin-bottom: 30px;">
        채무자: ${esc(debtorName)}
      </p>
    </div>

    <div class="section">
      <p>위 사건에 관하여 ${esc(agentLawFirm)}은(는) 소속 변호사 중 아래 변호사를 담당변호사로 지정합니다.</p>
    </div>

    <div class="section" style="margin-top: 30px;">
      <table>
        <tr><td style="width: 30%; text-align: center;">법무법인</td><td>${esc(agentLawFirm)}</td></tr>
        <tr><td style="text-align: center;">대표변호사</td><td>${esc(representativeLawyer)}</td></tr>
        <tr><td style="text-align: center;">담당변호사</td><td>${esc(agentName)}</td></tr>
        <tr><td style="text-align: center;">연락처</td><td>${esc(agentPhone)}</td></tr>
      </table>
    </div>

    <div class="signature-area">
      <p>${formatDate(new Date())}</p>
      <div style="margin-top: 30px; text-align: right;">
        <p>${esc(agentLawFirm)}</p>
        <p>대표변호사 ${esc(representativeLawyer)} (직인)</p>
      </div>
      <p class="text-center" style="margin-top: 40px;">${esc(courtName)} 귀중</p>
    </div>
  `;
}

/**
 * 3. 금지명령신청서
 *
 * 개인회생 신청 시 반드시 함께 제출하는 필수 문서입니다.
 * 채무자 회생 및 파산에 관한 법률 제593조 제1항에 의한 금지명령을 신청합니다.
 */
function generateProhibitionOrder(data: DocumentData): string {
  const app = data.application || {};
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorAddr = app.current_address?.address || app.registered_address?.address || '';
  const debtorPhone = app.phone_mobile || app.phone || '';
  const agentLawFirm = app.agent_law_firm || '';
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const agentFax = app.agent_fax || '';
  const agentAddr = app.agent_address?.address || '';
  const agentZip = app.agent_address?.postal_code || '';
  const representativeLawyer = app.representative_lawyer || '';

  // 채권자 목록 (금지명령 대상)
  const creditors = data.creditors || [];
  const totalDebt = data.incomeSettings?.total_debt || creditors.reduce(
    (sum: number, c: Record<string, any>) => sum + (Number(c.capital) || 0) + (Number(c.interest) || 0), 0
  );

  // 대리인 표기
  const agentSection = agentLawFirm
    ? `<p style="margin-left: 40px;">대리인 ${esc(agentLawFirm)}</p>
       <p style="margin-left: 40px;">담당변호사 ${esc(agentName)}</p>`
    : agentName
      ? `<p style="margin-left: 40px;">대리인 ${esc(agentName)}</p>`
      : '';

  const content = `
    <h1>금 지 명 령 신 청 서</h1>

    <div class="section">
      <p style="text-align: center; margin-bottom: 20px;">
        ${courtName && caseNumber ? `사 건 ${esc(caseNumber)} 개인회생` : ''}
      </p>
    </div>

    <div class="section">
      <p>신청인(채무자) ${esc(debtorName)} (${esc(debtorBirth)}-*******)</p>
      <p style="margin-left: 40px;">${esc(debtorAddr)}</p>
      <p style="margin-left: 40px;">전화: ${esc(debtorPhone)}</p>
      ${agentSection}
      ${agentAddr ? `<p style="margin-left: 40px;">${agentZip ? `(${esc(agentZip)}) ` : ''}${esc(agentAddr)}</p>` : ''}
      ${agentPhone ? `<p style="margin-left: 40px;">전화: ${esc(agentPhone)}${agentFax ? `, 팩스: ${esc(agentFax)}` : ''}</p>` : ''}
    </div>

    <div class="section">
      <h3 style="text-align: center;">신 청 취 지</h3>
      <div class="info-box">
        <p>"신청인에 대한 개인회생절차 개시결정 전까지, 신청인의 재산 및 이에 대한 강제집행·가압류·가처분(이하 '강제집행 등'이라 한다)을 금지한다."</p>
        <p>라는 결정을 구합니다.</p>
      </div>
    </div>

    <div class="section">
      <h3 style="text-align: center;">신 청 이 유</h3>

      <p><strong>1. 개인회생절차 개시신청</strong></p>
      <p style="text-indent: 20px;">신청인은 ${formatDate(app.application_date) || formatDate(new Date())} ${esc(courtName)}에 개인회생절차 개시를 신청하였습니다.</p>

      <p style="margin-top: 15px;"><strong>2. 금지명령의 필요성</strong></p>
      <p style="text-indent: 20px;">신청인의 총 채무액은 ${formatAmount(totalDebt)}이며, 채권자는 총 ${creditors.length}명(개)입니다. 개인회생절차 개시결정 전에 채권자들의 강제집행 등이 이루어질 경우, 신청인의 재산이 산일되어 변제계획의 수행이 불가능해질 우려가 있습니다.</p>
      <p style="text-indent: 20px;">따라서 채무자 회생 및 파산에 관한 법률 제593조 제1항에 의하여, 개인회생절차 개시결정 시까지 신청인의 재산에 대한 강제집행 등을 금지하여 주시기 바랍니다.</p>

      <p style="margin-top: 15px;"><strong>3. 소명방법</strong></p>
      <p style="text-indent: 20px;">1. 개인회생 개시신청서 사본</p>
      <p style="text-indent: 20px;">2. 채권자목록</p>
      <p style="text-indent: 20px;">3. 재산목록</p>
      <p style="text-indent: 20px;">4. 수입 및 지출에 관한 목록</p>
    </div>

    <div class="signature-area">
      <p>${formatDate(new Date())}</p>
      <div style="margin-top: 20px; text-align: right;">
        <p>신청인(채무자) ${esc(debtorName)}</p>
        ${agentLawFirm
          ? `<p>대리인 ${esc(agentLawFirm)}</p><p>담당변호사 ${esc(agentName)} (인)</p>`
          : agentName ? `<p>대리인 ${esc(agentName)} (인)</p>` : ''}
      </div>
      <p class="text-center" style="margin-top: 40px;">${esc(courtName)} 귀중</p>
    </div>
  `;

  return wrapDocument(content, '금지명령신청서');
}

/**
 * 4. 중지명령신청서
 *
 * 강제집행이 진행 중일 때 이를 중지하기 위한 문서입니다.
 * 채무자 회생 및 파산에 관한 법률 제593조 제3항에 의한 중지명령을 신청합니다.
 */
function generateStayOrder(data: DocumentData): string {
  const app = data.application || {};
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';
  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorAddr = app.current_address?.address || app.registered_address?.address || '';
  const debtorPhone = app.phone_mobile || app.phone || '';
  const agentLawFirm = app.agent_law_firm || '';
  const agentName = app.agent_name || '';
  const agentPhone = app.agent_phone || '';
  const agentFax = app.agent_fax || '';
  const agentAddr = app.agent_address?.address || '';
  const agentZip = app.agent_address?.postal_code || '';
  const representativeLawyer = app.representative_lawyer || '';

  const agentSection = agentLawFirm
    ? `<p style="margin-left: 40px;">대리인 ${esc(agentLawFirm)}</p>
       <p style="margin-left: 40px;">담당변호사 ${esc(agentName)}</p>`
    : agentName
      ? `<p style="margin-left: 40px;">대리인 ${esc(agentName)}</p>`
      : '';

  const content = `
    <h1>중 지 명 령 신 청 서</h1>

    <div class="section">
      <p style="text-align: center; margin-bottom: 20px;">
        ${courtName && caseNumber ? `사 건 ${esc(caseNumber)} 개인회생` : ''}
      </p>
    </div>

    <div class="section">
      <p>신청인(채무자) ${esc(debtorName)} (${esc(debtorBirth)}-*******)</p>
      <p style="margin-left: 40px;">${esc(debtorAddr)}</p>
      <p style="margin-left: 40px;">전화: ${esc(debtorPhone)}</p>
      ${agentSection}
      ${agentAddr ? `<p style="margin-left: 40px;">${agentZip ? `(${esc(agentZip)}) ` : ''}${esc(agentAddr)}</p>` : ''}
      ${agentPhone ? `<p style="margin-left: 40px;">전화: ${esc(agentPhone)}${agentFax ? `, 팩스: ${esc(agentFax)}` : ''}</p>` : ''}
    </div>

    <div class="section">
      <h3 style="text-align: center;">신 청 취 지</h3>
      <div class="info-box">
        <p>"신청인에 대하여 현재 진행 중인 강제집행·가압류·가처분 절차를 중지한다."</p>
        <p>라는 결정을 구합니다.</p>
      </div>
    </div>

    <div class="section">
      <h3 style="text-align: center;">신 청 이 유</h3>

      <p><strong>1. 개인회생절차 개시신청</strong></p>
      <p style="text-indent: 20px;">신청인은 ${formatDate(app.application_date) || formatDate(new Date())} ${esc(courtName)}에 개인회생절차 개시를 신청하였습니다.</p>

      <p style="margin-top: 15px;"><strong>2. 강제집행 현황 및 중지의 필요성</strong></p>
      <p style="text-indent: 20px;">현재 신청인의 재산(급여 등)에 대한 강제집행이 진행 중이며, 이로 인해 변제계획에 따른 변제의 수행이 현저히 곤란해질 우려가 있습니다.</p>
      <p style="text-indent: 20px;">채무자 회생 및 파산에 관한 법률 제593조 제3항에 의하면, 법원은 개인회생절차 개시신청이 있는 경우 필요하다고 인정하는 때에는 이해관계인의 신청이나 직권으로 강제집행 등의 중지를 명할 수 있으므로, 위 신청취지와 같은 중지명령을 구합니다.</p>

      <p style="margin-top: 15px;"><strong>3. 소명방법</strong></p>
      <p style="text-indent: 20px;">1. 개인회생 개시신청서 사본</p>
      <p style="text-indent: 20px;">2. 강제집행 진행 사실을 소명하는 자료</p>
      <p style="text-indent: 20px;">3. 채권자목록</p>
      <p style="text-indent: 20px;">4. 재산목록</p>
    </div>

    <div class="signature-area">
      <p>${formatDate(new Date())}</p>
      <div style="margin-top: 20px; text-align: right;">
        <p>신청인(채무자) ${esc(debtorName)}</p>
        ${agentLawFirm
          ? `<p>대리인 ${esc(agentLawFirm)}</p><p>담당변호사 ${esc(agentName)} (인)</p>`
          : agentName ? `<p>대리인 ${esc(agentName)} (인)</p>` : ''}
      </div>
      <p class="text-center" style="margin-top: 40px;">${esc(courtName)} 귀중</p>
    </div>
  `;

  return wrapDocument(content, '중지명령신청서');
}

/**
 * 별제권부채권 테이블 생성 헬퍼
 * 담보부 채권자가 있으면 동적으로 행을 생성하고, 없으면 빈 행을 표시합니다.
 */
function generateSecuredCreditorTable(
  creditors: Record<string, any>[],
  securedProperties: Record<string, any>[],
  assessmentDate: string
): string {
  const securedCreditors = creditors.filter((c: any) => c.is_secured);

  // 담보물건 ID → 담보물건 정보 맵
  const propertyMap = new Map<string, any>();
  (securedProperties || []).forEach((p: any) => {
    if (p.id) propertyMap.set(p.id, p);
  });

  let securedRows = '';
  let securedTotalClaim = 0;
  let securedTotalExpectedRepay = 0;
  let securedTotalUnrecoverable = 0;
  let securedTotalSecuredAmount = 0;
  let lienDetailsRows = '';

  if (securedCreditors.length === 0) {
    // 담보부 채권이 없는 경우 — 빈 행 표시
    securedRows = `
      <tr>
        <td colspan="6" style="height: 60px; text-align: center; color: #888; vertical-align: middle;">
          해당 사항 없음
        </td>
      </tr>`;
    lienDetailsRows = `
      <tr>
        <td colspan="5" style="height: 40px; text-align: center; color: #888; vertical-align: middle;">
          해당 사항 없음
        </td>
      </tr>`;
  } else {
    securedCreditors.forEach((cred: any) => {
      const bondNumber = cred.bond_number || '';
      const creditorName = cred.creditor_name || '';
      const capital = Number(cred.capital) || 0;
      const interest = Number(cred.interest) || 0;
      const totalClaim = capital + interest;
      const maxClaimAmount = Number(cred.max_claim_amount) || 0;

      // ③ 별제권행사로 변제예상액: max_claim_amount 또는 채권현재액 중 작은 값
      const expectedRepay = maxClaimAmount > 0 ? Math.min(maxClaimAmount, totalClaim) : 0;
      // ④ 변제받을 수 없는 채권액: 채권현재액 - 변제예상액
      const unrecoverable = Math.max(0, totalClaim - expectedRepay);
      // ⑤ 담보부회생채권액 = ③ 별제권행사변제예상액
      const securedAmount = expectedRepay;

      securedTotalClaim += totalClaim;
      securedTotalExpectedRepay += expectedRepay;
      securedTotalUnrecoverable += unrecoverable;
      securedTotalSecuredAmount += securedAmount;

      securedRows += `
        <tr>
          <td style="text-align: center;">${esc(String(bondNumber))}</td>
          <td style="text-align: center;">${esc(creditorName)}</td>
          <td style="text-align: right; padding-right: 8px;">
            ${formatAmountNoUnit(capital)}원<br/>
            <span style="font-size: 9pt; color: #555;">(이자 ${formatAmountNoUnit(interest)}원)</span>
          </td>
          <td style="text-align: right; padding-right: 8px;">${formatAmount(expectedRepay)}</td>
          <td style="text-align: right; padding-right: 8px;">${formatAmount(unrecoverable)}</td>
          <td style="text-align: right; padding-right: 8px;">${formatAmount(securedAmount)}</td>
        </tr>`;

      // ⑥ 별제권 등의 내용 및 목적물
      const lienType = cred.lien_type || '';
      const lienPriority = cred.lien_priority || '';
      const property = cred.secured_property_id ? propertyMap.get(cred.secured_property_id) : null;
      const propertyDesc = property
        ? `${property.property_type || ''} ${property.detail || ''}`
        : '';
      lienDetailsRows += `
        <tr>
          <td style="text-align: center;">${esc(String(bondNumber))}</td>
          <td style="text-align: center;">${esc(lienType) || '-'}</td>
          <td style="text-align: center;">${lienPriority ? esc(String(lienPriority)) : '-'}</td>
          <td>${esc(propertyDesc.trim()) || '-'}</td>
          <td style="text-align: right;">${maxClaimAmount > 0 ? formatAmount(maxClaimAmount) : '-'}</td>
        </tr>`;
    });
  }

  return `
    <table>
      <tr>
        <th style="width: 8%; text-align: center;">채권<br/>번호</th>
        <th style="width: 15%; text-align: center;">채권자</th>
        <th style="width: 18%; text-align: center;">①채권현재액<br/>(원금/이자)</th>
        <th style="width: 18%; text-align: center;">③별제권행사등으로<br/>변제가 예상되는<br/>채권액</th>
        <th style="width: 18%; text-align: center;">④별제권행사등으로도<br/>변제받을 수 없을<br/>채권액</th>
        <th style="width: 14%; text-align: center;">⑤담보부<br/>회생채권액</th>
      </tr>
      ${securedRows}
      <tr>
        <td colspan="2" style="text-align: center; font-weight: bold;">합 계</td>
        <td style="text-align: right; padding-right: 8px; font-weight: bold;">${formatAmount(securedTotalClaim)}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: bold;">${formatAmount(securedTotalExpectedRepay)}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: bold;">${formatAmount(securedTotalUnrecoverable)}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: bold;">${formatAmount(securedTotalSecuredAmount)}</td>
      </tr>
    </table>

    <table style="margin-top: 10px;">
      <tr>
        <th colspan="5" style="text-align: center;">⑥별제권 등의 내용 및 목적물</th>
      </tr>
      <tr>
        <th style="width: 8%; text-align: center;">채권<br/>번호</th>
        <th style="width: 20%; text-align: center;">담보종류</th>
        <th style="width: 8%; text-align: center;">순위</th>
        <th style="width: 34%; text-align: center;">목적물</th>
        <th style="width: 15%; text-align: center;">채권최고액</th>
      </tr>
      ${lienDetailsRows}
    </table>`;
}

/**
 * 3. 채권자목록 생성 (Portrait)
 */
function generateCreditorList(data: DocumentData): string {
  const app = data.application || {};
  const creditorSettings = data.creditorSettings || {};
  const creditors = data.creditors || [];

  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  // DB의 court_name 필드 사용, 없으면 court_detail 사용
  const courtName = app.court_name || app.court_detail || '';
  // 사건번호: case_year + case_number 조합, 없으면 case_number 필드 사용
  const caseYear = app.case_year || '';
  const caseNum = app.case_number || '';
  const caseNumberDisplay = caseYear && caseNum
    ? `${caseYear} ${caseNum}`
    : caseNum || `${new Date().getFullYear()} 호`;
  const assessmentDate = creditorSettings.bond_date || creditorSettings.list_date || '';
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
      securedTotal += capital + interest;
    } else {
      unsecuredTotal += capital + interest;
    }
  });

  const totalAmount = totalCapital + totalInterest;

  // colaw 형식: "광주지법 2026 호  채무자 조재근(950809-*******)"
  const headerLine = `${courtName} ${caseNumberDisplay}  채무자 ${esc(debtorName)}(${esc(debtorBirth)}-*******)`;

  // 가지번호 표시를 위해 채권자 정렬: 주채무자 뒤에 보증채무자 배치
  const sortedCreditors = [...creditors].sort((a: any, b: any) => {
    const aNum = a.bond_number || 0;
    const bNum = b.bond_number || 0;
    // 보증채무자는 parent의 bond_number 기준으로 정렬
    const aParent = a.parent_creditor_id ? creditors.find((p: any) => p.id === a.parent_creditor_id) : null;
    const bParent = b.parent_creditor_id ? creditors.find((p: any) => p.id === b.parent_creditor_id) : null;
    const aSortKey = aParent ? (aParent.bond_number || 0) + (a.sub_number || 0) * 0.01 : aNum;
    const bSortKey = bParent ? (bParent.bond_number || 0) + (b.sub_number || 0) * 0.01 : bNum;
    return aSortKey - bSortKey;
  });

  let creditorRows = '';
  sortedCreditors.forEach((cred: any, idx: number) => {
    // 가지번호: parent가 있으면 "부모번호-자식번호" 형태
    const parentCred = cred.parent_creditor_id
      ? creditors.find((p: any) => p.id === cred.parent_creditor_id)
      : null;
    const bondNumber = parentCred && cred.sub_number != null
      ? `${parentCred.bond_number || '?'}-${cred.sub_number}`
      : String(cred.bond_number || idx + 1);
    const creditorName = cred.creditor_name || '';
    const cause = cred.bond_cause || '';
    const address = cred.address || '';
    const phone = cred.phone || '';
    const fax = cred.fax || '';
    const mobile = cred.mobile || '';
    const capital = cred.capital || 0;
    const interest = cred.interest || 0;
    const totalClaim = capital + interest;
    const capitalCompute = cred.capital_compute || `부채증명서 참조(산정기준일：${formatDate(assessmentDate)})`;
    const interestCompute = cred.interest_compute || `부채증명서 참조(산정기준일：${formatDate(assessmentDate)})`;
    const attachments: number[] = cred.attachments || [];
    const attachmentCheck = attachments.length > 0 ? '■' : '□';
    const attachmentNums = attachments.length > 0 ? ` (${attachments.join(', ')})` : '';

    // 주소/연락처: colaw 형식 — 주소 위에, 전화/팩스/휴대전화 아래에 표시
    const addressHtml = address
      ? `(주소) ${esc(address)}`
      : '';
    const contactParts = [
      phone ? `(전화) ${esc(phone)}` : '',
      fax ? `(팩스) ${esc(fax)}` : '',
      mobile ? `(휴대전화) ${esc(mobile)}` : '',
    ].filter(Boolean).join('&nbsp;&nbsp;&nbsp;');
    const contactHtml = contactParts ? `<br/>${contactParts}` : '';
    const fullAddressHtml = addressHtml || contactParts
      ? `${addressHtml}${contactHtml}`
      : '';

    // 원리금 서술문: bond_content가 있으면 사용, 없으면 기본 형식 생성
    const bondContent = cred.bond_content
      ? esc(cred.bond_content)
      : `원리금 ${formatAmountNoUnit(totalClaim)}원 및 그 중 원금 ${formatAmountNoUnit(capital)}원에 대한 연체이율의 비율에 의한 금원.`;

    // 채권의 원인: colaw 형식 — "YYYY.MM.DD 자 학자금대출" 등
    const causeDisplay = cause || '';

    creditorRows += `
      <tr>
        <td rowspan="4" style="width: 5%; text-align: center; vertical-align: middle;">${esc(String(bondNumber))}</td>
        <td rowspan="4" style="width: 10%; text-align: center; vertical-align: middle;">${esc(creditorName)}</td>
        <td colspan="2" style="width: 30%;">${esc(causeDisplay)}</td>
        <td rowspan="4" style="width: 20%; font-size: 9pt; vertical-align: top; padding: 6px;">${fullAddressHtml}</td>
        <td rowspan="4" style="width: 15%; text-align: center; vertical-align: middle; font-size: 9pt;">${attachmentCheck} 부속서류${attachmentNums}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size: 9pt;">${bondContent}</td>
      </tr>
      <tr>
        <td style="width: 15%; font-size: 9pt; padding: 4px 6px;">채권현재액(원금)<br/><span style="float: right; font-weight: bold;">${formatAmountNoUnit(capital)}원</span></td>
        <td style="width: 15%; font-size: 9pt; padding: 4px 6px;">${esc(capitalCompute)}</td>
      </tr>
      <tr>
        <td style="font-size: 9pt; padding: 4px 6px;">채권현재액(이자)<br/><span style="float: right; font-weight: bold;">${formatAmountNoUnit(interest)}원</span></td>
        <td style="font-size: 9pt; padding: 4px 6px;">${esc(interestCompute)}</td>
      </tr>
    `;
  });

  const content = `
    <div class="header-line">${headerLine}</div>

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
          <td rowspan="3" style="width: 15%; text-align: center; font-weight: bold; vertical-align: middle;">채권현재액</td>
          <th style="width: 8%; text-align: center;">합계</th>
          <td style="width: 17%; text-align: right;">${formatAmount(totalAmount)}</td>
          <td rowspan="3" style="width: 20%; text-align: center; font-weight: bold; vertical-align: middle;">담보부 회생<br/>채권액의 합계</td>
          <td rowspan="3" style="width: 12%; text-align: right; vertical-align: middle;">${formatAmount(securedTotal)}</td>
          <td rowspan="3" style="width: 15%; text-align: center; font-weight: bold; vertical-align: middle;">무담보 회생<br/>채권액의 합계</td>
          <td rowspan="3" style="width: 13%; text-align: right; vertical-align: middle;">${formatAmount(unsecuredTotal)}</td>
        </tr>
        <tr>
          <th style="text-align: center;">원금</th>
          <td style="text-align: right;">${formatAmount(totalCapital)}</td>
        </tr>
        <tr>
          <th style="text-align: center;">이자</th>
          <td style="text-align: right;">${formatAmount(totalInterest)}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 10pt; margin: 15px 0;">
      ※ 개시후이자 등: 아래 각 채권의 개시결정일 이후의 이자·지연손해금 등은 채무자 회생 및 파산에 관한 법률
      제581조 제2항, 제446조 제1항 제1, 2호의 후순위채권입니다.
    </p>

    <table>
      <tr>
        <th rowspan="4" style="width: 5%;">채권<br/>번호</th>
        <th rowspan="4" style="width: 10%;">채권자</th>
        <th colspan="2" style="width: 30%;">채권의 원인</th>
        <th rowspan="4" style="width: 20%;">주소 및 연락처</th>
        <th rowspan="4" style="width: 15%;">부속서류<br/>유무</th>
      </tr>
      <tr>
        <th colspan="2">채권의 내용</th>
      </tr>
      <tr>
        <th style="width: 15%;">채권현재액(원금)</th>
        <th style="width: 15%;">산정근거</th>
      </tr>
      <tr>
        <th>채권현재액(이자)</th>
        <th>산정근거</th>
      </tr>
      ${creditorRows}
    </table>

    <div class="page-break"></div>

    <h3>부속서류 1. 별제권부채권 및 이에 준하는 채권의 내역</h3>

    ${generateSecuredCreditorTable(creditors, data.securedProperties, assessmentDate)}
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

  const deductions = data.propertyDeductions || [];
  const totalDeduction = deductions.reduce((s: number, d: any) => s + (Number(d.deduction_amount) || 0), 0);
  const liquidationValue = Math.max(0, totalValue - totalDeduction);

  let propertyRows = '';
  properties.forEach((prop: any) => {
    const name = prop.detail || prop.category || '';
    const amount = Number(prop.amount) || 0;
    const hasSeizure = prop.seizure || '무';
    const notes = prop.repay_use || '';

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
      ${totalDeduction > 0 ? `<tr>
        <td style="font-weight: bold;">면제재산(공제) 합계</td>
        <td style="text-align: right; font-weight: bold;">${formatAmount(totalDeduction)}</td>
        <td colspan="2"></td>
      </tr>` : ''}
      <tr>
        <td style="font-weight: bold;">청산가치</td>
        <td style="text-align: right; font-weight: bold;">${formatAmount(liquidationValue)}</td>
        <td colspan="2">재산 합계 − 면제재산(공제)</td>
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

  const monthlySalary = Number(incomeSettings.net_salary) || 0;
  const extraIncome = Number(incomeSettings.extra_income) || 0;
  const monthlyIncome = monthlySalary + extraIncome;
  const annualIncome = monthlyIncome * 12;
  const livingExpense = Number(incomeSettings.living_cost) || 0;

  let familyRows = '';
  familyMembers.forEach((member: any) => {
    const relationship = member.relation || '';
    const name = member.member_name || '';
    const age = member.age || '';
    const cohabitation = member.cohabitation || '';
    const job = member.occupation || '';
    const monthlyIncome = Number(member.monthly_income) || 0;
    const totalProperty = Number(member.total_property) || 0;
    const isSupportDependent = member.is_dependent ? '있음' : '없음';

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

  const app = data.application || {};
  const incomeType = app.income_type || 'salary';
  const employerName = app.employer_name || '';
  const dependentCount = familyMembers.filter((m: any) => m.is_dependent).length + 1;

  const content = `
    <h1>수입 및 지출에 관한 목록</h1>

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
        <th style="width: 15%; text-align: center;">명목</th>
        <th style="width: 20%; text-align: center;">기간구분</th>
        <th style="width: 20%; text-align: center;">금액</th>
        <th style="width: 20%; text-align: center;">연간환산금액</th>
        <th style="width: 25%; text-align: center;">압류, 가압류 등 유무</th>
      </tr>
      <tr>
        <td style="text-align: center;">급여소득</td>
        <td style="text-align: center;">월</td>
        <td style="text-align: right;">${formatAmount(monthlySalary)}</td>
        <td style="text-align: right;">${formatAmount(annualIncome)}</td>
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

    <h3>II. 변제계획 수행시의 예상지출목록</h3>

    <p>
      ■채무자가 예상하는 생계비가 보건복지부 공표 기준 중위소득의 100분의 60 이하인 경우<br/>
      보건복지부 공표 (${dependentCount})인 가구 기준 중위 소득의 약 (60)%인 ${formatAmount(livingExpense)}을 지출할 것으로 예상됩니다.
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
      ${familyRows || '<tr><td colspan="8" style="text-align: center; padding: 15px; color: #666;">해당 없음</td></tr>'}
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

  // income_change에 JSON 구조 데이터 저장됨
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
  const repayFeasibility = affidavit.repay_feasibility || '';

  const content = `
    <h1>진 술 서</h1>

    <h3>I. 경력</h3>

    <ol style="margin-left: 20px;">
      <li>최종학력: ${esc(educationYear) || 'YYYY'}년도 : ${esc(finalEducation)} (${esc(graduationStatus)})</li>
      <li>과거 경력 (최근 경력부터 기재하여 주십시오)
        <table style="margin-top: 10px;">
          <tr>
            <th style="width: 20%; text-align: center;">기간</th>
            <th style="width: 20%; text-align: center;">업종</th>
            <th style="width: 25%; text-align: center;">직장명</th>
            <th style="width: 35%; text-align: center;">직위</th>
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
        <th style="width: 15%; text-align: center;">거주관계</th>
        <th style="width: 85%; text-align: center;">상세 내역</th>
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

    <h3>III. 부채 상황</h3>

    <ol style="margin-left: 20px;">
      <li>채권자로부터 소송, 지급명령, 전부명령, 압류, 가압류 등을 받은 경험( ${esc(debtHasLawsuit)} )</li>
      <li>개인회생절차에 이르게 된 채무 경위<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 100px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(debtCircumstances) || '(미입력)'}
        </div>
      </li>
      <li>채무 증가 경위<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(debtIncreaseReason) || '(미입력)'}
        </div>
      </li>
      <li>현재 상황<br/>
        <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-top: 10px; white-space: pre-wrap;">
          ${esc(currentSituation) || '(미입력)'}
        </div>
      </li>
    </ol>

    <h3>IV. 향후 계획 및 반성</h3>

    <div style="border: 1px solid #000; padding: 10px; min-height: 120px; white-space: pre-wrap;">
      ${esc(repayFeasibility) || '(미입력)'}
    </div>
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

  const debtorName = app.applicant_name || '';
  const debtorBirth = app.resident_number_front || '';
  const agentName = app.agent_name || '';
  const agentFirm = app.agent_law_firm || (app.agent_type ? `${app.agent_type} 사무소` : '');
  const courtName = app.court_name || '';
  const caseNumber = app.case_number || '';

  // 소득: DB 컬럼은 net_salary(월)
  const monthlySalary = Number(incomeSettings.net_salary) || 0;
  const extraIncome = Number(incomeSettings.extra_income) || 0;
  const monthlyIncome = monthlySalary + extraIncome;
  const annualIncome = monthlyIncome * 12;

  // 가구원 수: family_members 중 is_dependent=true인 부양가족 + 본인
  const dependents = (data.familyMembers || []).filter((m: any) => m.is_dependent).length;
  const householdSize = 1 + dependents;

  // caseYear 결정: filing_date(=application_date) 연도 → created_at → 현재연도
  const yearFromDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  };
  const caseYear =
    yearFromDate(app.application_date) ??
    yearFromDate(app.created_at) ??
    new Date().getFullYear();
  const incomeYear = Number(incomeSettings.median_income_year) || caseYear;

  // P1-7: 월가용소득 공식 확장 (생계비율, 추가생계비, 양육비, 회생위원보수 통합)
  const monthlyResult = computeMonthlyAvailable({
    monthlyIncome,
    householdSize,
    year: incomeYear,
    livingCostRate: Number(incomeSettings.living_cost_rate) || 100,
    extraFamilyLowMoney: Number(incomeSettings.extra_living_cost) || 0,
    childSupport: Number(incomeSettings.child_support) || 0,
    trusteeCommissionRate: Number(incomeSettings.trustee_comm_rate) || 0,
  });
  const livingExpense = monthlyResult.livingCost.applied;
  const availableIncome = monthlyResult.monthlyAvailable;

  // P1-1 호환: livingCostAdjusted 변수 (안내 배너용)
  const livingCostInput = Number(incomeSettings.living_cost) || 0;
  const livingCostAdjusted = adjustLivingCost(livingCostInput, householdSize, incomeYear);

  // 잔여 변수 (하위 코드 호환)
  const extraLivingCost = monthlyResult.livingCost.extraFamilyLowMoney;
  const childSupport = monthlyResult.childSupport;

  // 변제기간 자동결정 (P1-8): 6규칙 + 청산가치 보장 post-step
  const explicitMonths = Number(incomeSettings.repay_months) || 0;
  const forcedMonths: RepaymentPeriod | undefined =
    explicitMonths === 36 || explicitMonths === 48 || explicitMonths === 60
      ? (explicitMonths as RepaymentPeriod)
      : undefined;
  const periodSetting = (Number(incomeSettings.period_setting) || 6) as PeriodSetting;

  // 청산가치
  const totalPropValue = (data.properties || []).reduce(
    (s: number, p: any) => s + (Number(p.amount) || 0),
    0,
  );
  const totalDeduction = (data.propertyDeductions || []).reduce(
    (s: number, d: any) => s + (Number(d.deduction_amount) || 0),
    0,
  );
  const liquidationValueComputed = Math.max(0, totalPropValue - totalDeduction);

  const periodResult = decidePeriodSetting({
    setting: periodSetting,
    creditors: (data.creditors || []).map((c: any) => ({
      capital: Number(c.capital) || 0,
      interest: Number(c.interest) || 0,
      isSecured: !!c.is_secured,
      securedCollateralValue: Number(c.secured_collateral_value) || 0,
      isOtherUnconfirmed: !!c.is_other_unconfirmed,
    })),
    monthlyAvailable: Math.floor(availableIncome),
    liquidationValue: liquidationValueComputed,
    forcedMonths,
  });
  const planDurationMonths: RepaymentPeriod = periodResult.months;
  const repayStartDate = app.repayment_start_date || app.application_date || '';
  let planStartDate = '';
  let planEndDate = '';
  if (repayStartDate) {
    const start = new Date(repayStartDate);
    if (!isNaN(start.getTime())) {
      planStartDate = repayStartDate;
      const end = new Date(start);
      end.setMonth(end.getMonth() + planDurationMonths);
      planEndDate = end.toISOString().slice(0, 10);
    }
  }

  // 채권자별 변제액: 가용소득 기반 안분 계산
  const totalDebt = (data.creditors || []).reduce((sum: number, c: any) => sum + (Number(c.capital) || 0), 0);
  let creditorTableRows = '';
  (data.creditors || []).forEach((cred: any, idx: number) => {
    const bondNumber = cred.bond_number || String(idx + 1);
    const creditorName = cred.creditor_name || '';
    const principalAmount = Number(cred.capital) || 0;
    const ratio = totalDebt > 0 ? principalAmount / totalDebt : 0;
    const monthlyPayment = Math.ceil(availableIncome * ratio);
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
      사 건: ${esc(courtName)} ${esc(caseNumber)} 개인회생<br/>
      채 무 자: ${esc(debtorName)} (${esc(debtorBirth)}-*******)<br/>
      ${agentName ? `대 리 인: ${esc(agentFirm)} ${esc(agentName)}` : ''}
    </p>

    <p style="text-align: center; margin-bottom: 20px;">
      채무자는 별지와 같이 변제계획안을 작성하여 제출하니 인가하여 주시기 바랍니다.
    </p>

    <div class="signature-area">
      <p style="margin-top: 40px;">${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월 ${new Date().getDate()}일</p>
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
      ${planStartDate && !isNaN(new Date(planStartDate).getTime())
        ? `[ ${new Date(planStartDate).getFullYear()} ]년 [ ${String(new Date(planStartDate).getMonth() + 1).padStart(2, '0')} ]월 [ ${String(new Date(planStartDate).getDate()).padStart(2, '0')} ]일부터`
        : '[ ____ ]년 [ __ ]월 [ __ ]일부터'}
      ${planEndDate && !isNaN(new Date(planEndDate).getTime())
        ? `[ ${new Date(planEndDate).getFullYear()} ]년 [ ${String(new Date(planEndDate).getMonth() + 1).padStart(2, '0')} ]월 [ ${String(new Date(planEndDate).getDate()).padStart(2, '0')} ]일까지`
        : '[ ____ ]년 [ __ ]월 [ __ ]일까지'}
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
        <td style="text-align: center;">가용소득 (⑥)</td>
        <td style="text-align: right;">${formatAmount(availableIncome)}</td>
        <td style="text-align: right;">${formatAmount(availableIncome * 12)}</td>
        <td></td>
      </tr>
    </table>

    <p><strong>나. 총변제예정액 및 현재가치</strong></p>
    ${(() => {
      const totalRepay = Math.floor(availableIncome) * planDurationMonths;
      // 라이프니츠 현가계수 (공표 4자리 표값)
      const leibniz: Record<number, number> = { 36: 33.7719, 48: 43.9555, 60: 53.6433 };
      const coef = leibniz[planDurationMonths];
      const presentValue = coef ? Math.round(availableIncome * coef) : null;
      return `
        <table style="margin: 10px 0;">
          <tr>
            <th style="width: 40%; text-align: center;">항목</th>
            <th style="width: 30%; text-align: center;">금액</th>
            <th style="width: 30%; text-align: center;">산식</th>
          </tr>
          <tr>
            <td style="text-align: center;">(K) 가용소득 총변제예정액</td>
            <td style="text-align: right;">${formatAmount(totalRepay)}</td>
            <td style="text-align: center;">월가용 × ${planDurationMonths}</td>
          </tr>
          <tr>
            <td style="text-align: center;">(L) (K)의 현재가치</td>
            <td style="text-align: right;">${presentValue != null ? formatAmount(presentValue) : '— (계수 미확정)'}</td>
            <td style="text-align: center;">${coef ? `월가용 × 라이프니츠 계수(${coef})` : `${planDurationMonths}개월 계수 미확정`}</td>
          </tr>
        </table>`;
    })()}

    ${livingCostAdjusted.belowRecommendedFloor ? `
      <p style="margin-top: 10px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; font-size: 0.9em;">
        ⚠ 입력 생계비(${formatAmount(livingCostInput)})가 ${householdSize}인 가구 기준중위소득 60% 권장선(${formatAmount(livingCostAdjusted.floor)}) 미만입니다. 법원 인정 사유는 소명서에 기재 필요.
      </p>` : ''}

    ${(() => {
      // 변제율 (P1-3): (확정+미확정 변제총액) / (확정+미확정 채권총액)
      const totalClaimMinusSecured = (data.creditors || []).reduce((sum: number, c: any) => {
        const claim = (Number(c.capital) || 0) + (Number(c.interest) || 0);
        if (c.is_secured) {
          const collateral = Math.min(Number(c.secured_collateral_value) || 0, claim);
          return sum + Math.max(0, claim - collateral);
        }
        return sum + claim;
      }, 0);
      const totalRepayAmount = Math.floor(availableIncome) * planDurationMonths;
      const ratePercent = totalClaimMinusSecured > 0
        ? Math.round((totalRepayAmount / totalClaimMinusSecured) * 1000) / 10
        : 0;
      return `
        <p style="margin-top: 8px;">
          <strong>변제율: ${ratePercent}%</strong>
          <span style="color: #666; font-size: 0.85em;">
            (총변제 ${formatAmount(totalRepayAmount)} / 확정+미확정 채권 ${formatAmount(totalClaimMinusSecured)})
          </span>
        </p>`;
    })()}

    <h4>2. 채권자별 변제예정액의 산정내역 및 변제율</h4>
    <table style="margin: 10px 0;">
      <tr>
        <th style="width: 8%; text-align: center;">번호</th>
        <th style="width: 22%; text-align: center;">채권자</th>
        <th style="width: 18%; text-align: center;">(A)채권액</th>
        <th style="width: 18%; text-align: center;">(B)월변제액</th>
        <th style="width: 18%; text-align: center;">(C)총변제액</th>
        <th style="width: 16%; text-align: center;">변제율</th>
      </tr>
      ${(() => {
        // 변제율 단일 분모: 무담보 원금 (이자 제외, 별제권 충당분 제외)
        // 회생법원 양식 + colaw anatomy 39% 일치 — repayment-calculator.getDebtSummary.unsecuredCapital과 동일 산식
        const unsecuredDenom = (data.creditors || []).reduce((sum: number, c: any) => {
          const cap = Number(c.capital) || 0;
          if (c.is_secured) {
            const collateral = Math.min(Number(c.secured_collateral_value) || 0, cap);
            return sum + Math.max(0, cap - collateral);
          }
          return sum + cap;
        }, 0);

        const totalRepayAmount = Math.floor(availableIncome) * planDurationMonths;
        const overallRate = unsecuredDenom > 0
          ? Math.round((totalRepayAmount / unsecuredDenom) * 1000) / 10
          : 0;

        return (data.creditors || []).map((cred: any, idx: number) => {
          const cap = Number(cred.capital) || 0;
          const interest = Number(cred.interest) || 0;
          const credDebt = cap + interest;
          // 채권자별 변제 분모 (무담보 원금 기준): 별제권은 원금 부족액, 일반은 원금 전액
          const credUnsecured = cred.is_secured
            ? Math.max(0, cap - Math.min(Number(cred.secured_collateral_value) || 0, cap))
            : cap;
          const ratio = unsecuredDenom > 0 ? credUnsecured / unsecuredDenom : 0;
          const mPay = Math.round(availableIncome * ratio);
          const tPay = mPay * planDurationMonths;
          const rRate = credUnsecured > 0 ? ((tPay / credUnsecured) * 100).toFixed(1) : '0.0';
          return `<tr>
            <td style="text-align: center;">${cred.bond_number || idx + 1}</td>
            <td style="text-align: center;">${esc(cred.creditor_name || '')}</td>
            <td style="text-align: right;">${formatAmount(credDebt)}</td>
            <td style="text-align: right;">${formatAmount(mPay)}</td>
            <td style="text-align: right;">${formatAmount(tPay)}</td>
            <td style="text-align: center;">${rRate}%</td>
          </tr>`;
        }).join('') + `
          <tr style="font-weight: bold; border-top: 2px solid #000;">
            <td colspan="2" style="text-align: center;">합 계 (무담보 원금 기준)</td>
            <td style="text-align: right;">${formatAmount(unsecuredDenom)}</td>
            <td style="text-align: right;">${formatAmount(Math.floor(availableIncome))}</td>
            <td style="text-align: right;">${formatAmount(totalRepayAmount)}</td>
            <td style="text-align: center;">${overallRate}%</td>
          </tr>`;
      })()}
    </table>

    <h4>3. 청산가치와의 비교</h4>
    ${(() => {
      const props = data.properties || [];
      const deductions = data.propertyDeductions || [];
      const totalPropValue = props.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      const totalDeduction = deductions.reduce((s: number, d: any) => s + (Number(d.deduction_amount) || 0), 0);
      const liqValue = Math.max(0, totalPropValue - totalDeduction);
      const totalRepay = Math.floor(availableIncome) * planDurationMonths;
      const exceedsLiq = totalRepay >= liqValue;
      return `
        <table style="margin: 10px 0;">
          <tr><th style="width: 50%;">항목</th><th style="width: 50%; text-align: right;">금액</th></tr>
          <tr><td>총 재산가액</td><td style="text-align: right;">${formatAmount(totalPropValue)}</td></tr>
          <tr><td>공제금액 합계</td><td style="text-align: right;">${formatAmount(totalDeduction)}</td></tr>
          <tr style="font-weight: bold;"><td>청산가치 (A)</td><td style="text-align: right;">${formatAmount(liqValue)}</td></tr>
          <tr style="font-weight: bold;"><td>총 변제예정액 (B)</td><td style="text-align: right;">${formatAmount(totalRepay)}</td></tr>
        </table>
        <p style="margin-top: 10px;">
          ${exceedsLiq
            ? `총 변제예정액(${formatAmount(totalRepay)})이 청산가치(${formatAmount(liqValue)})를 <strong>상회</strong>하므로 청산가치 보장 원칙을 충족합니다.`
            : `<strong style="color: red;">⚠ 총 변제예정액(${formatAmount(totalRepay)})이 청산가치(${formatAmount(liqValue)})에 미달합니다. 변제액 조정이 필요합니다.</strong>`}
        </p>`;
    })()}

    <div class="page-break"></div>

    <h3>별표(1) 가용소득에 의한 변제 내역</h3>

    ${(() => {
      const credList = data.creditors || [];
      // P1-9: buildAdjustedSchedule로 회차별 월변제액 분배
      // totalTarget 미지정 시 base × months → diff=0 → 모든 회차 동일
      // 향후 colaw K_observed를 incomeSettings에 저장하면 totalTarget으로 주입
      const colawTotalTarget = Number(incomeSettings.total_repay_amount) || 0;
      const schedule = buildAdjustedSchedule({
        monthlyAvailable: availableIncome,
        months: planDurationMonths,
        totalTarget: colawTotalTarget > 0 ? colawTotalTarget : undefined,
      });

      const rows: string[] = [];
      const cumulByCred = new Map<string | number, number>();

      for (const r of schedule.rows) {
        const monthlyTotal = r.amount;
        credList.forEach((cred: any, idx: number) => {
          const cap = Number(cred.capital) || 0;
          const credDebt = cap + (Number(cred.interest) || 0);
          const ratio = totalDebt > 0 ? credDebt / totalDebt : 0;
          // 마지막 채권자는 잔여 흡수 (라운딩 오차 보정)
          const mPay = idx === credList.length - 1
            ? monthlyTotal - credList.slice(0, -1).reduce((s: number, c: any) => {
                const d = (Number(c.capital) || 0) + (Number(c.interest) || 0);
                const rt = totalDebt > 0 ? d / totalDebt : 0;
                return s + Math.round(monthlyTotal * rt);
              }, 0)
            : Math.round(monthlyTotal * ratio);
          const credKey = cred.id || idx;
          const prev = cumulByCred.get(credKey) || 0;
          const cumul = prev + mPay;
          cumulByCred.set(credKey, cumul);
          rows.push(`<tr>
            ${idx === 0 ? `<td rowspan="${credList.length}" style="text-align: center; vertical-align: middle;">${r.index}</td>` : ''}
            <td style="text-align: center;">${cred.bond_number || idx + 1}</td>
            <td>${esc(cred.creditor_name || '')}</td>
            <td style="text-align: right;">${formatAmount(credDebt)}</td>
            <td style="text-align: right;">${formatAmount(mPay)}</td>
            <td style="text-align: right;">${formatAmount(cumul)}</td>
            <td></td>
          </tr>`);
        });
      }
      return `<table style="font-size: 9pt;">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">회차</th>
            <th style="width: 8%; text-align: center;">번호</th>
            <th style="width: 20%; text-align: center;">채권자</th>
            <th style="width: 18%; text-align: center;">(D)채권액</th>
            <th style="width: 18%; text-align: center;">(E)월변제액</th>
            <th style="width: 18%; text-align: center;">(F)누적변제액</th>
            <th style="width: 12%; text-align: center;">비고</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
    })()}
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
    case 'delegation_with_attorney':
      return generateDelegationWithAttorney(data);
    case 'attorney_designation':
      return generateAttorneyDesignation(data);
    case 'prohibition_order':
      return generateProhibitionOrder(data);
    case 'stay_order':
      return generateStayOrder(data);
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
    case 'cover_page':
      return generateCoverPage(data);
    case 'creditor_summary':
      return generateCreditorSummary(data);
    case 'document_checklist':
      return generateDocumentChecklist(data);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
}

/**
 * 표지 — 법원 제출용 개인회생서류 표지
 */
function generateCoverPage(data: DocumentData): string {
  const app = data.application || {};
  const courtName = esc(app.court_name || '○○회생법원');
  const caseYear = app.case_year || new Date().getFullYear();
  const caseNum = esc(app.case_number || '');
  const debtorName = esc(app.applicant_name || '');
  const debtorBirth = esc(app.resident_number_front || '');
  const agentType = esc(app.agent_type || '');
  const agentName = esc(app.agent_name || '');
  const agentLawFirm = esc(app.agent_law_firm || '');
  const filingDate = app.application_date || app.filing_date || '';
  const filingStr = filingDate
    ? `${filingDate.slice(0, 4)}. ${parseInt(filingDate.slice(5, 7))}. ${parseInt(filingDate.slice(8, 10))}.`
    : `${new Date().getFullYear()}. . .`;

  const agentLine = agentLawFirm
    ? `${agentLawFirm}<br>담당 ${agentType} ${agentName}`
    : agentName ? `${agentType} ${agentName}` : '';

  const content = `
<div style="text-align:center;padding:80px 40px;font-family:'Batang','바탕',serif">
  <div style="font-size:16px;color:#666;margin-bottom:60px">${courtName}</div>

  <div style="font-size:14px;margin-bottom:8px">
    ${caseYear}개회${caseNum ? ` ${caseNum}` : '         '}호
  </div>

  <h1 style="font-size:28px;font-weight:700;margin:40px 0;letter-spacing:8px">
    개인회생절차개시신청서
  </h1>

  <div style="font-size:16px;margin:40px 0;line-height:2.2">
    <div>채무자 ${debtorName}${debtorBirth ? ` (${debtorBirth}-*******` + ')' : ''}</div>
  </div>

  <div style="margin-top:60px;font-size:14px;line-height:2">
    ${agentLine ? `<div>${agentLine}</div>` : ''}
  </div>

  <div style="margin-top:80px;font-size:14px">
    ${filingStr}
  </div>

  <div style="margin-top:20px;font-size:14px;font-weight:700">
    ${courtName} 귀중
  </div>
</div>`;

  return wrapDocument(content, '개인회생절차개시신청서 표지');
}

/**
 * 채권자목록 요약표
 */
function generateCreditorSummary(data: DocumentData): string {
  const creditors = data.creditors || [];
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  const totalCapital = creditors.reduce((s: number, c: Record<string, any>) => s + ((c.capital as number) || 0), 0);
  const totalInterest = creditors.reduce((s: number, c: Record<string, any>) => s + ((c.interest as number) || 0), 0);
  const totalDebt = totalCapital + totalInterest;

  const secured = creditors.filter((c: Record<string, any>) => c.is_secured);
  const priority = creditors.filter((c: Record<string, any>) => c.has_priority_repay && !c.is_secured);
  const unsecured = creditors.filter((c: Record<string, any>) => !c.is_secured && !c.has_priority_repay);

  const secCapital = secured.reduce((s: number, c: Record<string, any>) => s + ((c.capital as number) || 0), 0);
  const secInterest = secured.reduce((s: number, c: Record<string, any>) => s + ((c.interest as number) || 0), 0);
  const priCapital = priority.reduce((s: number, c: Record<string, any>) => s + ((c.capital as number) || 0), 0);
  const priInterest = priority.reduce((s: number, c: Record<string, any>) => s + ((c.interest as number) || 0), 0);
  const unsCapital = unsecured.reduce((s: number, c: Record<string, any>) => s + ((c.capital as number) || 0), 0);
  const unsInterest = unsecured.reduce((s: number, c: Record<string, any>) => s + ((c.interest as number) || 0), 0);

  const securedTotal = secCapital + secInterest;
  const unsecuredTotal = totalDebt - securedTotal;

  const content = `
<h2 style="text-align:center;margin-bottom:20px">채 권 자 목 록 요 약 표</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr>
    <td rowspan="3" style="border:1px solid #000;padding:8px;text-align:center;font-weight:bold;vertical-align:middle;width:12%">채권현재액</td>
    <td style="border:1px solid #000;padding:6px 8px;text-align:center;width:8%">합계</td>
    <td style="border:1px solid #000;padding:6px 8px;text-align:right;width:15%">${fmt(totalDebt)}원</td>
    <td rowspan="3" style="border:1px solid #000;padding:8px;text-align:center;font-weight:bold;vertical-align:middle;width:15%">담보부 회생<br/>채권액의 합계</td>
    <td rowspan="3" style="border:1px solid #000;padding:8px;text-align:right;vertical-align:middle;width:15%">${fmt(securedTotal)}원</td>
    <td rowspan="3" style="border:1px solid #000;padding:8px;text-align:center;font-weight:bold;vertical-align:middle;width:15%">무담보 회생<br/>채권액의 합계</td>
    <td rowspan="3" style="border:1px solid #000;padding:8px;text-align:right;vertical-align:middle;width:15%">${fmt(unsecuredTotal)}원</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:6px 8px;text-align:center">원금</td>
    <td style="border:1px solid #000;padding:6px 8px;text-align:right">${fmt(totalCapital)}원</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:6px 8px;text-align:center">이자</td>
    <td style="border:1px solid #000;padding:6px 8px;text-align:right">${fmt(totalInterest)}원</td>
  </tr>
</table>
<h3 style="margin-bottom:10px">채권 구분별 합계</h3>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#f5f5f5">
      <th style="border:1px solid #000;padding:6px 8px">구분</th>
      <th style="border:1px solid #000;padding:6px 8px">채권자수</th>
      <th style="border:1px solid #000;padding:6px 8px">원금</th>
      <th style="border:1px solid #000;padding:6px 8px">이자</th>
      <th style="border:1px solid #000;padding:6px 8px">합계</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border:1px solid #ccc;padding:5px 8px">우선변제권 채권</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${priority.length}명</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(priCapital)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(priInterest)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(priCapital + priInterest)}원</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;padding:5px 8px">담보부 회생채권</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${secured.length}명</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(secCapital)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(secInterest)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(secCapital + secInterest)}원</td>
    </tr>
    <tr>
      <td style="border:1px solid #ccc;padding:5px 8px">무담보 회생채권</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:center">${unsecured.length}명</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(unsCapital)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(unsInterest)}원</td>
      <td style="border:1px solid #ccc;padding:5px 8px;text-align:right">${fmt(unsCapital + unsInterest)}원</td>
    </tr>
    <tr style="font-weight:bold;background:#f0f0f0">
      <td style="border:1px solid #000;padding:5px 8px">합 계</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:center">${creditors.length}명</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:right">${fmt(totalCapital)}원</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:right">${fmt(totalInterest)}원</td>
      <td style="border:1px solid #000;padding:5px 8px;text-align:right">${fmt(totalDebt)}원</td>
    </tr>
  </tbody>
</table>`;

  return wrapDocument(content, '채권자목록 요약표');
}

/**
 * 자료제출목록 — 별지서식 기반 체크리스트
 * 처리지침 §5, 별지서식 자료제출목록
 */
function generateDocumentChecklist(data: DocumentData): string {
  const app = data.application || {};
  const debtorName = esc(app.applicant_name || '');

  const categories = [
    {
      title: '1. 인적 사항 및 주거 관련 서류',
      items: [
        '주민등록등본(세대주 및 전입세대 열람 제한 여부 기재된 것)',
        '가족관계증명서',
        '혼인관계증명서',
        '주민등록초본(주소이동사항 포함)',
        '임대차계약서 사본',
      ],
    },
    {
      title: '2. 채무 관련 서류',
      items: [
        '채무증빙자료(금전소비대차계약서, 카드사용대금명세서, 채무독촉장, 지급명령정본, 판결문 등) 사본',
        '채무자 신용정보조회서(4대 신용정보조회서)',
        '체납세금내역서(시·군·구청 및 세무서 발행) 또는 납세증명서',
      ],
    },
    {
      title: '3. 재산 관련 서류 – 부동산',
      items: ['부동산등기사항전부증명서', '건축물대장 등본', '토지대장 등본'],
    },
    {
      title: '4. 재산 관련 서류 – 자동차',
      items: ['자동차등록원부(갑구)', '자동차 시세 확인 자료'],
    },
    {
      title: '5. 소득 관련 서류 – 급여소득자',
      items: [
        '급여증명서(최근 2년분)와 근로소득세 원천징수영수증 사본',
        '급여입금통장사본(최근 2년분)',
        '사용자 작성의 퇴직금 계산서 등 증명서',
        '재직증명서 또는 사업자등록증이 첨부된 사용자의 확인서',
      ],
    },
    {
      title: '6. 재산 관련 서류 – 기타',
      items: [
        '부동산에 관한 객관적인 시가 확인 자료',
        '보험가입내역조회 및 해약환급금 예상액',
        '최근 2년 이내 재산변동이 있는 경우 소명자료',
      ],
    },
    {
      title: '7. 금융거래내역',
      items: [
        '채무자 본인 명의의 모든 예금 거래 통장의 사본(최근 1년분)',
        '주식, 보험, 예금, 저축, 기타 금융자산에 관한 소명 자료',
      ],
    },
  ];

  const rows = categories
    .map(
      (cat) => `
    <tr><td colspan="2" style="border:1px solid #ccc;padding:6px 10px;background:#f5f5f5;font-weight:bold">${esc(cat.title)}</td></tr>
    ${cat.items.map((item) => `<tr><td style="border:1px solid #ccc;padding:4px 10px;width:30px;text-align:center">□</td><td style="border:1px solid #ccc;padding:4px 10px">${esc(item)}</td></tr>`).join('')}`,
    )
    .join('');

  const content = `
<h2 style="text-align:center;margin-bottom:10px">자 료 제 출 목 록</h2>
<p style="text-align:right;margin-bottom:16px">채무자 ${debtorName}　(인)</p>
<p style="font-size:11px;margin-bottom:12px;color:#666">
  ※ 해당 □란에 ∨ 표시하고 뒷면에 제출하는 서류를 순서대로 첨부하여 제출합니다.<br>
  ※ 관공서 작성 서류는 신청일로부터 2개월 내 발급된 것이어야 합니다.
</p>
<table style="width:100%;border-collapse:collapse">
  ${rows}
</table>`;

  return wrapDocument(content, '자료제출목록');
}
