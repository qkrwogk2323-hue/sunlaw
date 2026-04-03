/**
 * 금융기관 검색 DB
 * 채권자 등록 시 금융기관명을 빠르게 입력하기 위한 참조 데이터
 */

export interface FinancialInstitution {
  name: string;
  classify: '법인';
  phone: string;
  category: 'bank' | 'card' | 'capital' | 'telecom' | 'public';
}

export const FINANCIAL_INSTITUTIONS: FinancialInstitution[] = [
  // 은행
  { name: '국민은행', classify: '법인', phone: '02-1588-9999', category: 'bank' },
  { name: '신한은행', classify: '법인', phone: '02-1577-8000', category: 'bank' },
  { name: '우리은행', classify: '법인', phone: '02-1588-5000', category: 'bank' },
  { name: '하나은행', classify: '법인', phone: '02-1599-1111', category: 'bank' },
  { name: '농협은행', classify: '법인', phone: '02-1661-3000', category: 'bank' },
  { name: '기업은행', classify: '법인', phone: '02-1566-2566', category: 'bank' },
  { name: 'SC제일은행', classify: '법인', phone: '02-1588-1599', category: 'bank' },
  { name: '씨티은행', classify: '법인', phone: '02-1588-7000', category: 'bank' },
  { name: '대구은행', classify: '법인', phone: '053-1588-5050', category: 'bank' },
  { name: '부산은행', classify: '법인', phone: '051-1588-6200', category: 'bank' },
  { name: '경남은행', classify: '법인', phone: '055-1600-8585', category: 'bank' },
  { name: '광주은행', classify: '법인', phone: '062-1588-3388', category: 'bank' },
  { name: '전북은행', classify: '법인', phone: '063-1588-4477', category: 'bank' },
  { name: '제주은행', classify: '법인', phone: '064-1588-0079', category: 'bank' },
  { name: '카카오뱅크', classify: '법인', phone: '1599-3333', category: 'bank' },
  { name: '케이뱅크', classify: '법인', phone: '1522-1000', category: 'bank' },
  { name: '토스뱅크', classify: '법인', phone: '1661-7654', category: 'bank' },
  { name: '수협은행', classify: '법인', phone: '02-1588-1515', category: 'bank' },

  // 카드
  { name: '삼성카드', classify: '법인', phone: '02-1588-8700', category: 'card' },
  { name: '현대카드', classify: '법인', phone: '02-1577-6000', category: 'card' },
  { name: '롯데카드', classify: '법인', phone: '02-1588-8100', category: 'card' },
  { name: '비씨카드', classify: '법인', phone: '02-1588-4000', category: 'card' },
  { name: '우리카드', classify: '법인', phone: '02-1588-9955', category: 'card' },
  { name: '신한카드', classify: '법인', phone: '02-1544-7000', category: 'card' },
  { name: '하나카드', classify: '법인', phone: '02-1800-1111', category: 'card' },
  { name: 'KB국민카드', classify: '법인', phone: '02-1588-1688', category: 'card' },
  { name: 'NH농협카드', classify: '법인', phone: '02-1644-4000', category: 'card' },

  // 캐피탈
  { name: '케이비캐피탈', classify: '법인', phone: '02-1899-7700', category: 'capital' },
  { name: '메리츠캐피탈', classify: '법인', phone: '02-1588-5050', category: 'capital' },
  { name: '현대캐피탈', classify: '법인', phone: '02-1588-6000', category: 'capital' },
  { name: '산은캐피탈', classify: '법인', phone: '02-1588-3700', category: 'capital' },

  // 통신사
  { name: '엘지유플러스', classify: '법인', phone: '02-1544-0010', category: 'telecom' },
  { name: 'SKT텔레콤', classify: '법인', phone: '02-1599-0011', category: 'telecom' },
  { name: 'KT', classify: '법인', phone: '02-100', category: 'telecom' },

  // 공공기관
  { name: '소상공인시장진흥공단', classify: '법인', phone: '042-363-7777', category: 'public' },
];

/**
 * 금융기관명으로 검색합니다 (부분 일치).
 */
export function searchFinancialInstitution(keyword: string): FinancialInstitution[] {
  if (!keyword.trim()) return [];
  return FINANCIAL_INSTITUTIONS.filter(fi => fi.name.includes(keyword.trim()));
}

/**
 * 카테고리별로 금융기관 목록을 그룹핑합니다.
 */
export function getGroupedInstitutions(): Record<string, FinancialInstitution[]> {
  const groups: Record<string, FinancialInstitution[]> = {
    bank: [],
    card: [],
    capital: [],
    telecom: [],
    public: [],
  };

  for (const fi of FINANCIAL_INSTITUTIONS) {
    groups[fi.category].push(fi);
  }

  return groups;
}

/** 카테고리 한글 라벨 */
export const CATEGORY_LABELS: Record<string, string> = {
  bank: '은행',
  card: '카드사',
  capital: '캐피탈',
  telecom: '통신사',
  public: '공공기관',
};
