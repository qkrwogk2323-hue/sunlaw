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
function baseStyles(orientation: 'portrait' | 'landscape' = 'portrait'): string {
  const pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
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
      size: ${pageSize};
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
      max-width: ${orientation === 'landscape' ? '29.7cm' : '21cm'};
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
      background: #f0f0f0;
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
  `;
}

/**
 * HTML 문서 래퍼 (head + body)
 */
function wrapDocument(content: string, title: string, orientation: 'portrait' | 'landscape' = 'portrait'): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    ${baseStyles(orientation)}
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

  // 주소 정보
  const regAddress = app.reg_address || '';
  const regDetail = app.reg_detail || '';
  const regPostal = app.reg_postal_code || '';
  const curAddress = app.cur_address || '';
  const curDetail = app.cur_detail || '';
  const curPostal = app.cur_postal_code || '';
  const offAddress = app.off_address || '';
  const offDetail = app.off_detail || '';
  const offPostal = app.off_postal_code || '';
  const svcAddress = app.svc_address || '';
  const svcDetail = app.svc_detail || '';
  const svcPostal = app.svc_postal_code || '';

  // 대리인 정보
  const agentAddress = app.agt_address || '';
  const agentDetail = app.agt_detail || '';
  const agentPostal = app.agt_postal_code || '';

  // 직업/소득
  const occupation = app.occupation || '';
  const incomeType = app.income_type || '자영업';
  const employer = app.employer || '';

  // 신청이유
  const filingReason = app.filing_reason || '';
  const informationConsent = app.information_consent === true || app.information_consent === 'true';

  const content = `
    <!-- Cover Page -->
    <div class="text-center" style="page-break-after: always; padding-top: 100px;">
      <h1 style="font-size: 20pt; margin-bottom: 60px;">개인회생절차 개시신청서</h1>
    </div>

    <!-- Main Application -->
    <h2 style="margin-top: 0;">개인회생 개시신청서</h2>

    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="width: 25%; font-weight: bold;">사건번호</td>
        <td style="width: 75%;">${esc(caseNumber)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">채무자</td>
        <td>${esc(debtorName)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">대리인</td>
        <td>${esc(agentName)}</td>
      </tr>
    </table>

    <h3>1. 채무자 인적사항</h3>
    <table>
      <tr>
        <th style="width: 25%;">성명</th>
        <td style="width: 75%;">${esc(debtorName)}</td>
      </tr>
      <tr>
        <th>주민등록번호</th>
        <td>${esc(debtorBirth)}-*</td>
      </tr>
      <tr>
        <th>주민등록상 주소</th>
        <td>[${esc(regPostal)}] ${esc(regAddress)} ${esc(regDetail)}</td>
      </tr>
      <tr>
        <th>현 주소</th>
        <td>[${esc(curPostal)}] ${esc(curAddress)} ${esc(curDetail)}</td>
      </tr>
      <tr>
        <th>직장 주소</th>
        <td>[${esc(offPostal)}] ${esc(offAddress)} ${esc(offDetail)}</td>
      </tr>
      <tr>
        <th>송달 주소</th>
        <td>[${esc(svcPostal)}] ${esc(svcAddress)} ${esc(svcDetail)}</td>
      </tr>
    </table>

    <h3>2. 직업 및 소득 정보</h3>
    <table>
      <tr>
        <th style="width: 25%;">소득 구분</th>
        <td style="width: 75%;">${esc(incomeType)}</td>
      </tr>
      <tr>
        <th>직업</th>
        <td>${esc(occupation)}</td>
      </tr>
      <tr>
        <th>직장명 / 사업명</th>
        <td>${esc(employer)}</td>
      </tr>
    </table>

    <h3>3. 대리인 정보</h3>
    <table>
      <tr>
        <th style="width: 25%;">대리인 구분</th>
        <td style="width: 75%;">변호사</td>
      </tr>
      <tr>
        <th>성명</th>
        <td>${esc(agentName)}</td>
      </tr>
      <tr>
        <th>전화</th>
        <td>${esc(agentPhone)}</td>
      </tr>
      <tr>
        <th>이메일</th>
        <td>${esc(agentEmail)}</td>
      </tr>
      <tr>
        <th>주소</th>
        <td>[${esc(agentPostal)}] ${esc(agentAddress)} ${esc(agentDetail)}</td>
      </tr>
    </table>

    <h3>4. 신청 이유</h3>
    <div class="info-box" style="min-height: 100px;">
      ${esc(filingReason).replace(/\n/g, '<br>')}
    </div>

    <h3>5. 첨부 서류</h3>
    <ol>
      <li>신청인 주민등록등본 1통</li>
      <li>혼인관계증명서 1통</li>
      <li>재산목록 1부</li>
      <li>수입 및 지출 목록 1부</li>
      <li>채권자 목록 1부</li>
      <li>진술서 1부</li>
      <li>개인신용조회 동의서 1부</li>
      <li>금융기관 기본정보 양식</li>
      <li>위임장 1부</li>
      <li>인감증명서 1부 (대리인이 있는 경우)</li>
    </ol>

    ${informationConsent ? `
    <div class="page-break"></div>
    <h2>개인정보 수신 신청서</h2>

    <p style="margin-bottom: 20px;">본인은 법원으로부터 개인회생절차에 관한 정보를 전자우편으로 수신하기를 신청합니다.</p>

    <table>
      <tr>
        <th style="width: 25%;">성명</th>
        <td style="width: 75%;">${esc(debtorName)}</td>
      </tr>
      <tr>
        <th>이메일</th>
        <td>${esc(app.email || '')}</td>
      </tr>
      <tr>
        <th>휴대전화</th>
        <td>${esc(app.phone_mobile || '')}</td>
      </tr>
    </table>

    <div class="signature-area">
      <div style="margin-bottom: 30px;">위 사항이 사실임을 확인합니다.</div>
      <div class="signature-line"></div>
      <div>${esc(debtorName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>
    ` : ''}

    <div class="signature-area" style="margin-top: 50px;">
      <div style="margin-bottom: 30px;">위 사항이 사실임을 확인합니다.</div>
      <div class="signature-line"></div>
      <div>${esc(debtorName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="footer">
      <p style="margin-top: 40px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '개인회생절차 개시신청서');
}

/**
 * 2. 위임장 생성
 */
function generateDelegation(data: DocumentData): string {
  const app = data.application || {};
  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorAddress = `${app.reg_address || ''} ${app.reg_detail || ''}`.trim();

  const agentName = app.agent_name || '';
  const agentId = app.agent_id || '';
  const agentAddress = `${app.agt_address || ''} ${app.agt_detail || ''}`.trim();

  const content = `
    <h1 style="letter-spacing: 0.3em; margin: 80px 0 60px 0;">위 임 장</h1>

    <h3 style="text-align: center; margin-top: 40px;">위임인 (채무자)</h3>
    <table style="margin-bottom: 30px;">
      <tr>
        <th style="width: 25%;">성명</th>
        <td style="width: 75%;">${esc(debtorName)}</td>
      </tr>
      <tr>
        <th>주민등록번호</th>
        <td>${esc(debtorBirth)}-*</td>
      </tr>
      <tr>
        <th>주소</th>
        <td>${esc(debtorAddress)}</td>
      </tr>
    </table>

    <h3 style="text-align: center; margin-top: 40px;">수임인 (대리인)</h3>
    <table style="margin-bottom: 30px;">
      <tr>
        <th style="width: 25%;">구분</th>
        <td style="width: 75%;">변호사</td>
      </tr>
      <tr>
        <th>성명</th>
        <td>${esc(agentName)}</td>
      </tr>
      <tr>
        <th>변호사 등록번호</th>
        <td>${esc(agentId)}</td>
      </tr>
      <tr>
        <th>주소</th>
        <td>${esc(agentAddress)}</td>
      </tr>
    </table>

    <h3 style="text-align: center; margin-top: 40px;">위임 사항</h3>
    <div class="info-box">
      <p>위임인은 수임인에게 다음 사항을 위임합니다:</p>
      <ol style="margin-left: 20px;">
        <li>법원에 개인회생절차 개시신청서 제출</li>
        <li>법원과 채권자에 대한 법률상담 및 대리</li>
        <li>법원에 제출할 모든 서류의 작성 및 제출</li>
        <li>채권자와의 협상 및 조정</li>
        <li>변제계획안의 작성 및 제출</li>
        <li>기타 개인회생절차 진행에 필요한 모든 법률 업무</li>
      </ol>
    </div>

    <div style="text-align: center; margin-top: 60px;">
      <p style="margin: 20px 0; font-weight: bold;">위의 사항을 위임합니다.</p>
    </div>

    <div class="signature-area" style="margin-top: 60px;">
      <div style="margin-bottom: 10px;">위임인 (인감 날인)</div>
      <div class="signature-line"></div>
      <div>${esc(debtorName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="signature-area" style="margin-top: 60px;">
      <div style="margin-bottom: 10px;">수임인 (서명)</div>
      <div class="signature-line"></div>
      <div>${esc(agentName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="footer">
      <p style="margin-top: 80px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '위임장');
}

/**
 * 3. 채권자목록 생성 (가로 방향)
 */
function generateCreditorList(data: DocumentData): string {
  const app = data.application || {};
  const debtorName = app.debtor_name || '';
  const debtorBirth = app.resident_number_front || '';
  const debtorAddress = `${app.cur_address || ''} ${app.cur_detail || ''}`.trim();
  const svcAddress = `${app.svc_address || ''} ${app.svc_detail || ''}`.trim();

  const creditors = data.creditors || [];
  const securedProperties = data.securedProperties || [];

  // 채권 현재액 합계, 담보부/무담보부 계산
  let totalCurrent = 0;
  let securedTotal = 0;
  let unsecuredTotal = 0;

  creditors.forEach(c => {
    const current = (c.capital || 0) + (c.interest || 0);
    totalCurrent += current;
    if (c.is_secured) {
      securedTotal += current;
    } else {
      unsecuredTotal += current;
    }
  });

  // 채권자 행 생성
  let creditorRows = '';
  creditors.forEach((c, idx) => {
    const bondNum = c.bond_number || (idx + 1);
    const name = c.creditor_name || '';
    const address = c.address || '';
    const phone = c.phone || '';
    const fax = c.fax || '';
    const cause = c.bond_cause || '';
    const causeDate = formatDate(c.cause_date);
    const capital = c.capital || 0;
    const capitalCompute = c.capital_compute || '';
    const interest = c.interest || 0;
    const interestCompute = c.interest_compute || '';
    const current = capital + interest;
    const isSecured = c.is_secured ? '있음' : '없음';
    const guarantor = c.guarantor_name || '';

    creditorRows += `
      <tr>
        <td class="center">${bondNum}</td>
        <td>${esc(name)}</td>
        <td>${esc(address)}<br>${esc(phone)}<br>${esc(fax)}</td>
        <td>${esc(cause)}<br>(${causeDate})</td>
        <td class="number">${formatAmountNoUnit(capital)}<br><span style="font-size: 10pt;">${esc(capitalCompute)}</span></td>
        <td class="number">${formatAmountNoUnit(interest)}<br><span style="font-size: 10pt;">${esc(interestCompute)}</span></td>
        <td class="number">${formatAmountNoUnit(current)}</td>
        <td class="center">${isSecured}</td>
        <td>${esc(guarantor)}</td>
        <td></td>
      </tr>
    `;

    // 보증인이 있으면 서브 행 추가
    if (guarantor && c.guarantor_amount) {
      creditorRows += `
        <tr style="background: #f9f9f9;">
          <td class="center">${bondNum}-1</td>
          <td colspan="2">${esc(guarantor)} (보증인)</td>
          <td></td>
          <td class="number">${formatAmountNoUnit(c.guarantor_amount)}</td>
          <td></td>
          <td class="number">${formatAmountNoUnit(c.guarantor_amount)}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }
  });

  const content = `
    <h1>채 권 자 목 록</h1>

    <h3>채무자 정보</h3>
    <table style="font-size: 11pt;">
      <tr>
        <td style="width: 20%; font-weight: bold;">성명</td>
        <td style="width: 80%;">${esc(debtorName)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">주민등록번호</td>
        <td>${esc(debtorBirth)}-*</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">현 주소</td>
        <td>${esc(debtorAddress)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">송달장소</td>
        <td>${esc(svcAddress)}</td>
      </tr>
    </table>

    <h3 style="margin-top: 20px;">채권 요약</h3>
    <table style="font-size: 11pt;">
      <tr>
        <th style="width: 25%;">항목</th>
        <th style="width: 25%;">담보부</th>
        <th style="width: 25%;">무담보부</th>
        <th style="width: 25%;">합계</th>
      </tr>
      <tr>
        <td style="font-weight: bold;">채권현재액</td>
        <td class="number">${formatAmount(securedTotal)}</td>
        <td class="number">${formatAmount(unsecuredTotal)}</td>
        <td class="number" style="font-weight: bold;">${formatAmount(totalCurrent)}</td>
      </tr>
    </table>

    <h3 style="margin-top: 20px;">채권자 목록</h3>
    <table style="font-size: 10pt; margin-top: 10px;">
      <thead>
        <tr style="text-align: center;">
          <th style="width: 5%;">번호</th>
          <th style="width: 12%;">채권자명</th>
          <th style="width: 15%;">주소/전화/팩스</th>
          <th style="width: 12%;">채권원인<br>(발생일)</th>
          <th style="width: 10%;">원금<br>(산정근거)</th>
          <th style="width: 10%;">이자<br>(산정근거)</th>
          <th style="width: 10%;">현재액</th>
          <th style="width: 8%;">담보</th>
          <th style="width: 10%;">보증인</th>
          <th style="width: 8%;">부속<br>서류</th>
        </tr>
      </thead>
      <tbody>
        ${creditorRows}
      </tbody>
    </table>

    <h3 style="margin-top: 30px;">부속서류</h3>
    <p style="margin: 10px 0;">1. 별제권부채권</p>
    ${securedProperties.length > 0 ? `
      <table style="font-size: 11pt;">
        <thead>
          <tr>
            <th style="width: 15%;">담보물건</th>
            <th style="width: 20%;">설명</th>
            <th style="width: 20%;">시가</th>
            <th style="width: 20%;">평가율</th>
            <th style="width: 25%;">청산가치</th>
          </tr>
        </thead>
        <tbody>
          ${securedProperties.map(p => `
            <tr>
              <td>${esc(p.property_type || '')}</td>
              <td>${esc(p.description || '')}</td>
              <td class="number">${formatAmount(p.market_value)}</td>
              <td class="number">${((p.valuation_rate || 0) * 100).toFixed(1)}%</td>
              <td class="number">${formatAmount((p.market_value || 0) * (p.valuation_rate || 0))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="margin-left: 20px;">별제권부채권 없음</p>'}

    <div class="footer">
      <p style="margin-top: 40px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '채권자목록', 'landscape');
}

/**
 * 4. 재산목록 생성
 */
function generatePropertyList(data: DocumentData): string {
  const properties = data.properties || [];
  const deductions = data.propertyDeductions || [];

  // 카테고리 정의
  const categories: { id: string; name: string }[] = [
    { id: 'cash', name: '현금' },
    { id: 'deposit', name: '예금' },
    { id: 'insurance', name: '보험' },
    { id: 'car', name: '자동차' },
    { id: 'lease', name: '임차보증금' },
    { id: 'realestate', name: '부동산' },
    { id: 'equipment', name: '사업용설비' },
    { id: 'loan', name: '대여금채권' },
    { id: 'sales', name: '매출금채권' },
    { id: 'retirement', name: '예상퇴직금' },
    { id: 'seizure', name: '압류적립금' },
    { id: 'consignment', name: '공탁금' },
    { id: 'etc', name: '기타' },
  ];

  // 카테고리별 재산 정렬
  const propByCategory: Record<string, any[]> = {};
  categories.forEach(cat => {
    propByCategory[cat.id] = properties.filter((p: any) => p.category === cat.id);
  });

  // 합계 계산
  let totalAmount = 0;
  properties.forEach((p: any) => {
    totalAmount += p.amount || 0;
  });

  const deductionAmount = deductions.reduce((sum, d: any) => sum + (d.amount || 0), 0);
  const deductionName = deductions.length > 0 ? (deductions[0].reason || '면제재산') : '면제재산';

  let propertyRows = '';
  categories.forEach(cat => {
    const items = propByCategory[cat.id] || [];
    if (items.length > 0) {
      items.forEach((item, idx) => {
        propertyRows += `
          <tr>
            <td style="width: 20%;">${idx === 0 ? esc(cat.name) : ''}</td>
            <td style="width: 30%;">${esc(item.detail || '')}</td>
            <td class="number" style="width: 20%;">${formatAmount(item.amount)}</td>
            <td style="width: 15%;">${esc(item.seizure || '없음')}</td>
            <td style="width: 15%;">${esc(item.repay_use || '')}</td>
          </tr>
        `;
      });
    }
  });

  const content = `
    <h1>재 산 목 록</h1>

    <table style="margin-top: 20px;">
      <thead>
        <tr>
          <th style="width: 20%;">카테고리</th>
          <th style="width: 30%;">명칭</th>
          <th style="width: 20%;">금액 또는 시가</th>
          <th style="width: 15%;">압류등유무</th>
          <th style="width: 15%;">비고</th>
        </tr>
      </thead>
      <tbody>
        ${propertyRows}
        <tr style="font-weight: bold; background: #f0f0f0;">
          <td colspan="2">합계</td>
          <td class="number">${formatAmount(totalAmount)}</td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td colspan="2">${esc(deductionName)} 결정신청 금액</td>
          <td class="number">${formatAmount(deductionAmount)}</td>
          <td></td>
          <td></td>
        </tr>
        <tr style="font-weight: bold; background: #f0f0f0;">
          <td colspan="2">청산가치</td>
          <td class="number">${formatAmount(Math.max(0, totalAmount - deductionAmount))}</td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <p style="margin-top: 40px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '재산목록');
}

/**
 * 5. 수입및지출목록 생성
 */
function generateIncomeStatement(data: DocumentData): string {
  const income = data.incomeSettings || {};
  const family = data.familyMembers || [];
  const app = data.application || {};

  const monthlyIncome = income.net_salary || 0;
  const incomeType = app.income_type || '자영업';
  const occupation = app.occupation || '';
  const employer = app.employer || '';

  const medianIncome = income.median_income_60percent || 0;

  let familyRows = '';
  family.forEach((member, idx) => {
    familyRows += `
      <tr>
        <td>${esc(member.relation || '')}</td>
        <td>${esc(member.member_name || '')}</td>
        <td class="center">${member.age || ''}</td>
        <td>${esc(member.cohabitation || '')}</td>
        <td>${esc(member.occupation || '')}</td>
        <td class="number">${formatAmount(member.monthly_income)}</td>
        <td class="number">${formatAmount(member.total_property)}</td>
        <td class="center">${member.is_dependent ? '○' : '×'}</td>
      </tr>
    `;
  });

  const content = `
    <h1>수입 및 지출에 관한 목록</h1>

    <h3>I. 현재의 수입 목록</h3>
    <table style="font-size: 11pt;">
      <tr>
        <th style="width: 20%;">항목</th>
        <th style="width: 80%;">내용</th>
      </tr>
      <tr>
        <td style="font-weight: bold;">수입 상황</td>
        <td>${esc(incomeType)} - ${esc(occupation)} (${esc(employer)})</td>
      </tr>
    </table>

    <table style="font-size: 11pt; margin-top: 15px;">
      <thead>
        <tr>
          <th style="width: 20%;">소득 항목</th>
          <th style="width: 20%;">기간</th>
          <th style="width: 20%;">금액</th>
          <th style="width: 20%;">연간환산금액</th>
          <th style="width: 20%;">압류여부</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>월 급여/매출</td>
          <td>월</td>
          <td class="number">${formatAmount(monthlyIncome)}</td>
          <td class="number">${formatAmount(monthlyIncome * 12)}</td>
          <td class="center">없음</td>
        </tr>
        <tr style="font-weight: bold; background: #f0f0f0;">
          <td colspan="2">연수입</td>
          <td class="number" colspan="3">${formatAmount(monthlyIncome * 12)}</td>
        </tr>
        <tr style="font-weight: bold; background: #f0f0f0;">
          <td colspan="2">월평균소득</td>
          <td class="number" colspan="3">${formatAmount(monthlyIncome)}</td>
        </tr>
      </tbody>
    </table>

    <h3 style="margin-top: 30px;">II. 변제계획 수행시의 예상 지출 목록</h3>
    <div class="info-box">
      <p>중위소득 60% 기준: ${formatAmount(medianIncome)} (월)</p>
      <p style="margin-top: 10px; font-size: 11pt;">변제계획 수행 기간 동안 위 금액 범위 내에서 필수 생활비를 지출할 수 있습니다.</p>
    </div>

    <h3 style="margin-top: 30px;">III. 가족 관계</h3>
    <table style="font-size: 11pt;">
      <thead>
        <tr>
          <th style="width: 12%;">관계</th>
          <th style="width: 12%;">성명</th>
          <th style="width: 12%;">연령</th>
          <th style="width: 15%;">동거여부<br>및 기간</th>
          <th style="width: 13%;">직업</th>
          <th style="width: 13%;">월수입</th>
          <th style="width: 13%;">재산<br>총액</th>
          <th style="width: 8%;">부양<br>유무</th>
        </tr>
      </thead>
      <tbody>
        ${familyRows}
      </tbody>
    </table>

    <div class="footer">
      <p style="margin-top: 40px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '수입및지출목록');
}

/**
 * 6. 진술서 생성
 */
function generateAffidavit(data: DocumentData): string {
  const affidavit = data.affidavit || {};
  const app = data.application || {};

  const debtReason = affidavit.debt_history || '';
  const debtIncreaseReason = affidavit.property_change || '';
  const repayEffort = affidavit.income_change || '';
  const currentSituation = affidavit.living_situation || '';
  const futurePlan = affidavit.repay_feasibility || '';

  const content = `
    <h1 style="letter-spacing: 0.2em; margin-bottom: 50px;">진 술 서</h1>

    <h3>I. 경력</h3>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">1. 최종 학력</h4>
    <div class="info-box" style="min-height: 40px;">
      ${esc(affidavit.final_education || '')}
    </div>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">2. 과거 경력</h4>
    <table style="font-size: 11pt;">
      <thead>
        <tr>
          <th style="width: 20%;">근무 기간</th>
          <th style="width: 20%;">업종</th>
          <th style="width: 30%;">직장명</th>
          <th style="width: 30%;">직위</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="height: 40px; vertical-align: top;"></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td style="height: 40px; vertical-align: top;"></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td style="height: 40px; vertical-align: top;"></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">3. 결혼 및 이혼 경력</h4>
    <div class="info-box" style="min-height: 40px;">
      ${esc(affidavit.marriage_history || '')}
    </div>

    <h3 style="margin-top: 30px;">II. 현재 주거 상황</h3>

    <h4 style="font-weight: bold; margin: 10px 0;">거주 시작 시점</h4>
    <div style="margin: 10px 0;">${esc(affidavit.residence_start_date || '')}</div>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">거주 관계</h4>
    <div class="info-box">
      ${esc(affidavit.residence_type || '')}
    </div>

    <h3 style="margin-top: 30px;">III. 부채 상황</h3>

    <h4 style="font-weight: bold; margin: 10px 0;">1. 소송 경험</h4>
    <div class="info-box" style="min-height: 40px;">
      ${esc(affidavit.litigation_history || '없음')}
    </div>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">2. 개인회생 사유</h4>
    <div class="info-box" style="min-height: 60px;">
      <p style="margin: 0 0 5px 0;">☐ 사업 실패 또는 부진</p>
      <p style="margin: 5px 0;">☐ 실직 또는 소득 감소</p>
      <p style="margin: 5px 0;">☐ 의료비 및 질병 관련</p>
      <p style="margin: 5px 0;">☐ 신용카드 남용</p>
      <p style="margin: 5px 0;">☐ 보증채무</p>
      <p style="margin: 5px 0;">☐ 기타</p>
    </div>

    <h4 style="font-weight: bold; margin: 15px 0 10px 0;">3. 상세 사정 기재</h4>
    <div class="info-box" style="min-height: 100px;">
      ${esc(debtReason).replace(/\n/g, '<br>')}
    </div>

    <h3 style="margin-top: 30px;">IV. 부채 증가 경위</h3>
    <div class="info-box" style="min-height: 80px;">
      ${esc(debtIncreaseReason).replace(/\n/g, '<br>')}
    </div>

    <h3 style="margin-top: 30px;">V. 변제 노력 및 현재 상황</h3>
    <div class="info-box" style="min-height: 80px;">
      ${esc(repayEffort).replace(/\n/g, '<br>')}
    </div>

    <h3 style="margin-top: 30px;">VI. 변제 계획 및 향후 계획</h3>
    <div class="info-box" style="min-height: 80px;">
      ${esc(futurePlan).replace(/\n/g, '<br>')}
    </div>

    <h3 style="margin-top: 30px;">VII. 과거 면책절차 등의 이용 상황</h3>
    <table style="font-size: 11pt;">
      <thead>
        <tr>
          <th style="width: 20%;">절차명</th>
          <th style="width: 20%;">신청 연도</th>
          <th style="width: 20%;">결과</th>
          <th style="width: 40%;">비고</th>
        </tr>
      </thead>
      <tbody>
        <tr style="height: 40px;">
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="signature-area" style="margin-top: 50px;">
      <div style="margin-bottom: 30px;">위 진술이 거짓이 아님을 선서합니다.</div>
      <div class="signature-line"></div>
      <div>${esc(app.debtor_name || '')}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="footer">
      <p style="margin-top: 40px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '진술서');
}

/**
 * 7. 변제계획안 제출서 생성
 */
function generateRepaymentPlan(data: DocumentData): string {
  const app = data.application || {};
  const caseNumber = app.case_number || '';
  const debtorName = app.debtor_name || '';
  const agentName = app.agent_name || '';

  const content = `
    <h1 style="letter-spacing: 0.2em; margin-bottom: 60px;">변 제 계 획 안 제 출 서</h1>

    <table style="margin-bottom: 30px;">
      <tr>
        <td style="width: 25%; font-weight: bold;">사건번호</td>
        <td style="width: 75%;">${esc(caseNumber)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">채무자</td>
        <td>${esc(debtorName)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">대리인</td>
        <td>${esc(agentName)}</td>
      </tr>
    </table>

    <div class="info-box" style="margin: 40px 0; padding: 30px; min-height: 100px;">
      <p style="text-align: center; line-height: 2;">채무자는 별지와 같이 변제계획안을 작성하여 제출하니</p>
      <p style="text-align: center; line-height: 2; font-weight: bold;">인가하여 주시기 바랍니다.</p>
    </div>

    <div class="signature-area" style="margin-top: 80px;">
      <div style="margin-bottom: 30px;">위의 사항이 사실임을 확인합니다.</div>
      <div class="signature-line"></div>
      <div>${esc(debtorName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="signature-area" style="margin-top: 60px;">
      <div style="margin-bottom: 30px;">대리인 (서명)</div>
      <div class="signature-line"></div>
      <div>${esc(agentName)}</div>
      <div class="date-line">${formatDate(new Date())}</div>
    </div>

    <div class="footer">
      <p style="margin-top: 80px;">대한민국 법원</p>
    </div>
  `;

  return wrapDocument(content, '변제계획안 제출서');
}

// ─── 메인 생성 함수 ───

/**
 * 문서 타입에 따라 HTML 문서를 생성합니다.
 *
 * @param type 문서 타입
 * @param data 문서 생성에 필요한 전체 데이터
 * @returns 완성된 HTML 문서 (<!DOCTYPE html>로 시작하는 전체 문서)
 *
 * @example
 * const html = generateDocument('application', {
 *   application: {...},
 *   creditors: [...],
 *   // ...
 * });
 * // 이 HTML을 브라우저에서 print-to-PDF 또는 인쇄할 수 있습니다.
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
