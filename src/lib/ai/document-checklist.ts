/**
 * 사건 종류별 필요 서류 체크리스트 (rule-based)
 * 의뢰인이 준비해야 할 서류와 직원이 안내해야 할 항목을 자동 생성합니다.
 */

export type ChecklistItem = {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  category: 'identity' | 'case_specific' | 'financial' | 'court' | 'other';
  forClient: boolean;   // 의뢰인이 준비하는 서류
  forStaff: boolean;    // 직원이 준비/확인하는 항목
};

export type DocumentChecklist = {
  caseType: string;
  caseTypeLabel: string;
  items: ChecklistItem[];
  generatedAt: string;
  totalRequired: number;
  clientItems: ChecklistItem[];
  staffItems: ChecklistItem[];
};

const CASE_TYPE_LABELS: Record<string, string> = {
  civil: '민사',
  debt_collection: '채권 회수',
  execution: '강제집행',
  injunction: '가처분·가압류',
  criminal: '형사',
  advisory: '자문',
  other: '기타',
};

/** 공통 신원 서류 — 모든 사건 */
const COMMON_IDENTITY: ChecklistItem[] = [
  {
    id: 'id_card',
    label: '신분증 사본',
    description: '주민등록증 또는 운전면허증 (법인인 경우 사업자등록증)',
    required: true,
    category: 'identity',
    forClient: true,
    forStaff: false,
  },
  {
    id: 'seal_cert',
    label: '인감증명서',
    description: '발급일로부터 3개월 이내',
    required: true,
    category: 'identity',
    forClient: true,
    forStaff: false,
  },
  {
    id: 'power_of_attorney',
    label: '소송위임장 (인감도장 날인)',
    required: true,
    category: 'court',
    forClient: true,
    forStaff: true,
  },
];

/** 사건 종류별 추가 서류 맵 */
const CASE_SPECIFIC: Record<string, ChecklistItem[]> = {
  civil: [
    {
      id: 'civil_contract',
      label: '계약서 원본 및 사본',
      description: '분쟁 관련 계약 전문',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'civil_evidence',
      label: '관련 증거서류',
      description: '카카오톡·이메일 캡처, 영수증, 거래내역 등',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'civil_payment_proof',
      label: '금전 지급 증빙',
      description: '계좌 이체 내역, 영수증 등',
      required: false,
      category: 'financial',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'civil_filing_fee',
      label: '인지액·송달료 납부',
      description: '소가에 따른 인지액 계산 후 납부',
      required: true,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'civil_stmt',
      label: '소장 초안 검토',
      required: true,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
  ],

  debt_collection: [
    {
      id: 'dc_title',
      label: '집행권원 (판결문·공정증서 등)',
      description: '확정된 판결문, 지급명령, 공정증서 중 하나',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'dc_debtor_info',
      label: '채무자 인적사항',
      description: '주민등록번호, 주소, 직장 정보',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'dc_asset_info',
      label: '채무자 재산 정보 (가능한 경우)',
      description: '부동산 등기부, 차량 등록원부, 급여 정보',
      required: false,
      category: 'financial',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'dc_debt_amount',
      label: '채권 원금·이자 계산서',
      description: '원금, 지연이자 계산 내역 포함',
      required: true,
      category: 'financial',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'dc_asset_search',
      label: '재산 조회 신청 (법원 명령)',
      required: false,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
  ],

  execution: [
    {
      id: 'ex_writ',
      label: '집행문 부여받은 집행권원',
      description: '집행문이 붙은 확정판결문 또는 공정증서',
      required: true,
      category: 'court',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'ex_service_cert',
      label: '송달증명원',
      required: true,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'ex_execution_fee',
      label: '집행 비용 예납',
      required: true,
      category: 'financial',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'ex_property_list',
      label: '압류 대상 재산 목록',
      description: '부동산, 예금, 급여채권 등 구체적 특정',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: true,
    },
  ],

  injunction: [
    {
      id: 'inj_petition',
      label: '가처분·가압류 신청서 초안',
      required: true,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'inj_urgency_docs',
      label: '보전 필요성 소명 자료',
      description: '긴급성, 피보전권리 소명 자료 일체',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'inj_deposit',
      label: '담보 공탁 예정 금액 확인',
      description: '법원이 명하는 담보 금액 예납 준비',
      required: true,
      category: 'financial',
      forClient: true,
      forStaff: true,
    },
    {
      id: 'inj_defendant_info',
      label: '채무자(상대방) 인적사항',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
  ],

  criminal: [
    {
      id: 'cr_incident_summary',
      label: '사건 경위서 (의뢰인 작성)',
      description: '시간순으로 작성한 사건 전말',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'cr_evidence',
      label: '관련 증거자료 일체',
      description: '녹취파일, 메시지 캡처, CCTV, 목격자 연락처',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'cr_prior_record',
      label: '전과 조회 (해당 시)',
      required: false,
      category: 'other',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'cr_complaint',
      label: '고소장 또는 답변서 작성',
      required: true,
      category: 'court',
      forClient: false,
      forStaff: true,
    },
    {
      id: 'cr_damage_proof',
      label: '피해 금액 입증 자료',
      description: '진단서, 수리비 영수증, 손실 계산서 등',
      required: false,
      category: 'financial',
      forClient: true,
      forStaff: false,
    },
  ],

  advisory: [
    {
      id: 'adv_question',
      label: '자문 사항 정리서',
      description: '질문 항목과 배경 사실 정리',
      required: true,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
    {
      id: 'adv_contracts',
      label: '관련 계약서·약관 사본',
      required: false,
      category: 'case_specific',
      forClient: true,
      forStaff: false,
    },
  ],

  other: [],
};

export function buildDocumentChecklist(
  caseType: string,
  caseTitle?: string,
): DocumentChecklist {
  const specificItems = CASE_SPECIFIC[caseType] ?? [];
  const allItems = [...COMMON_IDENTITY, ...specificItems];

  const clientItems = allItems.filter((item) => item.forClient);
  const staffItems = allItems.filter((item) => item.forStaff);
  const totalRequired = allItems.filter((item) => item.required).length;

  return {
    caseType,
    caseTypeLabel: CASE_TYPE_LABELS[caseType] ?? '기타',
    items: allItems,
    generatedAt: new Date().toISOString(),
    totalRequired,
    clientItems,
    staffItems,
    ...(caseTitle ? { caseTitle } : {}),
  } as DocumentChecklist & { caseTitle?: string };
}

/** 완료율 계산 */
export function calcCompletionRate(
  checklist: DocumentChecklist,
  completedIds: Set<string>,
): { completed: number; total: number; pct: number } {
  const total = checklist.items.filter((item) => item.required).length;
  const completed = checklist.items.filter(
    (item) => item.required && completedIds.has(item.id),
  ).length;
  return { completed, total, pct: total === 0 ? 100 : Math.round((completed / total) * 100) };
}
