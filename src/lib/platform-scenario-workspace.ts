import { PLATFORM_SCENARIO_ORGANIZATIONS, PLATFORM_SCENARIO_TEAM, type PlatformScenarioMode } from '@/lib/platform-scenarios';

type ScenarioCaseSpec = {
  key: string;
  title: string;
  referenceNo: string;
  caseType: string;
  caseStatus: string;
  stageKey: string;
  principalAmount: number;
  openedDaysAgo: number;
  summary: string;
  courtName?: string;
  caseNumber?: string;
  client: {
    name: string;
    email: string;
    relationLabel: string;
    portalEnabled: boolean;
  };
  counterparty: {
    displayName: string;
    partyRole: string;
    entityType: string;
    phone: string;
    email: string;
    address: string;
  };
  internalThread: string[];
  externalThread: string[];
  documentTitles: Array<{ title: string; kind: string; status: string; summary: string }>;
  requestItems: Array<{ title: string; kind: string; status: string; body: string; dueDaysAhead: number }>;
  scheduleItems: Array<{ title: string; kind: string; location: string; daysOffset: number; important?: boolean }>;
  billing: {
    entryTitle: string;
    amount: number;
    taxAmount: number;
    dueDaysAhead: number;
    agreementTitle: string;
    agreementType: string;
    fixedAmount: number;
    rate: number;
    paymentAmount: number;
    paymentDaysAgo: number;
    invoiceTitle: string;
    invoiceNo: string;
  };
  recovery?: Array<{ kind: string; amount: number; outcome: string; daysAgo: number; notes: string }>;
};

function isoDaysAgo(daysAgo: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function isoDaysAhead(daysAhead: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dateDaysAgo(daysAgo: number) {
  return isoDaysAgo(daysAgo).slice(0, 10);
}

function dateDaysAhead(daysAhead: number) {
  return isoDaysAhead(daysAhead).slice(0, 10);
}

function monthShift(month: string, delta: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + delta, 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

function focusMonthFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

const SCENARIO_CASE_SPECS: Record<PlatformScenarioMode, ScenarioCaseSpec[]> = {
  law_admin: [
    {
      key: 'case-1',
      title: '동명테크 용역대금 청구',
      referenceNo: 'LAW-24021',
      caseType: 'civil_litigation',
      caseStatus: 'in_progress',
      stageKey: 'brief_ready',
      principalAmount: 128000000,
      openedDaysAgo: 27,
      summary: '동명테크가 외주 개발대금 잔액을 지급받지 못해 소송과 협상을 병행하고 있습니다. 세금계산서, 작업확인서, 수정요청 이력까지 묶어 준비서면을 다듬는 단계입니다.',
      courtName: '서울중앙지방법원',
      caseNumber: '2026가합11231',
      client: { name: '김선아', email: 'ksa@dongmyeongtech.co.kr', relationLabel: '법무담당', portalEnabled: true },
      counterparty: { displayName: '에이블소프트', partyRole: '상대방', entityType: 'corporation', phone: '02-412-3311', email: 'legal@ablesoft.co.kr', address: '서울 송파구 법원로 88' },
      internalThread: [
        '거래명세서 원본과 납품 확인 메일 대조 끝났습니다. 미지급 사유로 주장한 하자 부분은 범위가 좁습니다.',
        '좋습니다. 하자 주장 반박은 수정요청 이력 순서대로 정리하고, 지급 지연 책임 부분을 앞쪽으로 당겨 주세요.',
        '상대방이 오늘 오전에 한 번 더 연락해 왔는데, 분할 지급안이면 협상 가능하다는 뉘앙스였습니다.',
        '분할 지급안은 열어두되 지연손해금 면제는 아직 주지 맙시다. 의뢰인 설명 문구도 같이 붙여 주세요.',
        '의뢰인 검토본은 5시 전에 보낼 수 있습니다. 준비서면 본문은 오늘 안에 마무리하겠습니다.',
        '좋습니다. 내일 오전 전자소송 업로드 전 최종 체크만 한 번 더 잡죠.'
      ],
      externalThread: [
        '검토본 확인했습니다. 지급기일 부분은 좀 더 명확하게 써 주시면 좋겠습니다.',
        '네, 해당 부분 보완해서 오늘 저녁에 다시 공유드리겠습니다.',
        '상대방에서 합의금 범위를 문의했는데, 어느 선까지 열어둘지 내부 의견 부탁드립니다.',
        '원금 전액과 일부 지연손해금 확보가 우선입니다. 장기 분할은 피하고 싶습니다.'
      ],
      documentTitles: [
        { title: '준비서면 v3', kind: 'pleading', status: 'pending_review', summary: '하자 주장 반박과 미지급 경위를 보강한 제출본' },
        { title: '거래명세 및 세금계산서 묶음', kind: 'evidence', status: 'approved', summary: '용역 범위와 지급 잔액을 입증하는 핵심 증빙' },
        { title: '합의 시나리오 메모', kind: 'memo', status: 'draft', summary: '의뢰인과 공유할 협상 기준안' }
      ],
      requestItems: [
        { title: '최종 준비서면 승인 요청', kind: 'document_request', status: 'in_review', body: '준비서면 제출 전 대표 승인 코멘트를 부탁드립니다.', dueDaysAhead: 1 },
        { title: '합의 가능 범위 의견 회신', kind: 'status_check', status: 'waiting_client', body: '상대방이 분할 지급안을 타진해 왔습니다. 허용 범위 회신 부탁드립니다.', dueDaysAhead: 2 }
      ],
      scheduleItems: [
        { title: '준비서면 제출', kind: 'deadline', location: '전자소송', daysOffset: 1, important: true },
        { title: '의뢰인 검토 미팅', kind: 'meeting', location: '화상회의', daysOffset: 0, important: true }
      ],
      billing: { entryTitle: '동명테크 추가 착수금', amount: 1800000, taxAmount: 180000, dueDaysAhead: 5, agreementTitle: '동명테크 송무 위임약정', agreementType: 'hourly_plus_success', fixedAmount: 1500000, rate: 8, paymentAmount: 990000, paymentDaysAgo: 3, invoiceTitle: '동명테크 3월 송무 비용', invoiceNo: 'INV-LAW-301' }
    },
    {
      key: 'case-2',
      title: '세림상사 가압류 본안 대응',
      referenceNo: 'LAW-24017',
      caseType: 'injunction_followup',
      caseStatus: 'pending_review',
      stageKey: 'evidence_review',
      principalAmount: 86000000,
      openedDaysAgo: 31,
      summary: '세림상사 건은 이미 보전절차를 진행했고, 본안에서 거래 경위와 허위 해제합의 주장 반박이 핵심입니다. 대표 진술 정리와 계좌 흐름 정리가 거의 끝난 상태입니다.',
      courtName: '인천지방법원',
      caseNumber: '2026카합482',
      client: { name: '최민재', email: 'ceo@serimtrade.co.kr', relationLabel: '대표', portalEnabled: true },
      counterparty: { displayName: '동부유통', partyRole: '상대방', entityType: 'corporation', phone: '032-811-4512', email: 'office@dongbu-dist.co.kr', address: '인천 연수구 송도과학로 44' },
      internalThread: [
        '대표 진술서 초안 받았습니다. 표현이 감정적으로 강해서 사실관계 위주로 다시 정리해야 합니다.',
        '네, 거래 개시부터 해제합의 주장 시점까지 표로 정리해 두겠습니다.',
        '계좌거래내역은 모레까지 전부 확보 가능합니다. 현금성 지급 주장 반박 자료도 같이 붙이겠습니다.',
        '좋습니다. 가압류 유지 필요성은 재산이동 정황 중심으로 정리합시다.',
        '상대방 대리인이 합의 의사를 슬쩍 비쳤는데, 지금은 본안 기조 유지가 맞겠습니다.',
        '동의합니다. 다만 의뢰인에게는 소송 기조와 합의 가능성을 동시에 설명해야 합니다.'
      ],
      externalThread: [
        '대표님 진술서 표현은 제가 조금 정리해서 다시 보내드릴게요. 사실 위주로만 정리하면 더 강해집니다.',
        '네, 감정적인 부분은 빼겠습니다. 재산 빼돌린 정황은 꼭 강조해 주세요.',
        '계좌 내역 중 확인이 필요한 부분을 표시해드렸습니다. 오늘 안에 추가 설명 부탁드립니다.',
        '확인해서 전달드리겠습니다. 내일 오전엔 직접 통화 가능하니 필요하면 잡아주세요.'
      ],
      documentTitles: [
        { title: '대표 진술서 정리본', kind: 'statement', status: 'draft', summary: '감정 표현을 줄이고 사실 위주로 재정리한 버전' },
        { title: '계좌거래 분석표', kind: 'evidence', status: 'pending_review', summary: '거래 흐름과 재산이동 정황 정리' },
        { title: '가압류 유지 의견 메모', kind: 'memo', status: 'approved', summary: '본안 병행 필요성과 유지 논리 요약' }
      ],
      requestItems: [
        { title: '추가 계좌내역 제출 요청', kind: 'document_submission', status: 'open', body: '누락된 2개 계좌 거래내역을 추가 제출 부탁드립니다.', dueDaysAhead: 3 },
        { title: '본안 대응 전략 설명 회의', kind: 'meeting_request', status: 'open', body: '대표와 본안 진행 방향을 짧게 공유할 미팅이 필요합니다.', dueDaysAhead: 1 }
      ],
      scheduleItems: [
        { title: '본안 전략 회의', kind: 'meeting', location: '회의실 A', daysOffset: 1, important: true },
        { title: '증빙 정리 완료 목표', kind: 'reminder', location: '공유 드라이브', daysOffset: 2 }
      ],
      billing: { entryTitle: '세림상사 가압류 비용', amount: 420000, taxAmount: 42000, dueDaysAhead: 8, agreementTitle: '세림상사 보전·본안 약정', agreementType: 'fixed_plus_success', fixedAmount: 2200000, rate: 6, paymentAmount: 550000, paymentDaysAgo: 6, invoiceTitle: '세림상사 보전절차 비용', invoiceNo: 'INV-LAW-302' }
    },
    {
      key: 'case-3',
      title: '도현물류 계약분쟁 자문',
      referenceNo: 'LAW-24012',
      caseType: 'legal_advisory',
      caseStatus: 'active',
      stageKey: 'advisory_drafting',
      principalAmount: 54000000,
      openedDaysAgo: 19,
      summary: '도현물류는 운송위탁계약 해지와 손해배상 범위를 두고 장기 분쟁 위험이 있습니다. 즉시 소송보다는 계약 조항 해석과 해지 통지 문안을 우선 정리하는 자문 건입니다.',
      client: { name: '박서정', email: 'ops@dohyun-logis.com', relationLabel: '운영이사', portalEnabled: true },
      counterparty: { displayName: '에코트랜스', partyRole: '상대방', entityType: 'corporation', phone: '031-755-1102', email: 'biz@ecotrans.kr', address: '경기 성남시 분당구 황새울로 10' },
      internalThread: [
        '계약서 검토 결과 해지권 조항은 도현물류 쪽이 불리하지 않습니다. 통지 문안만 조심하면 됩니다.',
        '손해배상 예정조항은 과도해서 감액 가능성도 같이 적어두면 좋겠습니다.',
        '의뢰인은 소송보다 거래 종료 정리를 우선 원합니다. 실무팀이 쓸 수 있는 체크리스트도 필요합니다.',
        '좋습니다. 자문의견서는 법리 파트와 운영 체크리스트를 분리하죠.',
        '상대방이 다음 주에 마지막 협의 요청을 해왔습니다. 회의 전 버전이 필요합니다.',
        '내일까지 초안 만들고, 회의 전날 최종본으로 정리하겠습니다.'
      ],
      externalThread: [
        '자문의견서에는 실제 운영팀이 참고할 체크리스트도 같이 넣어드릴 예정입니다.',
        '좋습니다. 현장에서 바로 볼 수 있는 형태면 더 좋습니다.',
        '해지 통지 문안은 너무 공격적으로 쓰지 않는 쪽으로 가겠습니다.',
        '네, 거래 종료는 하되 분쟁 확대는 막는 방향이면 좋겠습니다.'
      ],
      documentTitles: [
        { title: '계약 조항 검토 메모', kind: 'memo', status: 'approved', summary: '해지권, 위약벌, 손해배상 조항 검토' },
        { title: '자문의견서 초안', kind: 'opinion', status: 'pending_review', summary: '운영 체크리스트 포함 자문안' },
        { title: '해지 통지 예시문', kind: 'template', status: 'draft', summary: '분쟁 확대를 줄이는 톤의 통지 초안' }
      ],
      requestItems: [
        { title: '최종 계약본 업로드 요청', kind: 'document_request', status: 'completed', body: '부속합의서 포함 최종 계약본 업로드를 요청했습니다.', dueDaysAhead: 0 },
        { title: '협의 미팅 일정 확정', kind: 'schedule_request', status: 'in_review', body: '상대방과의 마지막 협의 일정 확정이 필요합니다.', dueDaysAhead: 2 }
      ],
      scheduleItems: [
        { title: '자문의견서 발송', kind: 'deadline', location: '메일 발송', daysOffset: 2, important: true },
        { title: '상대방 협의 전 내부 점검', kind: 'meeting', location: '전화회의', daysOffset: 4 }
      ],
      billing: { entryTitle: '도현물류 자문 2차 비용', amount: 960000, taxAmount: 96000, dueDaysAhead: 4, agreementTitle: '도현물류 분쟁자문 약정', agreementType: 'fixed', fixedAmount: 2400000, rate: 0, paymentAmount: 1320000, paymentDaysAgo: 8, invoiceTitle: '도현물류 자문 수수료', invoiceNo: 'INV-LAW-303' }
    }
  ],
  collection_admin: [
    {
      key: 'case-1',
      title: '청운상사 미수금 회수',
      referenceNo: 'COL-24031',
      caseType: 'debt_collection',
      caseStatus: 'collection',
      stageKey: 'installment_negotiation',
      principalAmount: 91000000,
      openedDaysAgo: 24,
      summary: '청운상사 건은 채무자와 직접 분할납부 약정을 조율 중이며, 첫 입금만 확인되면 회수 흐름이 안정됩니다. 약정 체결과 입금 리마인드가 핵심입니다.',
      client: { name: '김도형', email: 'finance@cheongwoon.co.kr', relationLabel: '재무팀장', portalEnabled: true },
      counterparty: { displayName: '세광유통', partyRole: '채무자', entityType: 'corporation', phone: '02-734-9191', email: 'manager@segwangdist.kr', address: '서울 종로구 새문안로 55' },
      internalThread: [
        '채무자 오전 통화 완료했습니다. 금요일 1차 입금 가능하다고 했고 약정서만 최종 확인하면 됩니다.',
        '좋아요. 입금 예정일 전날 한 번 더 리마인드하고, 약정서 서명본을 오늘 안에 회신받아야 합니다.',
        '대표 배우자 연락선도 확보했습니다. 약정 불이행 시 바로 연락 가능한 상태입니다.',
        '강하게 몰기보다 첫 입금 성공이 중요합니다. 보고 문구는 보수적으로 써 주세요.',
        '의뢰인 쪽에는 회수 가능성이 높다고만 공유했고, 법적 전환은 아직 언급하지 않았습니다.',
        '좋습니다. 입금 확인 후 정산표와 보고서를 동시에 업데이트합시다.'
      ],
      externalThread: [
        '채무자와 1차 약정안은 거의 맞췄습니다. 금요일 입금이 핵심 체크포인트입니다.',
        '좋습니다. 첫 입금만 확인되면 다음 회차도 추진해 주세요.',
        '약정서 문안은 너무 자극적이지 않게 정리했습니다. 이 정도면 회신 받을 가능성이 큽니다.',
        '네, 의뢰인 보고서에도 같은 톤으로 반영 부탁드립니다.'
      ],
      documentTitles: [
        { title: '분할납부 약정서 초안', kind: 'agreement', status: 'pending_review', summary: '1차 입금 후 4회 분할 조건 반영' },
        { title: '채무자 통화 요약', kind: 'memo', status: 'approved', summary: '최근 통화와 납부 의사 정리' },
        { title: '의뢰인 보고서 초안', kind: 'report', status: 'draft', summary: '회수 전망과 리스크를 보수적으로 정리' }
      ],
      requestItems: [
        { title: '약정서 문안 최종 확인', kind: 'signature_request', status: 'in_review', body: '첫 입금 전 약정서 최종 문안 확인이 필요합니다.', dueDaysAhead: 1 },
        { title: '입금 후 보고서 승인', kind: 'document_request', status: 'open', body: '첫 입금 확인 후 발송할 보고서 승인 부탁드립니다.', dueDaysAhead: 3 }
      ],
      scheduleItems: [
        { title: '1차 입금 확인', kind: 'deadline', location: '정산 계좌', daysOffset: 1, important: true },
        { title: '채무자 재통화', kind: 'reminder', location: '상담실', daysOffset: 0, important: true }
      ],
      billing: { entryTitle: '청운상사 회수 정산 예정', amount: 2450000, taxAmount: 245000, dueDaysAhead: 3, agreementTitle: '청운상사 회수 보수 약정', agreementType: 'success_fee', fixedAmount: 0, rate: 12, paymentAmount: 1570000, paymentDaysAgo: 2, invoiceTitle: '청운상사 1차 회수 정산', invoiceNo: 'INV-COL-301' },
      recovery: [
        { kind: 'phone_contact', amount: 0, outcome: 'promise_to_pay', daysAgo: 0, notes: '금요일 1차 입금 약속 확보' },
        { kind: 'installment_draft', amount: 0, outcome: 'document_sent', daysAgo: 1, notes: '약정서 초안 전달 완료' },
        { kind: 'deposit_confirmed', amount: 7200000, outcome: 'partial_recovery', daysAgo: 6, notes: '소액 선입금 확인 및 정산 반영' }
      ]
    },
    {
      key: 'case-2',
      title: '에이원건설 장기연체 관리',
      referenceNo: 'COL-24028',
      caseType: 'debt_collection',
      caseStatus: 'negotiation',
      stageKey: 'field_followup',
      principalAmount: 134000000,
      openedDaysAgo: 34,
      summary: '에이원건설은 현장 방문과 대표 측 가족 연락선 확보까지 마친 상태입니다. 직접 압박보다 현실적인 상환 일정을 끌어내는 것이 목표입니다.',
      client: { name: '오현주', email: 'director@aonebuild.co.kr', relationLabel: '관리이사', portalEnabled: true },
      counterparty: { displayName: '경원토건', partyRole: '채무자', entityType: 'corporation', phone: '031-982-1004', email: 'ceo@kyungwonconst.kr', address: '경기 김포시 봉수대로 111' },
      internalThread: [
        '현장 방문 결과 대표가 직접 만나진 못했지만 배우자와 연락선은 확보했습니다.',
        '좋습니다. 바로 강하게 들어가기보다 상환안부터 다시 받아 봅시다.',
        '공사대금 회수 지연 사유를 계속 자금 경색으로만 설명하고 있어서 자료 요청도 병행하려 합니다.',
        '네, 재무자료 요구는 하되 거부하면 법무 전환 가능성도 열어두죠.',
        '의뢰인에게는 회수 전망을 과도하게 높이지 않았습니다. 현장 대응 기록만 먼저 공유했습니다.',
        '그게 맞습니다. 이번 주 안에 상환안 없으면 다음 단계 문안 준비합시다.'
      ],
      externalThread: [
        '현장 대응 기록 공유드립니다. 대표와 직접 통화는 못했지만 상환 협의 여지는 남아 있습니다.',
        '확인했습니다. 급하게 소송으로 가지 말고 협의안을 한 번 더 받아주세요.',
        '재무자료 제출 여부가 중요해서 내일까지 한 번 더 확인하겠습니다.',
        '좋습니다. 주말 전까지 방향만 정리되면 됩니다.'
      ],
      documentTitles: [
        { title: '현장 방문 기록지', kind: 'field_note', status: 'approved', summary: '현장 체류, 통화, 면담 시도 기록' },
        { title: '상환안 요청서', kind: 'notice', status: 'pending_review', summary: '현실적인 상환계획 제출 요청' },
        { title: '법무전환 검토 메모', kind: 'memo', status: 'draft', summary: '협의 실패 시 전환 기준 정리' }
      ],
      requestItems: [
        { title: '상환안 재제출 요청', kind: 'status_check', status: 'open', body: '채무자 측에 상환안을 다시 제출하도록 요청했습니다.', dueDaysAhead: 2 },
        { title: '현장기록 검토 요청', kind: 'document_request', status: 'completed', body: '의뢰인에게 현장 대응기록을 공유하고 의견을 받았습니다.', dueDaysAhead: 0 }
      ],
      scheduleItems: [
        { title: '대표 재통화', kind: 'reminder', location: '모바일 통화', daysOffset: 2, important: true },
        { title: '법무전환 기준 점검', kind: 'meeting', location: '내부 회의', daysOffset: 4 }
      ],
      billing: { entryTitle: '에이원건설 현장 방문비', amount: 180000, taxAmount: 18000, dueDaysAhead: 6, agreementTitle: '에이원건설 회수 위임약정', agreementType: 'mixed', fixedAmount: 1200000, rate: 10, paymentAmount: 440000, paymentDaysAgo: 7, invoiceTitle: '에이원건설 현장 대응비', invoiceNo: 'INV-COL-302' },
      recovery: [
        { kind: 'field_visit', amount: 0, outcome: 'contact_line_secured', daysAgo: 1, notes: '배우자 연락선 확보' },
        { kind: 'restructure_request', amount: 0, outcome: 'awaiting_plan', daysAgo: 3, notes: '상환안 재제출 요청' }
      ]
    },
    {
      key: 'case-3',
      title: '대호유통 법적추심 전환 준비',
      referenceNo: 'COL-24019',
      caseType: 'debt_collection',
      caseStatus: 'legal_review',
      stageKey: 'handoff_preparation',
      principalAmount: 77000000,
      openedDaysAgo: 41,
      summary: '대호유통 건은 자발적 상환 가능성이 낮아 법적추심 전환을 준비하고 있습니다. 채무자 접촉기록과 증빙을 정리해 법무로 넘기는 단계입니다.',
      client: { name: '장민수', email: 'ceo@daeho-dist.co.kr', relationLabel: '대표', portalEnabled: true },
      counterparty: { displayName: '청광상회', partyRole: '채무자', entityType: 'corporation', phone: '042-521-8811', email: 'office@cheonggwang.kr', address: '대전 서구 문정로 32' },
      internalThread: [
        '최근 두 번 통화에서 상환 의지가 거의 없었습니다. 말만 미루는 상태입니다.',
        '그럼 법적추심 전환 자료를 이번 주 안에 묶어서 넘기죠.',
        '통화녹취 요약과 방문기록은 오늘 정리됩니다. 거래증빙은 의뢰인 쪽에서 추가로 받았습니다.',
        '좋습니다. 법무가 바로 검토할 수 있게 시간순 타임라인까지 붙여 주세요.',
        '의뢰인에게는 전환 가능성 높다고 설명했고, 소송 예상 기간도 간단히 안내했습니다.',
        '네, 너무 확정적으로 말하진 말고 준비 단계라고 표현만 유지합시다.'
      ],
      externalThread: [
        '법적추심 전환 자료를 준비 중입니다. 통화녹취와 방문기록, 거래증빙을 한 번에 묶어드리겠습니다.',
        '좋습니다. 실행 전 예상 기간과 비용도 같이 알고 싶습니다.',
        '기본 예상 기간과 비용 범위도 메모에 포함해 드리겠습니다.',
        '확인 후 바로 결정하겠습니다. 진행 속도만 최대한 빠르게 부탁드립니다.'
      ],
      documentTitles: [
        { title: '법무 전달 패키지', kind: 'handoff', status: 'pending_review', summary: '녹취, 방문기록, 거래증빙, 요약메모를 묶은 전달본' },
        { title: '채무자 접촉 타임라인', kind: 'timeline', status: 'approved', summary: '최근 한 달 접촉 흐름 정리' },
        { title: '전환 예상 비용 메모', kind: 'memo', status: 'draft', summary: '법적추심 예상 비용과 기간' }
      ],
      requestItems: [
        { title: '법무 전달자료 최종 확인', kind: 'document_request', status: 'in_review', body: '전달 전 누락 자료가 없는지 최종 확인 부탁드립니다.', dueDaysAhead: 1 },
        { title: '전환 승인 회신', kind: 'signature_request', status: 'waiting_client', body: '의뢰인 최종 승인 회신이 필요합니다.', dueDaysAhead: 2 }
      ],
      scheduleItems: [
        { title: '법무 전달', kind: 'meeting', location: '공유 드라이브', daysOffset: 1, important: true },
        { title: '의뢰인 승인 확인', kind: 'reminder', location: '전화 회신', daysOffset: 2 }
      ],
      billing: { entryTitle: '대호유통 전환 준비 비용', amount: 310000, taxAmount: 31000, dueDaysAhead: 7, agreementTitle: '대호유통 추심 전환 약정', agreementType: 'pre_legal', fixedAmount: 980000, rate: 5, paymentAmount: 0, paymentDaysAgo: 0, invoiceTitle: '대호유통 법무전달 준비비', invoiceNo: 'INV-COL-303' },
      recovery: [
        { kind: 'call_attempt', amount: 0, outcome: 'no_payment_intent', daysAgo: 2, notes: '상환 의지 없음 확인' },
        { kind: 'handoff_package', amount: 0, outcome: 'ready_for_legal', daysAgo: 0, notes: '법무 전달 패키지 초안 완성' }
      ]
    }
  ],
  other_admin: [
    {
      key: 'case-1',
      title: '라온케어 제휴 운영 조정',
      referenceNo: 'OPS-24014',
      caseType: 'partner_operation',
      caseStatus: 'active',
      stageKey: 'notice_alignment',
      principalAmount: 18000000,
      openedDaysAgo: 22,
      summary: '라온케어 제휴 운영건은 고객 안내문, 파트너 발송 일정, 내부 운영표를 동시에 맞추는 조정 업무입니다. 고객 혼선 없이 공지 시점을 맞추는 것이 핵심입니다.',
      client: { name: '유서진', email: 'ops@raoncare.kr', relationLabel: '운영매니저', portalEnabled: true },
      counterparty: { displayName: '에이펙스헬스', partyRole: '제휴사', entityType: 'corporation', phone: '02-522-1940', email: 'partnership@apexhealth.kr', address: '서울 강남구 논현로 52' },
      internalThread: [
        '운영표 최신본 반영했습니다. 파트너가 요청한 문구 수정도 거의 끝났습니다.',
        '좋습니다. 고객 공지문과 내부 매뉴얼 간 표현 차이만 다시 맞춰 주세요.',
        '내일 오후 2시에 파트너 최종 확인 미팅 잡혔습니다.',
        '그 전에 발송 일정표만 확정하면 바로 진행 가능하겠습니다.',
        '고객센터용 안내문은 질문이 많은 항목 위주로 다시 정리해 두겠습니다.',
        '좋아요. 발송 후 문의 폭주 대비 FAQ도 같이 붙입시다.'
      ],
      externalThread: [
        '공지문 최신본 공유드립니다. 발송 일정은 내일 최종 확정 가능할 것 같습니다.',
        '확인했습니다. 표현만 조금 다듬으면 바로 사용할 수 있겠습니다.',
        '고객센터 대응 문안도 같이 전달드릴 예정입니다.',
        '좋습니다. 운영 혼선만 없게 맞춰 주세요.'
      ],
      documentTitles: [
        { title: '고객 공지문 최종본', kind: 'notice', status: 'pending_review', summary: '발송 직전 문안' },
        { title: '운영 FAQ 시트', kind: 'faq', status: 'approved', summary: '고객센터 공통 응답 정리' },
        { title: '제휴 일정표', kind: 'schedule_sheet', status: 'draft', summary: '발송·회신·점검 일정표' }
      ],
      requestItems: [
        { title: '공지문 최종 승인', kind: 'document_request', status: 'in_review', body: '공지문 최종 승인과 발송 시점 확인이 필요합니다.', dueDaysAhead: 1 },
        { title: 'FAQ 보완 의견 회신', kind: 'status_check', status: 'open', body: '고객센터에서 추가 질문 예상 항목이 있는지 회신 부탁드립니다.', dueDaysAhead: 2 }
      ],
      scheduleItems: [
        { title: '공지문 발송', kind: 'deadline', location: '메일링 시스템', daysOffset: 1, important: true },
        { title: '파트너 최종 확인 미팅', kind: 'meeting', location: '화상회의', daysOffset: 0 }
      ],
      billing: { entryTitle: '라온케어 운영대행 정산', amount: 950000, taxAmount: 95000, dueDaysAhead: 4, agreementTitle: '라온케어 운영대행 약정', agreementType: 'monthly_service', fixedAmount: 950000, rate: 0, paymentAmount: 1045000, paymentDaysAgo: 5, invoiceTitle: '라온케어 3월 운영대행비', invoiceNo: 'INV-OPS-301' }
    },
    {
      key: 'case-2',
      title: '하늘교육 민원 문서 재정비',
      referenceNo: 'OPS-24009',
      caseType: 'customer_response',
      caseStatus: 'in_progress',
      stageKey: 'response_rewrite',
      principalAmount: 12000000,
      openedDaysAgo: 29,
      summary: '하늘교육 민원 건은 학부모 설명 버전과 내부 보고 버전을 분리해 재정리하는 업무입니다. 표현 수위를 조정하면서 회신 일정을 지키는 것이 목적입니다.',
      client: { name: '전하은', email: 'support@haneuledu.kr', relationLabel: '고객센터장', portalEnabled: true },
      counterparty: { displayName: '민원 제기 학부모', partyRole: '고객', entityType: 'individual', phone: '010-2331-4112', email: 'guardian@example.com', address: '경기 수원시 영통구 산남로 9' },
      internalThread: [
        '학부모 설명 버전과 내부 보고 버전 분리 초안 만들었습니다.',
        '좋습니다. 학부모용은 최대한 단문으로 가고 내부 보고는 사실관계 위주로 남겨 주세요.',
        '민감한 표현 두 군데는 더 순하게 바꾸는 게 좋겠습니다.',
        '네, 법적 리스크 언급은 내부 문서에만 남기겠습니다.',
        '회신 일정은 내일 오후까지 맞출 수 있습니다.',
        '좋아요. 발송 후 후속 질의 대응문안도 같이 묶어 주세요.'
      ],
      externalThread: [
        '민원 회신문은 학부모 안내용과 내부 보고용으로 나눠 정리하고 있습니다.',
        '좋습니다. 발송 일정만 지켜주시면 됩니다.',
        '후속 질의에 대비한 추가 응답 문안도 같이 전달드릴 예정입니다.',
        '확인 후 바로 운영팀과 공유하겠습니다.'
      ],
      documentTitles: [
        { title: '학부모 안내문', kind: 'response', status: 'pending_review', summary: '외부 발송용 회신문' },
        { title: '내부 보고 메모', kind: 'report', status: 'approved', summary: '사실관계와 리스크 정리' },
        { title: '후속 질의 대응문안', kind: 'template', status: 'draft', summary: '반복 질문 대응용 문안' }
      ],
      requestItems: [
        { title: '최종 회신문 검토', kind: 'document_request', status: 'open', body: '내일 발송 전 최종 회신문 검토가 필요합니다.', dueDaysAhead: 1 },
        { title: '후속 응답 범위 확인', kind: 'meeting_request', status: 'in_review', body: '후속 질의에 어디까지 답할지 합의가 필요합니다.', dueDaysAhead: 2 }
      ],
      scheduleItems: [
        { title: '민원 회신 발송', kind: 'deadline', location: '고객센터', daysOffset: 1, important: true },
        { title: '후속 응답 범위 점검', kind: 'meeting', location: '운영 회의', daysOffset: 2 }
      ],
      billing: { entryTitle: '하늘교육 문서 재정비 비용', amount: 680000, taxAmount: 68000, dueDaysAhead: 5, agreementTitle: '하늘교육 고객대응 운영약정', agreementType: 'project', fixedAmount: 680000, rate: 0, paymentAmount: 0, paymentDaysAgo: 0, invoiceTitle: '하늘교육 민원 대응비', invoiceNo: 'INV-OPS-302' }
    },
    {
      key: 'case-3',
      title: '청명플랫폼 월말 정산 점검',
      referenceNo: 'OPS-24004',
      caseType: 'settlement_review',
      caseStatus: 'waiting_client',
      stageKey: 'adjustment_pending',
      principalAmount: 24000000,
      openedDaysAgo: 17,
      summary: '청명플랫폼 건은 월말 정산표 누락 항목과 수정 요청을 정리하는 운영 점검입니다. 누락분을 빠르게 반영하고 최종 확정본을 회신하는 단계입니다.',
      client: { name: '권지수', email: 'finance@cheongmyeong.io', relationLabel: '정산담당', portalEnabled: true },
      counterparty: { displayName: '청명플랫폼 운영팀', partyRole: '파트너', entityType: 'corporation', phone: '070-8822-1045', email: 'ops@cheongmyeong.io', address: '서울 마포구 월드컵북로 18' },
      internalThread: [
        '정산표에서 누락된 항목 3건 확인했습니다. 금액은 이미 맞췄고 설명란만 보완하면 됩니다.',
        '좋습니다. 수정 요청 사유도 짧게 붙여 주세요.',
        '파트너 쪽에서 오늘 오후에 다시 확인해 준다고 했습니다.',
        '그러면 최종본은 내일 오전에 회신 가능하겠네요.',
        '정산 문의가 반복되는 항목은 별도 메모로 남기겠습니다.',
        '좋아요. 다음 달엔 같은 이슈 안 나게 체크리스트도 만들죠.'
      ],
      externalThread: [
        '누락 항목 3건 보완 중입니다. 최종본은 내일 오전 회신드릴 수 있습니다.',
        '확인했습니다. 수정 사유만 같이 적어 주시면 바로 처리 가능합니다.',
        '반복 문의가 있었던 항목은 체크리스트로 같이 정리하겠습니다.',
        '좋습니다. 다음 정산부터는 그 기준으로 맞추겠습니다.'
      ],
      documentTitles: [
        { title: '월말 정산표 수정본', kind: 'settlement_sheet', status: 'pending_review', summary: '누락 항목 반영본' },
        { title: '정산 수정 사유 메모', kind: 'memo', status: 'approved', summary: '수정 요청 배경과 처리 기준' },
        { title: '다음 달 체크리스트', kind: 'checklist', status: 'draft', summary: '반복 누락 방지용 체크리스트' }
      ],
      requestItems: [
        { title: '최종 정산표 회신', kind: 'document_submission', status: 'in_review', body: '보완된 정산표 최종 회신이 필요합니다.', dueDaysAhead: 1 },
        { title: '체크리스트 승인', kind: 'document_request', status: 'open', body: '다음 달부터 적용할 체크리스트 확인 부탁드립니다.', dueDaysAhead: 3 }
      ],
      scheduleItems: [
        { title: '정산표 회신', kind: 'deadline', location: '정산 메일', daysOffset: 1, important: true },
        { title: '반복이슈 점검', kind: 'meeting', location: '내부 미팅', daysOffset: 3 }
      ],
      billing: { entryTitle: '청명플랫폼 월말 정산 검토비', amount: 640000, taxAmount: 64000, dueDaysAhead: 7, agreementTitle: '청명플랫폼 정산 검토약정', agreementType: 'monthly_service', fixedAmount: 640000, rate: 0, paymentAmount: 704000, paymentDaysAgo: 10, invoiceTitle: '청명플랫폼 정산 검토비', invoiceNo: 'INV-OPS-303' }
    }
  ]
};

const BASE_SCENARIO_CLIENTS = [
  { name: '김선우', relationLabel: '대표' },
  { name: '박지안', relationLabel: '운영이사' },
  { name: '이도윤', relationLabel: '재무담당' },
  { name: '최하린', relationLabel: '실무담당' },
  { name: '정유안', relationLabel: '총무책임' },
  { name: '서민재', relationLabel: '관리팀장' },
  { name: '윤가온', relationLabel: '실장' },
  { name: '강지후', relationLabel: '대표' },
  { name: '조수빈', relationLabel: '이사' },
  { name: '문태윤', relationLabel: '법무담당' },
  { name: '임서현', relationLabel: '재경팀장' },
  { name: '배하준', relationLabel: '실무담당' },
  { name: '한유진', relationLabel: '센터장' },
  { name: '오지호', relationLabel: '운영매니저' },
  { name: '신다온', relationLabel: '대표' },
  { name: '노지율', relationLabel: '부장' },
  { name: '류하람', relationLabel: '고객지원' },
  { name: '백예준', relationLabel: '회계담당' },
  { name: '유서아', relationLabel: '실무담당' },
  { name: '차도현', relationLabel: '정산담당' },
  { name: '남채린', relationLabel: '운영지원' }
] as const;

function buildScenarioClients(mode: PlatformScenarioMode, organization: { slug: string }, specs: ScenarioCaseSpec[]) {
  return specs.flatMap((spec, caseIndex) => {
    const supportingPeople = BASE_SCENARIO_CLIENTS.slice(caseIndex * 7, caseIndex * 7 + 7);

    return supportingPeople.map((persona, index) => {
      const isPrimary = index === 0;
      const clientName = isPrimary ? spec.client.name : persona.name;
      const clientEmail = isPrimary
        ? spec.client.email
        : `${organization.slug}.client.${caseIndex + 1}.${index + 1}@demo.local`;

      return {
        id: `${organization.slug}-client-${caseIndex + 1}-${index + 1}`,
        case_id: `${organization.slug}-${spec.key}`,
        client_name: clientName,
        client_email_snapshot: clientEmail,
        relation_label: isPrimary ? spec.client.relationLabel : persona.relationLabel,
        is_portal_enabled: index < 5,
        profile_id: `${organization.slug}-client-profile-${caseIndex + 1}-${index + 1}`,
        cases: { title: spec.title }
      };
    });
  });
}

function buildScenarioWorkspace(mode: PlatformScenarioMode) {
  const organization = PLATFORM_SCENARIO_ORGANIZATIONS[mode];
  const team = PLATFORM_SCENARIO_TEAM[mode];
  const specs = SCENARIO_CASE_SPECS[mode];

  const clients = buildScenarioClients(mode, organization, specs);

  const documents = specs.flatMap((spec, caseIndex) => spec.documentTitles.map((document, documentIndex) => ({
    id: `${organization.slug}-${spec.key}-doc-${documentIndex + 1}`,
    case_id: `${organization.slug}-${spec.key}`,
    title: document.title,
    document_kind: document.kind,
    approval_status: document.status,
    client_visibility: document.kind === 'memo' ? 'internal_only' : 'case_client',
    updated_at: isoDaysAgo(caseIndex + documentIndex + 1, 14, 10),
    reviewed_at: document.status === 'approved' ? isoDaysAgo(caseIndex + documentIndex + 1, 16, 20) : null,
    reviewed_by_name: document.status === 'approved' ? team[1]?.name ?? team[0]?.name ?? '검토자' : null,
    created_by_name: team[caseIndex % team.length]?.name ?? '작성자',
    summary: document.summary,
    cases: { title: spec.title }
  })));

  const requests = specs.flatMap((spec, caseIndex) => spec.requestItems.map((request, requestIndex) => ({
    id: `${organization.slug}-${spec.key}-req-${requestIndex + 1}`,
    case_id: `${organization.slug}-${spec.key}`,
    title: request.title,
    request_kind: request.kind,
    status: request.status,
    body: request.body,
    due_at: isoDaysAhead(request.dueDaysAhead, 15, 0),
    created_at: isoDaysAgo(caseIndex + requestIndex + 2, 11, 30),
    cases: { title: spec.title }
  })));

  const schedules = specs.flatMap((spec, caseIndex) => spec.scheduleItems.map((schedule, scheduleIndex) => ({
    id: `${organization.slug}-${spec.key}-sch-${scheduleIndex + 1}`,
    case_id: `${organization.slug}-${spec.key}`,
    title: schedule.title,
    schedule_kind: schedule.kind,
    scheduled_start: schedule.daysOffset >= 0 ? isoDaysAhead(schedule.daysOffset, 10 + scheduleIndex, 0) : isoDaysAgo(Math.abs(schedule.daysOffset), 10, 0),
    scheduled_end: schedule.daysOffset >= 0 ? isoDaysAhead(schedule.daysOffset, 11 + scheduleIndex, 0) : isoDaysAgo(Math.abs(schedule.daysOffset), 11, 0),
    location: schedule.location,
    is_important: Boolean(schedule.important),
    client_visibility: 'internal_only',
    created_by: team[(caseIndex + scheduleIndex) % team.length]?.id ?? null,
    created_by_name: team[(caseIndex + scheduleIndex) % team.length]?.name ?? '작성자',
    created_at: isoDaysAgo(caseIndex + scheduleIndex + 1, 9, 10),
    updated_at: isoDaysAgo(caseIndex + scheduleIndex, 15, 20),
    cases: { title: spec.title }
  }))).concat(
    specs.flatMap((spec, caseIndex) => {
      const caseClients = clients.filter((client) => client.case_id === `${organization.slug}-${spec.key}`).slice(1, 4);

      return caseClients.map((client, extraIndex) => ({
        id: `${organization.slug}-${spec.key}-sch-followup-${extraIndex + 1}`,
        case_id: `${organization.slug}-${spec.key}`,
        title: `${client.client_name} 후속 확인`,
        schedule_kind: extraIndex % 2 === 0 ? 'meeting' : 'reminder',
        scheduled_start: isoDaysAhead(caseIndex + extraIndex + 1, 14 + extraIndex, 0),
        scheduled_end: isoDaysAhead(caseIndex + extraIndex + 1, 15 + extraIndex, 0),
        location: extraIndex % 2 === 0 ? '전화/화상 확인' : '내부 점검',
        is_important: extraIndex === 0,
        client_visibility: 'internal_only',
        created_by: team[(caseIndex + extraIndex) % team.length]?.id ?? null,
        created_by_name: team[(caseIndex + extraIndex) % team.length]?.name ?? '작성자',
        created_at: isoDaysAgo(caseIndex + extraIndex + 1, 11, 10),
        updated_at: isoDaysAgo(caseIndex + extraIndex, 17, 20),
        notes: `${client.client_name} 관련 후속 조율과 상태 확인 메모`,
        cases: { title: spec.title }
      }));
    })
  );

  const messages = specs.flatMap((spec, caseIndex) => {
    const internalMessages = spec.internalThread.map((body, index) => ({
      id: `${organization.slug}-${spec.key}-msg-in-${index + 1}`,
      case_id: `${organization.slug}-${spec.key}`,
      body,
      is_internal: true,
      created_at: isoDaysAgo(caseIndex + Math.max(0, 6 - index), 9 + (index % 4), 15),
      sender_role: index % 2 === 0 ? 'staff' : 'admin',
      sender_profile_id: team[(index + caseIndex) % team.length]?.id ?? null,
      sender: { full_name: team[(index + caseIndex) % team.length]?.name ?? '구성원' },
      cases: { title: spec.title }
    }));

    const externalMessages = spec.externalThread.map((body, index) => ({
      id: `${organization.slug}-${spec.key}-msg-ex-${index + 1}`,
      case_id: `${organization.slug}-${spec.key}`,
      body,
      is_internal: false,
      created_at: isoDaysAgo(caseIndex + Math.max(0, 5 - index), 13 + (index % 3), 20),
      sender_role: index % 2 === 0 ? 'client' : 'admin',
      sender_profile_id: index % 2 === 0 ? null : team[(index + 1 + caseIndex) % team.length]?.id ?? null,
      sender: { full_name: index % 2 === 0 ? spec.client.name : team[(index + 1 + caseIndex) % team.length]?.name ?? '담당자' },
      cases: { title: spec.title }
    }));

    return [...internalMessages, ...externalMessages];
  }).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  const cases = specs.map((spec, index) => ({
    id: `${organization.slug}-${spec.key}`,
    organization_id: organization.id,
    title: spec.title,
    reference_no: spec.referenceNo,
    case_type: spec.caseType,
    case_status: spec.caseStatus,
    stage_key: spec.stageKey,
    principal_amount: spec.principalAmount,
    updated_at: isoDaysAgo(index + 1, 16, 40),
    opened_on: dateDaysAgo(spec.openedDaysAgo),
    summary: spec.summary,
    court_name: spec.courtName ?? null,
    case_number: spec.caseNumber ?? null,
    module_flags: { collection: mode === 'collection_admin' },
    clients: clients.filter((client) => client.case_id === `${organization.slug}-${spec.key}`),
    parties: [
      {
        id: `${organization.slug}-${spec.key}-party-1`,
        display_name: spec.counterparty.displayName,
        party_role: spec.counterparty.partyRole,
        entity_type: spec.counterparty.entityType,
        phone: spec.counterparty.phone,
        email: spec.counterparty.email,
        address_summary: spec.counterparty.address,
        is_primary: true
      }
    ],
    caseOrganizations: mode === 'collection_admin'
      ? [{ id: `${organization.slug}-${spec.key}-org-1`, role: 'legal_partner', is_lead: false, access_scope: 'documents_and_messages', billing_scope: 'view', communication_scope: 'internal_only', agreement_summary: '법무 검토 필요 시 전달', organization: { name: '새온가람법(가상조직)' } }]
      : mode === 'law_admin'
        ? [{ id: `${organization.slug}-${spec.key}-org-1`, role: 'collection_partner', is_lead: false, access_scope: 'status_only', billing_scope: 'none', communication_scope: 'internal_only', agreement_summary: '회수 실행 시 전달 가능', organization: { name: '누리채움원(가상조직)' } }]
        : [{ id: `${organization.slug}-${spec.key}-org-1`, role: 'service_partner', is_lead: false, access_scope: 'shared_documents', billing_scope: 'view', communication_scope: 'external_visible', agreement_summary: '운영 조율 목적 협업', organization: { name: '새온가람법(가상조직)' } }],
    documents: documents.filter((document) => document.case_id === `${organization.slug}-${spec.key}`),
    requests: requests.filter((request) => request.case_id === `${organization.slug}-${spec.key}`),
    schedules: schedules.filter((schedule) => schedule.case_id === `${organization.slug}-${spec.key}`),
    messages: messages.filter((message) => message.case_id === `${organization.slug}-${spec.key}`),
    feeAgreements: [
      {
        id: `${organization.slug}-${spec.key}-agreement-1`,
        title: spec.billing.agreementTitle,
        agreement_type: spec.billing.agreementType,
        fixed_amount: spec.billing.fixedAmount,
        rate: spec.billing.rate,
        effective_from: dateDaysAgo(spec.openedDaysAgo - 1),
        effective_to: dateDaysAhead(90),
        is_active: true,
        description: '현재 운영 기준으로 사용 중인 약정'
      }
    ],
    billingEntries: [
      {
        id: `${organization.slug}-${spec.key}-entry-1`,
        case_id: `${organization.slug}-${spec.key}`,
        title: spec.billing.entryTitle,
        amount: spec.billing.amount,
        tax_amount: spec.billing.taxAmount,
        due_on: dateDaysAhead(spec.billing.dueDaysAhead),
        notes: '현재 시점 기준 확인이 필요한 항목',
        status: spec.billing.paymentAmount > 0 ? 'issued' : 'draft',
        cases: { title: spec.title },
        targetLabel: spec.client.name,
        dueStatus: spec.billing.dueDaysAhead <= 0 ? 'overdue' : 'upcoming'
      }
    ],
    invoices: [
      {
        id: `${organization.slug}-${spec.key}-invoice-1`,
        invoice_no: spec.billing.invoiceNo,
        title: spec.billing.invoiceTitle,
        total_amount: spec.billing.amount + spec.billing.taxAmount,
        status: spec.billing.paymentAmount > 0 ? 'issued' : 'draft'
      }
    ],
    payments: spec.billing.paymentAmount > 0 ? [
      {
        id: `${organization.slug}-${spec.key}-payment-1`,
        amount: spec.billing.paymentAmount,
        payment_method: 'bank_transfer',
        payment_status: 'confirmed',
        received_at: isoDaysAgo(spec.billing.paymentDaysAgo, 13, 15),
        case_id: `${organization.slug}-${spec.key}`,
        cases: { title: spec.title }
      }
    ] : [],
    orgSettlements: mode === 'collection_admin' ? [
      {
        id: `${organization.slug}-${spec.key}-settlement-1`,
        title: `${spec.title} 내부 정산 예정`,
        amount: Math.round(spec.billing.amount * 0.32),
        status: 'pending',
        due_on: dateDaysAhead(spec.billing.dueDaysAhead + 3)
      }
    ] : [],
    recoveryActivities: (spec.recovery ?? []).map((activity, recoveryIndex) => ({
      id: `${organization.slug}-${spec.key}-recovery-${recoveryIndex + 1}`,
      activity_kind: activity.kind,
      occurred_at: isoDaysAgo(activity.daysAgo, 15, 30),
      amount: activity.amount,
      outcome_status: activity.outcome,
      notes: activity.notes,
      cases: { title: spec.title }
    }))
  }));

  const billingEntries = cases.flatMap((item) => item.billingEntries);
  const agreements = cases.flatMap((item) => item.feeAgreements.map((agreement) => ({ ...agreement, case_id: item.id, cases: { title: item.title }, targetLabel: item.clients[0]?.client_name ?? '의뢰인' })));
  const payments = cases.flatMap((item) => item.payments);
  const collectionActivities = cases.flatMap((item) => item.recoveryActivities ?? []);
  const compensationEntries = mode === 'collection_admin'
    ? cases.map((item, index) => ({
        id: `${item.id}-comp-${index + 1}`,
        case_id: item.id,
        period_start: dateDaysAgo(30 - index * 7),
        period_end: dateDaysAgo(23 - index * 7),
        calculated_from_amount: item.principal_amount,
        calculated_amount: Math.round(item.principal_amount * 0.06),
        status: index === 0 ? 'confirmed' : 'draft',
        collection_compensation_plan_versions: { collection_compensation_plans: { title: `${item.title} 회수보수 규칙` } }
      }))
    : [];

  const notifications = [
    {
      id: `${organization.slug}-noti-1`,
      title: `${organization.name} 오늘 우선 확인`,
      body: `${cases[0]?.title ?? '주요 사건'} 관련 승인/회신/정산 일정이 몰려 있습니다.`,
      kind: 'generic',
      created_at: isoDaysAgo(0, 8, 20),
      read_at: null,
      requires_action: true,
      resolved_at: null,
      action_href: null,
      action_label: null,
      organization_id: organization.id,
      organization: { id: organization.id, name: organization.name, slug: organization.slug }
    },
    ...requests.slice(0, 5).map((request, index) => ({
      id: `${request.id}-notification`,
      title: `${request.title}`,
      body: `${request.cases.title}에서 ${request.request_kind} 상태가 ${request.status}입니다.`,
      kind: request.status === 'completed' ? 'approval_completed' : 'approval_requested',
      created_at: isoDaysAgo(index + 1, 10, 0),
      read_at: index === 0 ? null : isoDaysAgo(index, 18, 10),
      requires_action: request.status !== 'completed',
      resolved_at: request.status === 'completed' ? isoDaysAgo(index, 19, 0) : null,
      action_href: null,
      action_label: null,
      organization_id: organization.id,
      organization: { id: organization.id, name: organization.name, slug: organization.slug }
    }))
  ];

  const trend = Array.from({ length: 4 }, (_, index) => ({
    label: dateDaysAgo(28 - index * 7),
    recoveredAmount: mode === 'collection_admin' ? 18000000 + index * 3500000 : 0,
    expectedCompensationAmount: mode === 'collection_admin' ? 2100000 + index * 420000 : 0,
    confirmedCompensationAmount: mode === 'collection_admin' ? 1450000 + index * 250000 : 0
  }));

  return {
    organization,
    team,
    cases,
    clients,
    documents,
    requests,
    schedules,
    messages,
    billingEntries,
    agreements,
    payments,
    compensationEntries,
    collectionActivities,
    notifications,
    trend,
    accessRequests: clients.slice(0, 2).map((client, index) => ({
      id: `${client.id}-access-request`,
      requester_name: client.client_name,
      requester_email: client.client_email_snapshot,
      target_organization_key: organization.slug,
      request_note: index === 0 ? '포털에서 진행현황 확인과 문서 열람을 요청했습니다.' : '사건 연결 후 메시지 회신까지 사용하려는 요청입니다.',
      review_note: index === 0 ? '사건 담당자와 공유 후 승인' : null,
      status: index === 0 ? 'approved' : 'pending'
    }))
  };
}

export function getPlatformScenarioWorkspace(mode: PlatformScenarioMode) {
  return buildScenarioWorkspace(mode);
}

export function getPlatformScenarioCases(mode: PlatformScenarioMode) {
  return buildScenarioWorkspace(mode).cases;
}

export function getPlatformScenarioCaseDetail(mode: PlatformScenarioMode, caseId: string) {
  return buildScenarioWorkspace(mode).cases.find((item) => item.id === caseId) ?? null;
}

export function getPlatformScenarioClients(mode: PlatformScenarioMode) {
  const workspace = buildScenarioWorkspace(mode);
  return {
    clients: workspace.clients,
    accessRequests: workspace.accessRequests,
    cases: workspace.cases.map((item) => ({ id: item.id, title: item.title }))
  };
}

export function getPlatformScenarioDocuments(mode: PlatformScenarioMode) {
  return buildScenarioWorkspace(mode).documents;
}

export function getPlatformScenarioBilling(mode: PlatformScenarioMode) {
  const workspace = buildScenarioWorkspace(mode);
  const expectedThisMonth = workspace.billingEntries.reduce((sum, item) => sum + Number(item.amount ?? 0) + Number(item.tax_amount ?? 0), 0);
  return {
    entries: workspace.billingEntries,
    agreements: workspace.agreements,
    payments: workspace.payments,
    summary: {
      openEntryCount: workspace.billingEntries.length,
      overdueEntryCount: workspace.billingEntries.filter((item) => item.dueStatus === 'overdue').length,
      activeAgreementCount: workspace.agreements.filter((item) => item.is_active).length,
      expectedThisMonth
    }
  };
}

export function getPlatformScenarioCollections(mode: PlatformScenarioMode, period = 'month') {
  const workspace = buildScenarioWorkspace(mode);
  const currentRecovered = workspace.collectionActivities.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const currentExpected = workspace.compensationEntries.reduce((sum, item) => sum + Number(item.calculated_amount ?? 0), 0);
  const currentConfirmed = Math.round(currentExpected * 0.72);
  return {
    period,
    collectionCases: workspace.cases.filter((item) => item.case_type === 'debt_collection'),
    activities: workspace.collectionActivities,
    compensationEntries: workspace.compensationEntries,
    metrics: {
      currentRecovered,
      previousRecovered: Math.round(currentRecovered * 0.82),
      recoveredDelta: 18.4,
      currentExpected,
      previousExpected: Math.round(currentExpected * 0.76),
      expectedDelta: 24.8,
      currentConfirmed,
      previousConfirmed: Math.round(currentConfirmed * 0.84),
      confirmedDelta: 15.7
    },
    trend: workspace.trend
  };
}

export function getPlatformScenarioReports(mode: PlatformScenarioMode) {
  const workspace = buildScenarioWorkspace(mode);
  return {
    activeCases: workspace.cases.length,
    pendingDocuments: workspace.documents.filter((item) => item.approval_status === 'pending_review').length,
    pendingRequests: workspace.requests.filter((item) => item.status !== 'completed').length,
    collectionCaseCount: workspace.cases.filter((item) => item.case_type === 'debt_collection').length
  };
}

export function getPlatformScenarioNotificationCenter(mode: PlatformScenarioMode, limit = 20) {
  const workspace = buildScenarioWorkspace(mode);
  const currentOrganizationNotifications = workspace.notifications.slice(0, limit);
  return {
    currentOrganizationId: workspace.organization.id,
    currentOrganizationName: workspace.organization.name,
    activeNotifications: currentOrganizationNotifications,
    currentOrganizationNotifications,
    otherOrganizationGroups: [],
    trashedNotifications: [],
    capabilities: { supportsTrash: false, supportsActionFields: false },
    summary: {
      unreadCount: currentOrganizationNotifications.filter((item) => !item.read_at).length,
      actionRequiredCount: currentOrganizationNotifications.filter((item) => item.requires_action && !item.resolved_at).length,
      trashCount: 0,
      activeCount: currentOrganizationNotifications.length
    }
  };
}

export function getPlatformScenarioCalendar(mode: PlatformScenarioMode, month?: string | null) {
  const workspace = buildScenarioWorkspace(mode);
  const focusMonth = month ?? focusMonthFromNow();
  const fallbackMonth = monthShift(focusMonth, 0);
  return {
    focusMonth: fallbackMonth,
    schedules: workspace.schedules,
    requests: workspace.requests,
    billingEntries: workspace.billingEntries,
    caseOptions: workspace.cases.map((item) => ({ id: item.id, title: item.title }))
  };
}