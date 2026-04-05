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
        <td colspan="6" style="height: 40px; text-align: center; color: #888; vertical-align: middle;">
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
      const lienDesc = [
        lienType ? `담보종류: ${esc(lienType)}` : '',
        lienPriority ? `순위: ${esc(String(lienPriority))}` : '',
        propertyDesc ? `목적물: ${esc(propertyDesc.trim())}` : '',
        maxClaimAmount > 0 ? `채권최고액: ${formatAmount(maxClaimAmount)}` : '',
      ].filter(Boolean).join(' / ');

      lienDetailsRows += `
        <tr>
          <td style="text-align: center;">${esc(String(bondNumber))}</td>
          <td colspan="5" style="font-size: 9pt; padding: 6px 8px;">${lienDesc || '&nbsp;'}</td>
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
        <th colspan="6" style="text-align: center;">⑥별제권 등의 내용 및 목적물</th>
      </tr>
      <tr>
        <th style="width: 8%; text-align: center;">채권<br/>번호</th>
        <th colspan="5" style="text-align: center;">별제권 등의 내용</th>
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

  let creditorRows = '';
  creditors.forEach((cred: any, idx: number) => {
    const bondNumber = cred.bond_number || String(idx + 1);
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

  // 소득: DB 컬럼은 net_salary(월), living_cost(월)
  const monthlySalary = Number(incomeSettings.net_salary) || 0;
  const extraIncome = Number(incomeSettings.extra_income) || 0;
  const monthlyIncome = monthlySalary + extraIncome;
  const annualIncome = monthlyIncome * 12;
  const livingExpense = Number(incomeSettings.living_cost) || 0;
  const extraLivingCost = Number(incomeSettings.extra_living_cost) || 0;
  const childSupport = Number(incomeSettings.child_support) || 0;
  const commissionRate = Number(incomeSettings.trustee_comm_rate) || 0;
  const rawAvailable = monthlyIncome - livingExpense - extraLivingCost - childSupport;
  const commission = Math.floor(rawAvailable * commissionRate / 100);
  const availableIncome = rawAvailable - commission;

  // 변제기간: 신청일 기준으로 산출
  const repayMonths = Number(incomeSettings.repay_months) || 36;
  const planDurationMonths = repayMonths;
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
    const monthlyPayment = Math.floor(availableIncome * ratio);
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
        <td style="text-align: center;">가용소득</td>
        <td style="text-align: right;">${formatAmount(availableIncome)}</td>
        <td style="text-align: right;">${formatAmount(availableIncome * 12)}</td>
        <td></td>
      </tr>
    </table>

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
      ${(data.creditors || []).map((cred: any, idx: number) => {
        const cap = Number(cred.capital) || 0;
        const interest = Number(cred.interest) || 0;
        const credDebt = cap + interest;
        const ratio = totalDebt > 0 ? credDebt / totalDebt : 0;
        const mPay = Math.floor(availableIncome * ratio);
        const tPay = mPay * planDurationMonths;
        const rRate = credDebt > 0 ? ((tPay / credDebt) * 100).toFixed(1) : '0.0';
        return `<tr>
          <td style="text-align: center;">${cred.bond_number || idx + 1}</td>
          <td style="text-align: center;">${esc(cred.creditor_name || '')}</td>
          <td style="text-align: right;">${formatAmount(credDebt)}</td>
          <td style="text-align: right;">${formatAmount(mPay)}</td>
          <td style="text-align: right;">${formatAmount(tPay)}</td>
          <td style="text-align: center;">${rRate}%</td>
        </tr>`;
      }).join('')}
      <tr style="font-weight: bold; border-top: 2px solid #000;">
        <td colspan="2" style="text-align: center;">합 계</td>
        <td style="text-align: right;">${formatAmount(totalDebt)}</td>
        <td style="text-align: right;">${formatAmount(Math.floor(availableIncome))}</td>
        <td style="text-align: right;">${formatAmount(Math.floor(availableIncome) * planDurationMonths)}</td>
        <td style="text-align: center;">${totalDebt > 0 ? ((Math.floor(availableIncome) * planDurationMonths / totalDebt) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
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
      const rows: string[] = [];
      for (let month = 1; month <= planDurationMonths; month++) {
        credList.forEach((cred: any, idx: number) => {
          const cap = Number(cred.capital) || 0;
          const credDebt = cap + (Number(cred.interest) || 0);
          const ratio = totalDebt > 0 ? credDebt / totalDebt : 0;
          const mPay = Math.floor(availableIncome * ratio);
          const tPay = mPay * month;
          rows.push(`<tr>
            ${idx === 0 ? `<td rowspan="${credList.length}" style="text-align: center; vertical-align: middle;">${month}</td>` : ''}
            <td style="text-align: center;">${cred.bond_number || idx + 1}</td>
            <td>${esc(cred.creditor_name || '')}</td>
            <td style="text-align: right;">${formatAmount(credDebt)}</td>
            <td style="text-align: right;">${formatAmount(mPay)}</td>
            <td style="text-align: right;">${formatAmount(tPay)}</td>
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
