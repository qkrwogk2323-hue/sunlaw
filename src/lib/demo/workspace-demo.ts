export type DemoRole = 'law' | 'collection' | 'client' | 'hub';

export type DemoMenuKey =
  | 'dashboard'
  | 'cases'
  | 'clients'
  | 'billing'
  | 'contracts'
  | 'documents'
  | 'calendar'
  | 'notifications'
  | 'case_hub'
  | 'org_hub'
  | 'portal';

export type DemoMenuItem = {
  key: DemoMenuKey;
  label: string;
  note: string;
};

export type DemoCardItem = {
  label: string;
  value: string;
  tone: 'slate' | 'blue' | 'amber' | 'emerald';
};

export type DemoListItem = {
  title: string;
  detail: string;
  meta?: string;
};

export type DemoScreen = {
  title: string;
  description: string;
  cards: DemoCardItem[];
  primary: DemoListItem[];
  secondary: DemoListItem[];
};

export type DemoRoleView = {
  title: string;
  subtitle: string;
  persona: string;
  menus: DemoMenuItem[];
  defaultMenu: DemoMenuKey;
  screens: Partial<Record<DemoMenuKey, DemoScreen>>;
};

export const DEMO_ROLES: Array<{ key: DemoRole; label: string; description: string }> = [
  { key: 'law', label: '법률사무소', description: '사건, 의뢰인, 비용과 계약을 운영하는 관리자 화면' },
  { key: 'collection', label: '추심조직', description: '회수 진행과 분납 협의를 이어가는 운영 화면' },
  { key: 'client', label: '의뢰인', description: '내 사건, 요청, 문서 제출과 비용 확인 화면' },
  { key: 'hub', label: '허브 연동', description: '사건허브, 조직간 허브, 의뢰인 포털 흐름만 집중 보기' }
];

export const SHARED_CASE = {
  title: '베인 손해배상 청구',
  number: '2024가합12345',
  client: '홍길동',
  summary: '법률사무소, 추심조직, 의뢰인이 같은 사건을 서로 다른 화면에서 보는 데모입니다.'
};

export const HUB_FLOW = [
  {
    lane: '사건허브',
    actor: '법률사무소',
    body: '보정서 제출 전 최종 검토가 필요합니다. 회수 결과까지 같이 정리해 주세요.',
    at: '오늘 오전 10:20'
  },
  {
    lane: '조직간 허브',
    actor: '추심조직',
    body: '채무자와 1차 분납 30만원 협의 완료. 미납 잔액 후속 조정이 필요합니다.',
    at: '오늘 오전 11:05'
  },
  {
    lane: '의뢰인 포털',
    actor: '의뢰인',
    body: '목요일 오후 미팅 가능하며, 추가 보정 자료는 오늘 업로드하겠습니다.',
    at: '오늘 오전 11:18'
  }
] as const;

const lawMenus: DemoMenuItem[] = [
  { key: 'dashboard', label: '대시보드', note: '오늘 처리할 사건과 알림' },
  { key: 'cases', label: '사건 목록', note: '사건 상태와 단계 확인' },
  { key: 'clients', label: '의뢰인 관리', note: '의뢰인 연결과 상태 확인' },
  { key: 'billing', label: '비용 관리', note: '보수, 미납, 분납 확인' },
  { key: 'contracts', label: '계약 관리', note: '서명과 체결 이력 확인' },
  { key: 'case_hub', label: '사건허브', note: '같은 사건 협업 메시지 확인' }
];

const collectionMenus: DemoMenuItem[] = [
  { key: 'dashboard', label: '대시보드', note: '회수 우선순위 확인' },
  { key: 'cases', label: '사건 목록', note: '회수 단계와 대상 확인' },
  { key: 'billing', label: '비용 관리', note: '분납과 미납 후속 확인' },
  { key: 'calendar', label: '일정관리', note: '통화, 방문, 회의 일정 확인' },
  { key: 'org_hub', label: '조직간 허브', note: '법률사무소와 협업 메시지 확인' },
  { key: 'documents', label: '업로드 문서', note: '회수 증빙 공유' }
];

const clientMenus: DemoMenuItem[] = [
  { key: 'portal', label: '내 사건', note: '진행 상태와 담당 조직 보기' },
  { key: 'billing', label: '비용 확인', note: '미납과 분납 일정 확인' },
  { key: 'documents', label: '문서 제출', note: '자료 업로드와 회신' },
  { key: 'calendar', label: '일정관리', note: '미팅과 기한 확인' },
  { key: 'notifications', label: '알림센터', note: '내게 필요한 알림만 보기' },
  { key: 'case_hub', label: '사건허브', note: '공유된 진행 메모 확인' }
];

const hubMenus: DemoMenuItem[] = [
  { key: 'case_hub', label: '사건허브', note: '같은 사건의 협업 흐름' },
  { key: 'org_hub', label: '조직간 허브', note: '법률사무소와 추심조직 대화' },
  { key: 'portal', label: '의뢰인 포털', note: '의뢰인에게 보이는 화면' },
  { key: 'notifications', label: '알림센터', note: '역할마다 다른 알림 보기' }
];

function buildCommonHubScreen(title: string): DemoScreen {
  return {
    title,
    description: SHARED_CASE.summary,
    cards: [
      { label: '사건', value: SHARED_CASE.title, tone: 'slate' },
      { label: '사건번호', value: SHARED_CASE.number, tone: 'blue' },
      { label: '의뢰인', value: SHARED_CASE.client, tone: 'emerald' }
    ],
    primary: HUB_FLOW.map((item) => ({
      title: `${item.lane} · ${item.actor}`,
      detail: item.body,
      meta: item.at
    })),
    secondary: [
      { title: '법률사무소 화면', detail: '보정, 계약, 비용 후속을 중심으로 봅니다.' },
      { title: '추심조직 화면', detail: '회수 결과, 분납 협의, 조직간 협업을 중심으로 봅니다.' },
      { title: '의뢰인 화면', detail: '내 사건 진행, 문서 제출, 비용 확인만 보입니다.' }
    ]
  };
}

export const DEMO_ROLE_VIEWS: Record<DemoRole, DemoRoleView> = {
  law: {
    title: '법률사무소 관리자 화면',
    subtitle: '실제 저장 없이 관리자 화면 느낌으로 눌러보는 읽기 전용 데모입니다.',
    persona: '베인 법률사무소 · 대표 관리자',
    menus: lawMenus,
    defaultMenu: 'dashboard',
    screens: {
      dashboard: {
        title: '법률사무소 대시보드',
        description: '사건, 의뢰인, 비용, 계약 흐름을 한눈에 보는 메인 화면 데모입니다.',
        cards: [
          { label: '진행중 사건', value: '14건', tone: 'blue' },
          { label: '검토 필요', value: '5건', tone: 'amber' },
          { label: '미납 금액', value: '330,000원', tone: 'emerald' }
        ],
        primary: [
          { title: '보정서 제출 전 최종 검토', detail: '오늘 안에 확인해야 하는 문서입니다.', meta: '오늘 처리' },
          { title: '의뢰인 진행상황 미팅', detail: '오후 3시 미팅 일정이 등록되어 있습니다.', meta: '미팅 일정' },
          { title: '분납 부족분 후속 조치', detail: '비용 관리에서 합산 청구 또는 회차 조정이 가능합니다.', meta: '검토 필요' }
        ],
        secondary: [
          { title: '사건허브 새 메시지', detail: '추심조직이 회수 결과를 남겼습니다.' },
          { title: '계약 서명 완료', detail: '의뢰인이 서명을 완료해 체결 이력이 갱신됐습니다.' }
        ]
      },
      cases: {
        title: '사건 목록',
        description: '사건 상태, 일정, 허브 연결을 한눈에 보는 데모입니다.',
        cards: [
          { label: '활성 사건', value: '14건', tone: 'blue' },
          { label: '오늘 일정', value: '3건', tone: 'amber' },
          { label: '허브 연결 사건', value: '4건', tone: 'emerald' }
        ],
        primary: [
          { title: SHARED_CASE.title, detail: '보정서 제출 준비 · 추심조직 협업 활성', meta: SHARED_CASE.number },
          { title: '대여금 청구 사건', detail: '분납 약정 검토 중', meta: '2025가합1782' }
        ],
        secondary: [
          { title: '사건 상세 보기', detail: '이 데모에서는 실제 상세 이동 대신 요약 화면만 보여줍니다.' }
        ]
      },
      clients: {
        title: '의뢰인 관리',
        description: '의뢰인 연결, 포털 상태, 요청사항 흐름을 보는 데모입니다.',
        cards: [
          { label: '연결 의뢰인', value: '21명', tone: 'blue' },
          { label: '확인 요청', value: '2건', tone: 'amber' },
          { label: '포털 활성', value: '19명', tone: 'emerald' }
        ],
        primary: [
          { title: '홍길동', detail: '포털 활성 · 미납 330,000원 · 미팅 요청 있음', meta: SHARED_CASE.title },
          { title: '김영희', detail: '문서 제출 대기 · 비용 미납 없음', meta: '자문 사건' }
        ],
        secondary: [
          { title: '의뢰인 요청과 사건허브 연동', detail: '포털 요청이 내부 검토 항목으로 이어집니다.' }
        ]
      },
      billing: {
        title: '비용 관리',
        description: '보수, 분납, 미납 금액과 계약 체결 흐름을 함께 보는 데모입니다.',
        cards: [
          { label: '보수', value: '550,000원', tone: 'blue' },
          { label: '분납 약정', value: '300,000원', tone: 'amber' },
          { label: '미납 금액', value: '330,000원', tone: 'emerald' }
        ],
        primary: [
          { title: '착수금', detail: '세금 포함 550,000원 · 일부 납부 확인', meta: SHARED_CASE.title },
          { title: '분납 1차', detail: '30만원 예정 · 잔액 후속 조정 필요', meta: '납부기한 3일 남음' }
        ],
        secondary: [
          { title: '계약 체결과 연동', detail: '의뢰인 서명 완료 후 비용 상태가 같이 보입니다.' }
        ]
      },
      contracts: {
        title: '계약 관리',
        description: '서명 요청, 체결 이력, 비용 연결 흐름을 보는 데모입니다.',
        cards: [
          { label: '활성 계약', value: '6건', tone: 'blue' },
          { label: '서명 완료', value: '4건', tone: 'emerald' },
          { label: '확인 필요', value: '1건', tone: 'amber' }
        ],
        primary: [
          { title: '베인 손해배상 청구 위임계약', detail: '서명 완료 · 비용 550,000원과 연동', meta: SHARED_CASE.client },
          { title: '분납 약정서', detail: '1차 300,000원 · 후속 조정 검토', meta: '체결 완료' }
        ],
        secondary: [
          { title: '서명 후 비용 연결', detail: '계약 체결 후 비용 관리와 포털에 같은 내용이 보입니다.' }
        ]
      },
      case_hub: buildCommonHubScreen('사건허브')
    }
  },
  collection: {
    title: '추심조직 관리자 화면',
    subtitle: '회수 진행, 분납 협의, 조직간 협업을 눌러보는 읽기 전용 데모입니다.',
    persona: '베인스파이럴 추심팀 · 운영 관리자',
    menus: collectionMenus,
    defaultMenu: 'dashboard',
    screens: {
      dashboard: {
        title: '추심조직 대시보드',
        description: '회수 우선순위와 분납 후속을 중심으로 보는 데모입니다.',
        cards: [
          { label: '회수 대상', value: '8건', tone: 'blue' },
          { label: '분납 검토', value: '3건', tone: 'amber' },
          { label: '오늘 통화', value: '5건', tone: 'emerald' }
        ],
        primary: [
          { title: '채무자 통화 결과 정리', detail: '오늘 안에 사건허브에 회수 결과를 남겨야 합니다.', meta: '오늘 처리' },
          { title: '1차 분납 입금 확인', detail: '법률사무소와 같은 미납 숫자를 보고 있습니다.', meta: '검토 필요' }
        ],
        secondary: [
          { title: '회수 브리핑 회의', detail: '내일 오전 미팅 일정으로 등록되어 있습니다.' }
        ]
      },
      cases: {
        title: '추심 대상 사건',
        description: '회수 단계, 약정 상태, 조직간 협업 연결을 보는 데모입니다.',
        cards: [
          { label: '활성 추심', value: '8건', tone: 'blue' },
          { label: '협업 활성', value: '4건', tone: 'emerald' },
          { label: '방문 일정', value: '2건', tone: 'amber' }
        ],
        primary: [
          { title: SHARED_CASE.title, detail: '1차 분납 협의 완료 · 후속 검토 필요', meta: SHARED_CASE.number }
        ],
        secondary: [
          { title: '사건허브 연결', detail: '법률사무소와 같은 사건을 서로 다른 관점으로 봅니다.' }
        ]
      },
      billing: {
        title: '분납 및 미납 관리',
        description: '분납 약정과 미납 후속 조정 중심의 비용 화면 데모입니다.',
        cards: [
          { label: '분납 약정', value: '3건', tone: 'amber' },
          { label: '미납', value: '2건', tone: 'emerald' },
          { label: '협의 완료', value: '4건', tone: 'blue' }
        ],
        primary: [
          { title: '1차 분납 300,000원', detail: '채무자 협의 완료 · 법률사무소와 같은 숫자 공유', meta: '납부기한 3일 남음' }
        ],
        secondary: [
          { title: '후속 조정', detail: '합산 청구 또는 회차 조정 권고 흐름을 같이 볼 수 있습니다.' }
        ]
      },
      calendar: {
        title: '추심 일정관리',
        description: '통화, 방문, 회의와 같은 추심 일정 중심 화면 데모입니다.',
        cards: [
          { label: '오늘 일정', value: '5건', tone: 'blue' },
          { label: '미팅 일정', value: '1건', tone: 'amber' },
          { label: '방문 일정', value: '2건', tone: 'emerald' }
        ],
        primary: [
          { title: '채무자 통화', detail: '오후 1시 · 회수 협의 결과 정리 필요', meta: '업무일정' },
          { title: '법률사무소 브리핑 회의', detail: '내일 오전 10시', meta: '미팅일정' }
        ],
        secondary: [
          { title: '업무일지 연결', detail: '일정 완료 후 작업 기록으로 이어지는 흐름입니다.' }
        ]
      },
      org_hub: buildCommonHubScreen('조직간 허브'),
      documents: {
        title: '회수 문서함',
        description: '회수 증빙과 협의 문서를 공유하는 화면 데모입니다.',
        cards: [
          { label: '새 문서', value: '3건', tone: 'blue' },
          { label: '검토 필요', value: '1건', tone: 'amber' },
          { label: '공유 완료', value: '8건', tone: 'emerald' }
        ],
        primary: [
          { title: '분납 협의 녹취 정리본', detail: '법률사무소와 공유할 준비가 끝났습니다.', meta: SHARED_CASE.title }
        ],
        secondary: [
          { title: '조직간 허브 연결', detail: '문서를 올리면 허브 대화와 함께 보입니다.' }
        ]
      }
    }
  },
  client: {
    title: '의뢰인 화면',
    subtitle: '내 사건, 비용, 문서 제출과 요청 흐름을 체험하는 읽기 전용 데모입니다.',
    persona: '의뢰인 홍길동 · 포털 보기',
    menus: clientMenus,
    defaultMenu: 'portal',
    screens: {
      portal: {
        title: '내 사건',
        description: '의뢰인이 사건 진행 상태와 담당 조직을 확인하는 화면 데모입니다.',
        cards: [
          { label: '진행 단계', value: '보정 안내 수신', tone: 'blue' },
          { label: '다음 미팅', value: '목 오후 3시', tone: 'amber' },
          { label: '담당 조직', value: '법률사무소 / 추심조직', tone: 'emerald' }
        ],
        primary: [
          { title: SHARED_CASE.title, detail: '보정 자료 제출 요청이 도착했습니다.', meta: SHARED_CASE.number }
        ],
        secondary: [
          { title: '허브 공유 메모', detail: '의뢰인에게 공개되는 진행 메모만 따로 보입니다.' }
        ]
      },
      billing: {
        title: '비용 확인',
        description: '미납, 분납, 납부 예정 금액을 보는 데모입니다.',
        cards: [
          { label: '미납 금액', value: '330,000원', tone: 'amber' },
          { label: '다음 납부', value: '300,000원', tone: 'blue' },
          { label: '서명 완료', value: '위임계약 체결', tone: 'emerald' }
        ],
        primary: [
          { title: '1차 분납 예정', detail: '3일 뒤 300,000원 납부 예정', meta: '분할납부약정금액' }
        ],
        secondary: [
          { title: '비용 흐름 연동', detail: '법률사무소와 추심조직이 보는 비용 흐름과 같은 사건을 공유합니다.' }
        ]
      },
      documents: {
        title: '문서 제출',
        description: '요청 받은 문서를 업로드하고 회신하는 데모입니다.',
        cards: [
          { label: '제출 요청', value: '2건', tone: 'amber' },
          { label: '업로드 완료', value: '1건', tone: 'emerald' },
          { label: '추가 설명', value: '1건', tone: 'blue' }
        ],
        primary: [
          { title: '보정 자료 업로드', detail: '오늘 안에 자료를 올려 달라는 요청이 있습니다.', meta: '오늘 처리' }
        ],
        secondary: [
          { title: '업로드 후 반영', detail: '담당 조직의 문서함과 허브 메모에 같은 흐름으로 보입니다.' }
        ]
      },
      calendar: {
        title: '일정관리',
        description: '미팅, 기한, 요청 일정이 의뢰인에게 어떻게 보이는지 보여주는 데모입니다.',
        cards: [
          { label: '미팅 일정', value: '1건', tone: 'blue' },
          { label: '기한 일정', value: '1건', tone: 'amber' },
          { label: '기타 일정', value: '1건', tone: 'emerald' }
        ],
        primary: [
          { title: '진행상황 미팅', detail: '목요일 오후 3시 · 법률사무소와 미팅', meta: '미팅일정' }
        ],
        secondary: [
          { title: '알림센터 연동', detail: '미팅과 기한 알림이 같은 내용으로 보입니다.' }
        ]
      },
      notifications: {
        title: '알림센터',
        description: '의뢰인에게 필요한 알림만 정리해서 보는 데모입니다.',
        cards: [
          { label: '새 알림', value: '3건', tone: 'blue' },
          { label: '미팅 알림', value: '1건', tone: 'amber' },
          { label: '문서 요청', value: '1건', tone: 'emerald' }
        ],
        primary: [
          { title: '진행상황 미팅 안내', detail: '목요일 오후 3시 미팅이 잡혔습니다.', meta: '미팅 알림' },
          { title: '보정 자료 제출 요청', detail: '오늘 안에 자료를 업로드해 주세요.', meta: '즉시 확인' }
        ],
        secondary: [
          { title: '비용 예정 안내', detail: '분납 1차 납부 예정 알림이 함께 표시됩니다.' }
        ]
      },
      case_hub: buildCommonHubScreen('공유된 사건 메모')
    }
  },
  hub: {
    title: '허브 연동 집중 보기',
    subtitle: '같은 사건을 기준으로 사건허브, 조직간 허브, 의뢰인 포털이 어떻게 이어지는지만 모아 본 데모입니다.',
    persona: '허브 흐름 집중 보기',
    menus: hubMenus,
    defaultMenu: 'case_hub',
    screens: {
      case_hub: buildCommonHubScreen('사건허브'),
      org_hub: buildCommonHubScreen('조직간 허브'),
      portal: {
        title: '의뢰인 포털 연결',
        description: '허브에서 나온 진행 메모 중 공개 가능한 내용만 의뢰인 화면에 이어집니다.',
        cards: [
          { label: '공개 메모', value: '2건', tone: 'blue' },
          { label: '미팅 안내', value: '1건', tone: 'amber' },
          { label: '문서 요청', value: '1건', tone: 'emerald' }
        ],
        primary: [
          { title: '진행상황 공유', detail: '의뢰인에게 공개 가능한 현재 단계와 미팅 일정만 보입니다.', meta: SHARED_CASE.title }
        ],
        secondary: [
          { title: '비공개 메모 제외', detail: '조직간 세부 메모는 의뢰인 포털에 나오지 않습니다.' }
        ]
      },
      notifications: {
        title: '역할별 알림 연결',
        description: '같은 사건이지만 역할마다 다른 알림 카드로 정리되는 흐름을 보여줍니다.',
        cards: [
          { label: '법률사무소', value: '검토 필요 2건', tone: 'blue' },
          { label: '추심조직', value: '후속 확인 2건', tone: 'amber' },
          { label: '의뢰인', value: '미팅/문서 3건', tone: 'emerald' }
        ],
        primary: [
          { title: '보정 완료 기한', detail: '법률사무소는 즉시 확인, 의뢰인은 안내 중심으로 봅니다.' },
          { title: '분납 협의 결과', detail: '추심조직은 후속 조정, 법률사무소는 비용 검토로 이어집니다.' }
        ],
        secondary: [
          { title: '하나의 사건, 다른 알림', detail: '같은 사건이라도 역할에 따라 알림 이름과 우선순위가 달라집니다.' }
        ]
      }
    }
  }
};
