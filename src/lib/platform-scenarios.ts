import type { ActorCategory, MembershipRole, OrganizationOption } from '@/lib/types';

export type PlatformScenarioMode = 'law_admin' | 'collection_admin' | 'other_admin';
export const PLATFORM_SCENARIO_MEMBER_STORAGE_KEY = 'vs_platform_scenario_member';

export type PlatformScenarioMember = {
  id: string;
  name: string;
  email: string;
  title: string;
  role: MembershipRole;
  actorCategory: ActorCategory;
  note: string;
};

export const PLATFORM_SCENARIO_ORGANIZATIONS: Record<PlatformScenarioMode, OrganizationOption> = {
  law_admin: {
    id: '11111111-1111-4111-8111-111111111124',
    slug: 'saeon-garam-beop',
    name: '새온가람법(가상조직)',
    kind: 'law_firm',
    enabled_modules: { billing: true, collections: false, client_portal: true, reports: true }
  },
  collection_admin: {
    id: '22222222-2222-4222-8222-222222222224',
    slug: 'nuri-chaeum-won',
    name: '누리채움원(가상조직)',
    kind: 'collection_company',
    enabled_modules: { billing: true, collections: true, client_portal: true, reports: true }
  },
  other_admin: {
    id: '33333333-3333-4333-8333-333333333324',
    slug: 'daon-haneul-lab',
    name: '다온하늘랩(가상조직)',
    kind: 'other',
    enabled_modules: { billing: true, collections: false, client_portal: true, reports: true }
  }
};

export const PLATFORM_SCENARIO_TEAM: Record<PlatformScenarioMode, PlatformScenarioMember[]> = {
  law_admin: [
    { id: 'virtual-law-1', name: '강민호', email: 'kmh@virtual.local', title: '대표변호사', role: 'org_owner', actorCategory: 'admin', note: '2019부터 주요 송무 총괄' },
    { id: 'virtual-law-2', name: '송지안', email: 'sja@virtual.local', title: '파트너변호사', role: 'org_manager', actorCategory: 'admin', note: '기업자문과 계약검토 담당' },
    { id: 'virtual-law-3', name: '윤태린', email: 'ytr@virtual.local', title: '송무변호사', role: 'org_staff', actorCategory: 'staff', note: '집행·보전 사건 실무 주력' },
    { id: 'virtual-law-4', name: '서하준', email: 'shj@virtual.local', title: '사무장', role: 'org_staff', actorCategory: 'staff', note: '기일·서류·수임 흐름 관리' },
    { id: 'virtual-law-5', name: '민서율', email: 'msy@virtual.local', title: '법무지원', role: 'org_staff', actorCategory: 'staff', note: '증빙·문서정리·대외 전달 담당' }
  ],
  collection_admin: [
    { id: 'virtual-collect-1', name: '박도윤', email: 'pdy@virtual.local', title: '대표', role: 'org_owner', actorCategory: 'admin', note: '회수 전략과 대외 협업 총괄' },
    { id: 'virtual-collect-2', name: '이채원', email: 'lcw@virtual.local', title: '운영팀장', role: 'org_manager', actorCategory: 'admin', note: '사건 분배와 성과 점검 담당' },
    { id: 'virtual-collect-3', name: '정하람', email: 'jhr@virtual.local', title: '추심상담', role: 'org_staff', actorCategory: 'staff', note: '채무자 통화와 약정 유도 담당' },
    { id: 'virtual-collect-4', name: '최유진', email: 'cyj@virtual.local', title: '현장회수', role: 'org_staff', actorCategory: 'staff', note: '방문 회수와 현장 대응 담당' },
    { id: 'virtual-collect-5', name: '한지후', email: 'hjh@virtual.local', title: '회수지원', role: 'org_staff', actorCategory: 'staff', note: '입금 확인과 보고 정리 담당' }
  ],
  other_admin: [
    { id: 'virtual-other-1', name: '오세린', email: 'osr@virtual.local', title: '대표', role: 'org_owner', actorCategory: 'admin', note: '외부 파트너 조정 총괄' },
    { id: 'virtual-other-2', name: '임도현', email: 'ldh@virtual.local', title: '운영책임', role: 'org_manager', actorCategory: 'admin', note: '접수·배정·현황판 관리' },
    { id: 'virtual-other-3', name: '배나윤', email: 'bny@virtual.local', title: '고객지원', role: 'org_staff', actorCategory: 'staff', note: '고객 응대와 일정 안내 담당' },
    { id: 'virtual-other-4', name: '조이안', email: 'jia@virtual.local', title: '문서지원', role: 'org_staff', actorCategory: 'staff', note: '문서 수집과 검토자료 정리' },
    { id: 'virtual-other-5', name: '문서윤', email: 'msyoon@virtual.local', title: '정산지원', role: 'org_staff', actorCategory: 'staff', note: '비용·정산 후속 처리 담당' }
  ]
};

export function isPlatformScenarioMode(mode: string | null | undefined): mode is PlatformScenarioMode {
  return mode === 'law_admin' || mode === 'collection_admin' || mode === 'other_admin';
}

export function getPlatformScenarioModeByOrganizationId(organizationId: string) {
  return (Object.entries(PLATFORM_SCENARIO_ORGANIZATIONS).find(([, organization]) => organization.id === organizationId)?.[0] ?? null) as PlatformScenarioMode | null;
}

export function getPlatformScenarioOrganizationById(organizationId: string) {
  const mode = getPlatformScenarioModeByOrganizationId(organizationId);
  return mode ? PLATFORM_SCENARIO_ORGANIZATIONS[mode] : null;
}

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

function dueDate(daysAhead: number) {
  return isoDaysAhead(daysAhead).slice(0, 10);
}

function teamMembers(mode: PlatformScenarioMode) {
  return PLATFORM_SCENARIO_TEAM[mode].map((member) => ({
    id: member.id,
    role: member.role,
    title: member.title,
    actor_category: member.actorCategory,
    profile: {
      id: member.id,
      full_name: member.name,
      email: member.email
    }
  }));
}

function getScenarioPartnerOrganizations(mode: PlatformScenarioMode) {
  if (mode === 'law_admin') {
    return [
      PLATFORM_SCENARIO_ORGANIZATIONS.collection_admin,
      PLATFORM_SCENARIO_ORGANIZATIONS.other_admin
    ];
  }

  if (mode === 'collection_admin') {
    return [
      PLATFORM_SCENARIO_ORGANIZATIONS.law_admin,
      PLATFORM_SCENARIO_ORGANIZATIONS.other_admin
    ];
  }

  return [
    PLATFORM_SCENARIO_ORGANIZATIONS.law_admin,
    PLATFORM_SCENARIO_ORGANIZATIONS.collection_admin
  ];
}

function buildOrganizationConversations(mode: PlatformScenarioMode, caseOptions: Array<{ id: string; title: string }>) {
  const organization = PLATFORM_SCENARIO_ORGANIZATIONS[mode];
  const team = PLATFORM_SCENARIO_TEAM[mode];
  const partnerOrganizations = getScenarioPartnerOrganizations(mode);

  return partnerOrganizations.map((partnerOrganization, roomIndex) => {
    const roomCase = caseOptions[roomIndex % caseOptions.length];
    const mySender = team[roomIndex % team.length];
    const secondSender = team[(roomIndex + 2) % team.length];
    const partnerLeadName = roomIndex === 0
      ? (mode === 'collection_admin' ? '송지안' : '이채원')
      : (mode === 'other_admin' ? '박도윤' : '임도현');

    const messages = [
      {
        id: `${organization.slug}-org-room-${roomIndex + 1}-1`,
        body: `${roomCase.title} 관련해서 이번 주 안에 공유해야 할 자료와 일정표를 먼저 맞추겠습니다.`,
        created_at: isoDaysAgo(roomIndex + 1, 9, 20),
        sender_name: mySender.name,
        sender_organization_name: organization.name,
        recipient_organization_name: partnerOrganization.name,
        case_id: roomCase.id,
        case_title: roomCase.title
      },
      {
        id: `${organization.slug}-org-room-${roomIndex + 1}-2`,
        body: `확인했습니다. ${partnerOrganization.name} 쪽에서도 담당자 배정했고, 오늘 저녁까지 1차 검토의견을 보내겠습니다.`,
        created_at: isoDaysAgo(roomIndex + 1, 10, 5),
        sender_name: partnerLeadName,
        sender_organization_name: partnerOrganization.name,
        recipient_organization_name: organization.name,
        case_id: roomCase.id,
        case_title: roomCase.title
      },
      {
        id: `${organization.slug}-org-room-${roomIndex + 1}-3`,
        body: `좋습니다. 의뢰인 쪽에는 내일 오전까지 공동 진행 일정으로 설명하고, 문서/회신 창구는 이 방 기준으로 정리하겠습니다.`,
        created_at: isoDaysAgo(roomIndex, 11, 40),
        sender_name: secondSender.name,
        sender_organization_name: organization.name,
        recipient_organization_name: partnerOrganization.name,
        case_id: roomCase.id,
        case_title: roomCase.title
      },
      {
        id: `${organization.slug}-org-room-${roomIndex + 1}-4`,
        body: `공동 회의는 ${roomIndex === 0 ? '목요일 오후 3시' : '금요일 오전 10시'}로 열어두겠습니다. 필요한 추가 자료가 있으면 바로 남기겠습니다.`,
        created_at: isoDaysAgo(0, 14 + roomIndex, 10),
        sender_name: partnerLeadName,
        sender_organization_name: partnerOrganization.name,
        recipient_organization_name: organization.name,
        case_id: roomCase.id,
        case_title: roomCase.title
      }
    ];

    return {
      id: `${organization.slug}-org-room-${roomIndex + 1}`,
      partner_organization_id: partnerOrganization.id,
      partner_organization_name: partnerOrganization.name,
      topic: roomIndex === 0 ? '사건 공동 진행 조율' : '자료 전달 및 일정 합의',
      last_message_at: messages[messages.length - 1]?.created_at ?? isoDaysAgo(0, 12, 0),
      case_id: roomCase.id,
      case_title: roomCase.title,
      unread_count: roomIndex === 0 ? 2 : 1,
      messages
    };
  });
}

export function getPlatformScenarioDashboardSnapshot(mode: PlatformScenarioMode) {
  const organization = PLATFORM_SCENARIO_ORGANIZATIONS[mode];
  const members = PLATFORM_SCENARIO_TEAM[mode];
  const prefix = organization.slug;

  const caseOptions = mode === 'law_admin'
    ? [
        { id: `${prefix}-case-1`, title: '동명테크 용역대금 청구', reference_no: 'LAW-24021', case_status: 'in_progress', updated_at: isoDaysAgo(1, 16, 20) },
        { id: `${prefix}-case-2`, title: '세림상사 가압류 본안 대응', reference_no: 'LAW-24017', case_status: 'pending_review', updated_at: isoDaysAgo(3, 11, 10) },
        { id: `${prefix}-case-3`, title: '도현물류 계약분쟁 자문', reference_no: 'LAW-24012', case_status: 'active', updated_at: isoDaysAgo(6, 14, 0) }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-case-1`, title: '청운상사 미수금 회수', reference_no: 'COL-24031', case_status: 'collection', updated_at: isoDaysAgo(0, 17, 40) },
          { id: `${prefix}-case-2`, title: '에이원건설 장기연체 관리', reference_no: 'COL-24028', case_status: 'negotiation', updated_at: isoDaysAgo(2, 15, 30) },
          { id: `${prefix}-case-3`, title: '대호유통 법적추심 전환 준비', reference_no: 'COL-24019', case_status: 'legal_review', updated_at: isoDaysAgo(5, 10, 45) }
        ]
      : [
          { id: `${prefix}-case-1`, title: '라온케어 제휴 운영 조정', reference_no: 'OPS-24014', case_status: 'active', updated_at: isoDaysAgo(1, 13, 20) },
          { id: `${prefix}-case-2`, title: '하늘교육 민원 문서 재정비', reference_no: 'OPS-24009', case_status: 'in_progress', updated_at: isoDaysAgo(4, 9, 35) },
          { id: `${prefix}-case-3`, title: '청명플랫폼 월말 정산 점검', reference_no: 'OPS-24004', case_status: 'waiting_client', updated_at: isoDaysAgo(7, 16, 0) }
        ];

  const recentRequests = mode === 'law_admin'
    ? [
        { id: `${prefix}-req-1`, title: '준비서면 반영 요청', status: 'in_review', request_kind: 'document_request', due_at: isoDaysAhead(2, 18, 0), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
        { id: `${prefix}-req-2`, title: '거래내역 증빙 추가 제출', status: 'waiting_client', request_kind: 'document_submission', due_at: isoDaysAhead(4, 15, 0), case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } },
        { id: `${prefix}-req-3`, title: '자문회의 일정 확정', status: 'open', request_kind: 'meeting_request', due_at: isoDaysAhead(1, 11, 0), case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-req-1`, title: '분할납부 약정서 확인', status: 'in_review', request_kind: 'signature_request', due_at: isoDaysAhead(1, 17, 0), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-req-2`, title: '법무 전달자료 정리', status: 'open', request_kind: 'document_request', due_at: isoDaysAhead(3, 13, 0), case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } },
          { id: `${prefix}-req-3`, title: '채무자 통화 결과 검토', status: 'waiting_client', request_kind: 'status_check', due_at: isoDaysAhead(2, 10, 0), case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } }
        ]
      : [
          { id: `${prefix}-req-1`, title: '고객 공지문 수정 반영', status: 'open', request_kind: 'document_request', due_at: isoDaysAhead(1, 16, 0), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-req-2`, title: '월말 정산표 검토 요청', status: 'in_review', request_kind: 'document_submission', due_at: isoDaysAhead(4, 14, 0), case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } },
          { id: `${prefix}-req-3`, title: '민원 답변 일정 재조정', status: 'waiting_client', request_kind: 'schedule_request', due_at: isoDaysAhead(2, 9, 30), case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } }
        ];

  const recentMessageItems = mode === 'law_admin'
    ? [
        { id: `${prefix}-msg-1`, body: '오늘 오전에 동명테크 쪽 거래명세서 원본 확인했습니다. 준비서면에 바로 반영 가능합니다.', is_internal: true, created_at: isoDaysAgo(0, 9, 12), sender_role: 'staff', sender_profile_id: members[2].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[2].name } },
        { id: `${prefix}-msg-2`, body: '좋습니다. 미지급 세금계산서 부분만 한 줄 더 보강해서 오후 3시 전에 올려주세요.', is_internal: true, created_at: isoDaysAgo(0, 9, 24), sender_role: 'admin', sender_profile_id: members[1].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[1].name } },
        { id: `${prefix}-msg-3`, body: '의뢰인에게는 오늘 5시 전까지 검토본 전달드리고, 가압류 병행 필요성도 같이 설명하겠습니다.', is_internal: false, created_at: isoDaysAgo(0, 10, 5), sender_role: 'admin', sender_profile_id: members[0].id, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title }, sender: { full_name: members[0].name } },
        { id: `${prefix}-msg-4`, body: '세림상사 담당자 회신 왔습니다. 본안 대응 쪽으로 기조는 유지하되 합의금 범위만 열어두자는 의견입니다.', is_internal: true, created_at: isoDaysAgo(1, 16, 40), sender_role: 'staff', sender_profile_id: members[3].id, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title }, sender: { full_name: members[3].name } },
        { id: `${prefix}-msg-5`, body: '도현물류 자문안 초안은 내일까지 정리됩니다. 손해배상 문구보다 해지권 정리 쪽이 더 시급합니다.', is_internal: true, created_at: isoDaysAgo(2, 14, 25), sender_role: 'staff', sender_profile_id: members[4].id, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title }, sender: { full_name: members[4].name } },
        { id: `${prefix}-msg-6`, body: '의뢰인 미팅 끝났습니다. 추가 증빙은 금요일까지 들어오고, 주말 전에 자문의견서 본문 확정하겠습니다.', is_internal: false, created_at: isoDaysAgo(4, 18, 15), sender_role: 'admin', sender_profile_id: members[1].id, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title }, sender: { full_name: members[1].name } }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-msg-1`, body: '청운상사 채무자 오전 통화 완료했습니다. 금요일 1차 입금 가능하다고 했고 약정서 서명만 남았습니다.', is_internal: true, created_at: isoDaysAgo(0, 10, 10), sender_role: 'staff', sender_profile_id: members[2].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[2].name } },
          { id: `${prefix}-msg-2`, body: '좋아요. 입금 예정일 전날 다시 리마인드하고, 미입금이면 바로 법무 전달 준비해 주세요.', is_internal: true, created_at: isoDaysAgo(0, 10, 18), sender_role: 'admin', sender_profile_id: members[1].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[1].name } },
          { id: `${prefix}-msg-3`, body: '에이원건설 쪽은 현장 방문 후 대표 배우자와도 연락선 확보했습니다. 주말 전까지 상환안 다시 받겠습니다.', is_internal: true, created_at: isoDaysAgo(1, 17, 5), sender_role: 'staff', sender_profile_id: members[3].id, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title }, sender: { full_name: members[3].name } },
          { id: `${prefix}-msg-4`, body: '대호유통 건은 법적추심 전환 가능성이 높습니다. 통화 녹취 요약과 방문기록 오늘 안에 정리해서 법무로 넘겨주세요.', is_internal: true, created_at: isoDaysAgo(2, 9, 50), sender_role: 'admin', sender_profile_id: members[0].id, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title }, sender: { full_name: members[0].name } },
        { id: `${prefix}-msg-5`, body: '채권자에게는 회수 전망을 보수적으로 안내했고, 약정 체결 전에는 외부 공유 없이 내부 검토만 진행하기로 했습니다.', is_internal: false, created_at: isoDaysAgo(3, 15, 45), sender_role: 'admin', sender_profile_id: members[1].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[1].name } },
          { id: `${prefix}-msg-6`, body: '청운상사 1차 입금 확인했습니다. 정산표 업데이트했고 의뢰인 보고서도 초안 작성해 두었습니다.', is_internal: true, created_at: isoDaysAgo(6, 11, 20), sender_role: 'staff', sender_profile_id: members[4].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[4].name } }
      ]
    : [
        { id: `${prefix}-msg-1`, body: '라온케어 제휴 운영표 최신본 반영했습니다. 고객 공지문은 표현만 다듬으면 바로 발송 가능합니다.', is_internal: true, created_at: isoDaysAgo(0, 8, 55), sender_role: 'staff', sender_profile_id: members[3].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[3].name } },
        { id: `${prefix}-msg-2`, body: '좋습니다. 오늘 오후 2시에 파트너사랑 최종 문구 확인하고, 발송 일정은 내일 오전으로 잡죠.', is_internal: true, created_at: isoDaysAgo(0, 9, 12), sender_role: 'admin', sender_profile_id: members[1].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[1].name } },
        { id: `${prefix}-msg-3`, body: '하늘교육 민원 문서는 학부모 설명 버전과 내부 보고 버전 분리해서 다시 올리겠습니다.', is_internal: true, created_at: isoDaysAgo(1, 14, 35), sender_role: 'staff', sender_profile_id: members[2].id, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title }, sender: { full_name: members[2].name } },
        { id: `${prefix}-msg-4`, body: '월말 정산 점검표에서 누락된 항목 3건 확인했습니다. 오늘 중 보완 후 회신 드리겠습니다.', is_internal: false, created_at: isoDaysAgo(2, 16, 20), sender_role: 'staff', sender_profile_id: members[4].id, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title }, sender: { full_name: members[4].name } },
        { id: `${prefix}-msg-5`, body: '라온케어 운영건은 파트너사도 응답 빨라서 일정이 잘 맞고 있습니다. 오늘 회의만 지나면 다음 단계 넘어갈 수 있습니다.', is_internal: true, created_at: isoDaysAgo(5, 10, 45), sender_role: 'admin', sender_profile_id: members[0].id, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title }, sender: { full_name: members[0].name } },
        { id: `${prefix}-msg-6`, body: '청명플랫폼 쪽 정산 관련 문의는 이미 회신했고, 추가 자료 요청도 전달 완료했습니다.', is_internal: true, created_at: isoDaysAgo(7, 17, 10), sender_role: 'staff', sender_profile_id: members[1].id, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title }, sender: { full_name: members[1].name } }
      ];

  const monthlyHighlights = mode === 'law_admin'
    ? [
        { id: `${prefix}-sch-1`, title: '동명테크 준비서면 제출', schedule_kind: 'deadline', scheduled_start: isoDaysAhead(1, 15, 0), location: '전자소송', is_important: true, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
        { id: `${prefix}-sch-2`, title: '세림상사 대응전략 회의', schedule_kind: 'meeting', scheduled_start: isoDaysAhead(3, 10, 30), location: '회의실 A', is_important: true, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } },
        { id: `${prefix}-sch-3`, title: '도현물류 자문본 발송', schedule_kind: 'reminder', scheduled_start: isoDaysAhead(5, 17, 0), location: '메일 발송', is_important: false, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-sch-1`, title: '청운상사 1차 입금 확인', schedule_kind: 'deadline', scheduled_start: isoDaysAhead(1, 14, 0), location: '정산 계좌 확인', is_important: true, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-sch-2`, title: '에이원건설 재통화', schedule_kind: 'reminder', scheduled_start: isoDaysAhead(2, 11, 0), location: '상담실', is_important: true, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } },
          { id: `${prefix}-sch-3`, title: '대호유통 법무 전달', schedule_kind: 'meeting', scheduled_start: isoDaysAhead(4, 16, 30), location: '공유 드라이브', is_important: false, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } }
        ]
      : [
          { id: `${prefix}-sch-1`, title: '라온케어 운영 공지 발송', schedule_kind: 'deadline', scheduled_start: isoDaysAhead(1, 10, 0), location: '메일링 시스템', is_important: true, case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-sch-2`, title: '하늘교육 민원 회신', schedule_kind: 'meeting', scheduled_start: isoDaysAhead(3, 15, 0), location: '대응 회의', is_important: true, case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } },
          { id: `${prefix}-sch-3`, title: '청명플랫폼 정산 검토', schedule_kind: 'reminder', scheduled_start: isoDaysAhead(6, 11, 0), location: '정산 시트', is_important: false, case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } }
        ];

  const upcomingBilling = mode === 'law_admin'
    ? [
        { id: `${prefix}-bill-1`, title: '동명테크 추가 착수금', amount: 1800000, status: 'issued', due_on: dueDate(5), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
        { id: `${prefix}-bill-2`, title: '세림상사 가압류 비용', amount: 420000, status: 'draft', due_on: dueDate(8), case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-bill-1`, title: '청운상사 회수 정산 예정', amount: 2450000, status: 'partial', due_on: dueDate(3), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-bill-2`, title: '에이원건설 현장 방문비', amount: 180000, status: 'issued', due_on: dueDate(6), case_id: caseOptions[1].id, cases: { title: caseOptions[1].title } }
        ]
      : [
          { id: `${prefix}-bill-1`, title: '라온케어 운영대행 정산', amount: 950000, status: 'issued', due_on: dueDate(4), case_id: caseOptions[0].id, cases: { title: caseOptions[0].title } },
          { id: `${prefix}-bill-2`, title: '청명플랫폼 월말 정산표', amount: 640000, status: 'draft', due_on: dueDate(7), case_id: caseOptions[2].id, cases: { title: caseOptions[2].title } }
        ];

  const unreadNotificationItems = mode === 'law_admin'
    ? [
        { id: `${prefix}-noti-1`, title: '세림상사 증빙 업로드 완료', body: '의뢰인이 거래명세서 원본을 업로드했습니다.', created_at: isoDaysAgo(0, 11, 10) },
        { id: `${prefix}-noti-2`, title: '동명테크 제출 기한 D-1', body: '내일 오후 3시까지 준비서면 제출이 필요합니다.', created_at: isoDaysAgo(0, 8, 0) }
      ]
    : mode === 'collection_admin'
      ? [
          { id: `${prefix}-noti-1`, title: '청운상사 입금 예정일 내일', body: '약정 입금일이 내일입니다. 미입금 시 후속조치 필요.', created_at: isoDaysAgo(0, 9, 0) },
          { id: `${prefix}-noti-2`, title: '대호유통 법무전달 대기', body: '전달자료가 아직 최종 확인 전입니다.', created_at: isoDaysAgo(1, 18, 10) }
        ]
      : [
          { id: `${prefix}-noti-1`, title: '라온케어 공지 발송 대기', body: '발송 문구 최종 확인이 남아 있습니다.', created_at: isoDaysAgo(0, 10, 20) },
          { id: `${prefix}-noti-2`, title: '청명플랫폼 정산표 수정요청', body: '2건의 수정 요청이 도착했습니다.', created_at: isoDaysAgo(1, 15, 0) }
        ];

  const clientContacts = [
    { id: `${prefix}-client-1`, case_id: caseOptions[0].id, profile_id: `${prefix}-client-profile-1`, client_name: mode === 'collection_admin' ? '청운상사 재무팀' : mode === 'law_admin' ? '동명테크 법무담당' : '라온케어 운영담당', relation_label: '의뢰인', cases: { title: caseOptions[0].title } },
    { id: `${prefix}-client-2`, case_id: caseOptions[1].id, profile_id: `${prefix}-client-profile-2`, client_name: mode === 'collection_admin' ? '에이원건설 관리이사' : mode === 'law_admin' ? '세림상사 대표' : '하늘교육 고객센터', relation_label: '의뢰인', cases: { title: caseOptions[1].title } }
  ];

  const partnerContacts = [
    { case_organization_id: `${prefix}-partner-1`, case_id: caseOptions[0].id, organization_id: `${prefix}-partner-org-1`, organization_name: mode === 'collection_admin' ? '새온가람법(가상조직)' : '누리채움원(가상조직)', role: 'partner', membership_id: `${prefix}-partner-member-1`, member_role: '담당자', profile: { id: `${prefix}-partner-profile-1`, full_name: mode === 'collection_admin' ? '송지안' : '이채원', email: `${prefix}-partner-1@virtual.local` } }
  ];

  const clientAccessQueue = [
    {
      id: `${prefix}-access-1`,
      requester_name: mode === 'collection_admin' ? '이민주' : '김하린',
      requester_email: `${prefix}-client-join-1@virtual.local`,
      status: 'pending',
      request_note: '조직 키를 확인해 가입했고 사건 연결 승인도 함께 부탁드립니다.',
      created_at: isoDaysAgo(0, 9, 40),
      target_organization_id: `${prefix}-org`,
      organization: { name: organization.name, slug: organization.slug }
    },
    {
      id: `${prefix}-access-2`,
      requester_name: mode === 'other_admin' ? '정소윤' : '박재민',
      requester_email: `${prefix}-client-join-2@virtual.local`,
      status: 'approved',
      request_note: '승인 이후 사건 연결 일정을 확인하고 싶습니다.',
      created_at: isoDaysAgo(1, 16, 15),
      target_organization_id: `${prefix}-org`,
      organization: { name: organization.name, slug: organization.slug }
    }
  ];

  const actionableNotifications = [
    {
      id: `${prefix}-action-1`,
      title: '의뢰인 연결 요청 검토 필요',
      body: '새 의뢰인 연결 요청이 도착했습니다. 승인 여부를 결정해 주세요.',
      created_at: isoDaysAgo(0, 10, 10),
      action_label: '의뢰인 관리 열기',
      action_href: '/clients',
      action_entity_type: 'client_access_request',
      requires_action: true,
      resolved_at: null,
      organization_id: `${prefix}-org`
    },
    {
      id: `${prefix}-action-2`,
      title: '지원 접속 승인 요청',
      body: '운영 중인 사용자 지원 접속 승인 요청이 대기 중입니다.',
      created_at: isoDaysAgo(1, 11, 20),
      action_label: '지원 요청 보기',
      action_href: '/admin/support',
      action_entity_type: 'support_access_request',
      requires_action: true,
      resolved_at: null,
      organization_id: `${prefix}-org`
    }
  ];
  const organizationConversations = buildOrganizationConversations(mode, caseOptions.map((item) => ({ id: item.id, title: item.title })));

  return {
    activeCases: caseOptions.length,
    pendingDocuments: 2,
    pendingRequests: recentRequests.length,
    recentMessages: recentMessageItems.length,
    urgentSchedules: monthlyHighlights,
    recentCases: caseOptions,
    caseOptions,
    recentRequests,
    recentMessageItems,
    monthlyHighlights,
    teamMembers: teamMembers(mode),
    pendingBillingCount: upcomingBilling.length,
    upcomingBilling,
    unreadNotifications: unreadNotificationItems.length,
    unreadNotificationItems,
    clientAccessQueue,
    actionableNotifications,
    clientContacts,
    partnerContacts,
    organizationConversations
  };
}

export function getPlatformScenarioInboxSnapshot(mode: PlatformScenarioMode) {
  const dashboard = getPlatformScenarioDashboardSnapshot(mode);

  const approvals = dashboard.caseOptions.slice(0, 2).map((item, index) => ({
    id: `${item.id}-approval-${index + 1}`,
    title: mode === 'law_admin'
      ? `${item.title} 검토본 승인 대기`
      : mode === 'collection_admin'
        ? `${item.title} 전달자료 승인 대기`
        : `${item.title} 운영문서 승인 대기`,
    approval_status: 'pending_review',
    updated_at: isoDaysAgo(index + 1, 13, 20),
    case_id: item.id,
    cases: { title: item.title }
  }));

  return {
    requests: dashboard.recentRequests.map((item) => ({ ...item, created_at: isoDaysAgo(1, 9, 0) })),
    messages: dashboard.recentMessageItems.map((item) => ({
      id: item.id,
      body: item.body,
      is_internal: item.is_internal,
      created_at: item.created_at,
      case_id: item.case_id,
      cases: item.cases,
      sender_profile_id: item.sender_profile_id
    })),
    approvals,
    notifications: dashboard.unreadNotificationItems.map((item, index) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      kind: 'generic',
      created_at: item.created_at,
      case_id: dashboard.caseOptions[index % dashboard.caseOptions.length]?.id ?? null
    }))
  };
}