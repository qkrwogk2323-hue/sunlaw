export type DemoStatCard = {
  label: string;
  value: string;
  note: string;
};

export type DemoAlert = {
  id: string;
  title: string;
  kind: 'urgent' | 'review' | 'meeting' | 'other';
  time: string;
  note: string;
};

export type DemoCase = {
  id: string;
  title: string;
  stage: string;
  owner: string;
  dueLabel: string;
  amountLabel: string;
  progress: number;
  tags: string[];
};

export type DemoContract = {
  id: string;
  title: string;
  counterparty: string;
  amountLabel: string;
  status: string;
  consentMethod: string;
};

export type DemoRoleView = {
  roleKey: 'admin' | 'staff' | 'client';
  label: string;
  summary: string;
  focus: string[];
};

export type LegalAdminDemoModel = {
  heroTitle: string;
  heroSummary: string;
  stats: DemoStatCard[];
  alerts: DemoAlert[];
  cases: DemoCase[];
  contracts: DemoContract[];
  roles: DemoRoleView[];
};

export const legalAdminDemoModel: LegalAdminDemoModel = {
  heroTitle: 'Vein Spiral v2 Legal-Admin 공개 데모',
  heroSummary: '법률조직 관리자가 사건, 알림, 계약, 비용 흐름을 어떻게 확인하는지 읽기 전용으로 살펴보는 샘플 화면입니다.',
  stats: [
    { label: '진행중 사건', value: '18건', note: '오늘 바로 확인이 필요한 사건 4건' },
    { label: '긴급 알림', value: '7건', note: '기한 임박 3건, 미납 확인 2건' },
    { label: '체결 대기 계약', value: '5건', note: '의뢰인 확인 필요 3건 포함' },
    { label: '이번 달 청구', value: '₩48,500,000', note: '분납 후속 확인 2건' }
  ],
  alerts: [
    { id: 'alert-1', title: '도산 사건 보정 서류 제출 기한이 오늘입니다.', kind: 'urgent', time: '오늘 09:10', note: '사건 화면과 일정확인에서 바로 확인 가능' },
    { id: 'alert-2', title: '의뢰인이 분납 회차 조정을 요청했습니다.', kind: 'review', time: '오늘 08:40', note: '비용관리와 계약관리에서 후속 처리 가능' },
    { id: 'alert-3', title: '오후 3시 채권자 협의 미팅이 잡혀 있습니다.', kind: 'meeting', time: '오늘 08:00', note: '일정확인과 조직소통 대화방으로 이어짐' },
    { id: 'alert-4', title: '허브에 새 문서가 공유되었습니다.', kind: 'other', time: '어제 18:20', note: '업로드 문서와 사건허브에서 확인 가능' }
  ],
  cases: [
    {
      id: 'case-1',
      title: '서해상사 회생 및 채권 회수 복합 사건',
      stage: '보정 대응',
      owner: '김나영 변호사',
      dueLabel: '오늘',
      amountLabel: '예상 회수금 1.2억원',
      progress: 72,
      tags: ['법률', '추심', '도산']
    },
    {
      id: 'case-2',
      title: '세광물류 미수금 회수 및 보험 협의',
      stage: '협상 진행',
      owner: '정민수 실장',
      dueLabel: '금주',
      amountLabel: '청구 예정 3,400만원',
      progress: 48,
      tags: ['추심', '보험']
    },
    {
      id: 'case-3',
      title: '한림테크 계약분쟁 및 가압류 검토',
      stage: '서면 준비',
      owner: '박다은 팀장',
      dueLabel: '금번달',
      amountLabel: '착수금 700만원',
      progress: 33,
      tags: ['법률', '가압류']
    }
  ],
  contracts: [
    {
      id: 'contract-1',
      title: '서해상사 사건 착수금 약정',
      counterparty: '서해상사',
      amountLabel: '₩7,700,000',
      status: '의뢰인 동의 대기',
      consentMethod: '플랫폼 체크 동의'
    },
    {
      id: 'contract-2',
      title: '세광물류 분할납부 약정',
      counterparty: '세광물류',
      amountLabel: '₩12,000,000',
      status: '2회차 후속 확인 필요',
      consentMethod: '카카오 확인 예정'
    }
  ],
  roles: [
    {
      roleKey: 'admin',
      label: '관리자',
      summary: '사건, 비용, 계약, 구성원, 알림을 전체 흐름으로 확인합니다.',
      focus: ['사건 전체 현황', '비용 후속 처리', '구성원 운영']
    },
    {
      roleKey: 'staff',
      label: '팀원',
      summary: '내가 맡은 사건과 일정, 요청, 대화 위주로 좁혀서 봅니다.',
      focus: ['담당 사건', '오늘 일정', '요청 답변']
    },
    {
      roleKey: 'client',
      label: '의뢰인',
      summary: '진행상황, 요청자료, 계약/청구 확인만 읽기 쉽게 보여줍니다.',
      focus: ['내 사건', '제출 요청', '청구 확인']
    }
  ]
};
