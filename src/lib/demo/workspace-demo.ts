import type { Route } from 'next';

export type DemoRole = 'law' | 'collection' | 'client';

type DemoMenuItem = {
  label: string;
  note: string;
};

type DemoAlert = {
  title: string;
  tone: 'blue' | 'amber' | 'emerald' | 'rose';
  detail: string;
};

type DemoHubMessage = {
  source: '사건허브' | '조직간 허브' | '의뢰인 포털';
  actor: string;
  body: string;
  at: string;
};

type DemoTask = {
  title: string;
  state: string;
  detail: string;
};

type DemoRoleView = {
  title: string;
  subtitle: string;
  persona: string;
  menus: DemoMenuItem[];
  alerts: DemoAlert[];
  tasks: DemoTask[];
  caseFocus: {
    title: string;
    stage: string;
    amount: string;
    client: string;
  };
};

export const DEMO_ROLES: Array<{ key: DemoRole; label: string; description: string }> = [
  { key: 'law', label: '법률사무소', description: '사건 진행, 의뢰인 관리, 계약·비용 확인' },
  { key: 'collection', label: '추심조직', description: '회수 진행, 분납 협의, 협업 요청 확인' },
  { key: 'client', label: '의뢰인', description: '내 사건, 문서 제출, 비용 확인, 요청 전달' }
];

const ROLE_VIEWS: Record<DemoRole, DemoRoleView> = {
  law: {
    title: '법률사무소 관리자 화면',
    subtitle: '사건, 의뢰인, 비용과 계약을 한 화면 흐름으로 보는 읽기 전용 데모입니다.',
    persona: '베인 법률사무소 · 대표 관리자',
    menus: [
      { label: '대시보드', note: '오늘 우선 처리할 사건과 알림' },
      { label: '사건 목록', note: '사건 상태, 일정, 허브 연결 확인' },
      { label: '의뢰인 관리', note: '의뢰인 초대와 연결 상태 확인' },
      { label: '비용 관리', note: '보수, 분납, 미납 금액 확인' },
      { label: '계약 관리', note: '체결 상태와 서명 흐름 확인' },
      { label: '사건허브', note: '협업 참여 조직과 대화 확인' }
    ],
    alerts: [
      { title: '보정 완료 기한 2일 남음', tone: 'amber', detail: '즉시 필요 알림으로 바로 연결됩니다.' },
      { title: '추심조직 회수 결과 도착', tone: 'blue', detail: '조직간 허브에서 확인할 수 있습니다.' },
      { title: '의뢰인 서명 완료', tone: 'emerald', detail: '계약 관리와 비용 관리에 함께 반영됩니다.' }
    ],
    tasks: [
      { title: '보정서 제출 전 최종 검토', state: '오늘 처리', detail: '법원 제출 전 문서 확인' },
      { title: '의뢰인 진행상황 미팅', state: '오후 3시', detail: '사건 허브 메모와 연결' },
      { title: '분납 부족분 후속 조치', state: '검토 필요', detail: '비용 관리에서 합산 청구 또는 회차 조정' }
    ],
    caseFocus: {
      title: '베인 손해배상 청구',
      stage: '보정서 제출 준비',
      amount: '보수 550,000원 / 미납 330,000원',
      client: '홍길동'
    }
  },
  collection: {
    title: '추심조직 운영 화면',
    subtitle: '회수 진행과 협업 요청, 분납 협의 중심으로 보는 읽기 전용 데모입니다.',
    persona: '베인스파이럴 추심팀 · 운영 관리자',
    menus: [
      { label: '대시보드', note: '오늘 회수 우선순위와 요청 확인' },
      { label: '사건허브', note: '법률사무소와 같은 사건 허브에서 협업' },
      { label: '비용 관리', note: '분납 약정과 미납 상태 확인' },
      { label: '일정관리', note: '회수 방문, 통화, 협의 일정 확인' },
      { label: '업로드 문서', note: '회수 증빙과 협의 문서 공유' }
    ],
    alerts: [
      { title: '분납 1차 납부 미확인', tone: 'amber', detail: '법률사무소와 허브에서 후속 조치 협의 중' },
      { title: '협업 제안 승인 완료', tone: 'emerald', detail: '사건허브 참여 상태가 활성으로 보입니다.' },
      { title: '의뢰인 추가 문의 도착', tone: 'blue', detail: '포털 요청이 조직간 허브 요약에 반영됩니다.' }
    ],
    tasks: [
      { title: '채무자 통화 결과 정리', state: '오늘 처리', detail: '사건허브 메모로 바로 반영' },
      { title: '1차 분납 입금 확인', state: '검토 필요', detail: '비용 메뉴와 같은 숫자로 보임' },
      { title: '법률사무소 회수 브리핑 회의', state: '내일 오전', detail: '미팅 일정으로 등록됨' }
    ],
    caseFocus: {
      title: '베인 손해배상 청구',
      stage: '분납 협의 진행',
      amount: '미납 330,000원 / 분납 1차 300,000원',
      client: '홍길동'
    }
  },
  client: {
    title: '의뢰인 포털 화면',
    subtitle: '내 사건 진행, 요청사항, 문서 제출, 비용 확인 중심의 읽기 전용 데모입니다.',
    persona: '의뢰인 홍길동 · 포털 보기',
    menus: [
      { label: '내 사건', note: '현재 단계와 담당 조직 확인' },
      { label: '비용 확인', note: '미납 금액과 분납 약정 확인' },
      { label: '문서 제출', note: '필요 문서를 업로드해 전달' },
      { label: '요청사항', note: '질문, 미팅 요청, 문서 요청 응답' },
      { label: '알림센터', note: '내게 필요한 일정과 확인사항만 노출' }
    ],
    alerts: [
      { title: '진행상황 미팅 일정 등록', tone: 'blue', detail: '일정관리와 같은 미팅 일정으로 표시' },
      { title: '분납 1차 납부 예정', tone: 'amber', detail: '비용 확인 화면과 같은 금액으로 보입니다.' },
      { title: '서명 요청 완료', tone: 'emerald', detail: '계약 체결 기록을 내려받을 수 있습니다.' }
    ],
    tasks: [
      { title: '보정 자료 전달', state: '오늘 처리', detail: '문서 제출 화면에서 업로드' },
      { title: '진행상황 미팅 참석', state: '내일 오후 3시', detail: '미팅 알림과 연동' },
      { title: '분납 1차 납부', state: '3일 남음', detail: '비용 확인에서 금액 확인 가능' }
    ],
    caseFocus: {
      title: '베인 손해배상 청구',
      stage: '보정 안내 수신',
      amount: '미납 330,000원 / 1차 분납 예정',
      client: '홍길동'
    }
  }
};

export const DEMO_SHARED_HUB = {
  caseTitle: '베인 손해배상 청구',
  caseNumber: '2024가합12345',
  status: '협업 진행 중',
  participants: ['법률사무소', '추심조직', '의뢰인'],
  messages: [
    {
      source: '사건허브',
      actor: '법률사무소',
      body: '보정서 제출 전 최종 검토가 필요합니다. 추심조직 회수 결과도 같이 확인해 주세요.',
      at: '오늘 오전 10:20'
    },
    {
      source: '조직간 허브',
      actor: '추심조직',
      body: '채무자와 1차 분납 30만원 협의 완료. 미납 잔액 후속 조정 필요합니다.',
      at: '오늘 오전 11:05'
    },
    {
      source: '의뢰인 포털',
      actor: '의뢰인',
      body: '목요일 오후 미팅 가능하며, 추가 보정 자료는 오늘 업로드하겠습니다.',
      at: '오늘 오전 11:18'
    }
  ] as DemoHubMessage[]
};

export function getDemoRoleView(role: DemoRole): DemoRoleView {
  return ROLE_VIEWS[role];
}

export function getDemoRoleHref(role: DemoRole): Route {
  return (`/demo?role=${role}`) as Route;
}
