/**
 * 연체 의뢰인 납부 안내 초안 생성 (rule-based + Gemini 선택)
 * 수임료·회수 미납 의뢰인에게 보낼 문자/이메일 초안을 자동 생성합니다.
 */

export type OverdueNoticeType = 'sms' | 'email' | 'kakao';

export type OverdueNoticeParams = {
  clientName: string;
  caseTitle: string;
  overdueAmount: number;
  dueDaysAgo: number;
  orgName: string;
  lawyerName?: string;
  noticeType: OverdueNoticeType;
  contactPhone?: string;
  accountInfo?: string;
};

export type OverdueNoticeDraft = {
  subject?: string;
  body: string;
  provider: 'rule' | 'gemini';
  generatedAt: string;
};

function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function urgencyTone(dueDaysAgo: number): { greeting: string; urgency: string } {
  if (dueDaysAgo <= 7) {
    return {
      greeting: '안녕하세요',
      urgency: '납부 기한이 지났습니다.',
    };
  }
  if (dueDaysAgo <= 30) {
    return {
      greeting: '안녕하세요',
      urgency: `납부 기한이 ${dueDaysAgo}일 경과하였습니다.`,
    };
  }
  return {
    greeting: '안녕하세요',
    urgency: `납부 기한이 ${dueDaysAgo}일 이상 경과하였습니다. 빠른 납부를 부탁드립니다.`,
  };
}

function buildSmsBody(params: OverdueNoticeParams): string {
  const { greeting, urgency } = urgencyTone(params.dueDaysAgo);
  const parts = [
    `[${params.orgName}] ${greeting}, ${params.clientName} 의뢰인님.`,
    `"${params.caseTitle}" 사건 관련 미납 금액 ${formatKRW(params.overdueAmount)}이 있습니다. ${urgency}`,
  ];
  if (params.accountInfo) parts.push(`납부 계좌: ${params.accountInfo}`);
  if (params.contactPhone) parts.push(`문의: ${params.contactPhone}`);
  parts.push('납부 확인 후 연락 주시면 즉시 처리하겠습니다.');
  return parts.join('\n');
}

function buildEmailBody(params: OverdueNoticeParams): { subject: string; body: string } {
  const { greeting, urgency } = urgencyTone(params.dueDaysAgo);
  const subject = `[납부 안내] ${params.caseTitle} — 미납 금액 ${formatKRW(params.overdueAmount)}`;

  const lines = [
    `${greeting}, ${params.clientName} 의뢰인님.`,
    '',
    `${params.orgName}에서 안내 드립니다.`,
    '',
    `"${params.caseTitle}" 사건과 관련하여 미납된 금액이 있어 안내 드립니다.`,
    '',
    `■ 미납 금액: ${formatKRW(params.overdueAmount)}`,
    `■ 경과 일수: ${params.dueDaysAgo}일`,
    `■ 담당자: ${params.lawyerName ?? params.orgName}`,
    '',
    urgency,
    '',
  ];

  if (params.accountInfo) {
    lines.push(`■ 납부 계좌: ${params.accountInfo}`);
    lines.push('');
  }

  lines.push(
    '납부 완료 후 또는 분납 협의를 원하시는 경우, 아래 연락처로 연락해 주시기 바랍니다.',
    '',
  );

  if (params.contactPhone) lines.push(`연락처: ${params.contactPhone}`);

  lines.push(
    '',
    '감사합니다.',
    `${params.lawyerName ? `${params.lawyerName} 드림\n` : ''}${params.orgName}`,
  );

  return { subject, body: lines.join('\n') };
}

function buildKakaoBody(params: OverdueNoticeParams): string {
  const { urgency } = urgencyTone(params.dueDaysAgo);
  const lines = [
    `안녕하세요, ${params.clientName} 의뢰인님 😊`,
    `${params.orgName}입니다.`,
    '',
    `📋 "${params.caseTitle}" 사건 관련`,
    `💰 미납 금액 ${formatKRW(params.overdueAmount)}`,
    '',
    urgency,
    '',
  ];
  if (params.accountInfo) lines.push(`🏦 납부 계좌: ${params.accountInfo}`, '');
  lines.push('납부 완료 또는 분납 협의는 언제든 문의해 주세요 🙏');
  if (params.contactPhone) lines.push(`📞 ${params.contactPhone}`);
  return lines.join('\n');
}

export function buildOverdueNoticeDraft(params: OverdueNoticeParams): OverdueNoticeDraft {
  const generatedAt = new Date().toISOString();

  if (params.noticeType === 'sms') {
    return {
      body: buildSmsBody(params),
      provider: 'rule',
      generatedAt,
    };
  }

  if (params.noticeType === 'kakao') {
    return {
      body: buildKakaoBody(params),
      provider: 'rule',
      generatedAt,
    };
  }

  // email
  const { subject, body } = buildEmailBody(params);
  return { subject, body, provider: 'rule', generatedAt };
}
