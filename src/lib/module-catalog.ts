export type ModuleCatalogEntry = {
  key: string;
  name: string;
  summary: string;
  audience: string;
  defaultStatus: string;
  route?: string;
  submodules: string[];
  highlights: string[];
};

export type ModuleCatalogGroup = {
  key: string;
  title: string;
  description: string;
  tone: 'blue' | 'green' | 'amber';
  entries: ModuleCatalogEntry[];
};

export const moduleCatalog: ModuleCatalogGroup[] = [
  {
    key: 'common',
    title: '공통 모듈',
    description: '플랫폼 내 모든 업종이 함께 사용하는 기본 운영 모듈입니다.',
    tone: 'blue',
    entries: [
      {
        key: 'billing',
        name: '비용관리 모듈',
        summary: '청구, 입금, 약정, 일정 연계를 한 화면에서 관리합니다.',
        audience: '법률/법무, 채권추심업, 일반 협업 조직 공통',
        defaultStatus: '기본 제공',
        route: '/billing',
        submodules: ['청구 항목', '입금 확인', '약정 관리', '일정/알림 연동'],
        highlights: ['사건/의뢰인 연결 시 자동 비용 후속 일정 생성', '대시보드와 캘린더에 비용 항목 동시 반영']
      },
      {
        key: 'reports',
        name: '성과 리포트',
        summary: '조직별 실적과 누적 현황을 분석합니다.',
        audience: '조직 관리자 공통',
        defaultStatus: '기본 제공',
        route: '/reports',
        submodules: ['조직 리포트', '기간 비교', '성과 요약'],
        highlights: ['운영 성과를 월/분기 단위로 비교', '케이스 흐름과 비용 흐름을 함께 추적']
      },
      {
        key: 'client_portal',
        name: '의뢰인 포털',
        summary: '외부 의뢰인이 사건과 문서, 청구 상태를 확인하는 전용 채널입니다.',
        audience: '외부 의뢰인 및 고객',
        defaultStatus: '기본 제공',
        route: '/portal',
        submodules: ['사건 진행 현황', '요청/회신', '문서 확인', '청구 내역'],
        highlights: ['의뢰인 시야와 조직 시야를 분리', '알림 센터와 연결된 요청/회신 기록 제공']
      }
    ]
  },
  {
    key: 'legal',
    title: '법률/법무 모듈',
    description: '법무팀과 로펌 운영 흐름에 맞춘 특화 모듈입니다.',
    tone: 'amber',
    entries: [
      {
        key: 'legal_core',
        name: '법률/법무 워크스페이스',
        summary: '사건 접수부터 진행, 보고, 종료까지 법률 업무 흐름을 관리합니다.',
        audience: '로펌, 사내 법무팀',
        defaultStatus: '업종 선택 시 기본 노출',
        route: '/cases',
        submodules: ['민사', '형사', '가사', '행정', '계약/자문'],
        highlights: ['사건 유형별 템플릿 사용', '문서 승인/검토, 일정 확인, 알림 센터와 직접 연결']
      },
      {
        key: 'rehabilitation_bankruptcy',
        name: '회생/파산 하위 모듈',
        summary: '회생 및 파산 사건에 필요한 일정, 제출물, 이해관계자 관리를 지원합니다.',
        audience: '도산 사건 담당 조직',
        defaultStatus: '추가 모듈 후보',
        submodules: ['회생 절차 타임라인', '채권자 목록', '법원 제출물', '배당/변제 체크'],
        highlights: ['기일 캘린더와 비용관리 모듈을 함께 사용', '사건별 체크리스트를 AI 일정 도우미와 연동 가능']
      }
    ]
  },
  {
    key: 'collections',
    title: '채권추심업 모듈',
    description: '추심 실무와 회수 관리 흐름에 맞춘 특화 모듈입니다.',
    tone: 'green',
    entries: [
      {
        key: 'collections_core',
        name: '채권추심 운영',
        summary: '회수 사건, 접촉 내역, 회수 성과를 하나의 운영 보드에서 관리합니다.',
        audience: '신용정보사, 신용정보회사 관리자',
        defaultStatus: '업종 선택 시 기본 노출',
        route: '/collections',
        submodules: ['회수 사건 보드', '접촉 기록', '분할상환 추적', '회수 성과'],
        highlights: ['사건별 회수 진행률 추적', '비용관리 및 리포트 모듈과 동시 사용 가능']
      },
      {
        key: 'collections_legal_bridge',
        name: '추심-법무 협업 하위 모듈',
        summary: '추심 사건을 법적 조치 단계로 넘기거나 공동 대응할 때 사용하는 협업 모듈입니다.',
        audience: '복합 조직, 추심-법무 협업팀',
        defaultStatus: '추가 모듈 후보',
        submodules: ['법적 조치 이관', '공동 체크리스트', '협업 요청', '합의금/분납 일정'],
        highlights: ['조직 간 채팅형 소통과 AI 체크리스트 추출에 적합', '비용, 기일, 해야 할 일을 한 흐름으로 묶음']
      }
    ]
  }
];
