/**
 * 법원별 추가 제출서류 규칙.
 *
 * 개인회생 자료제출목록(D5106 별지)은 전국 공통 항목 + 법원별 추가 항목으로 구성.
 * 이 파일은 법원별 추가 제출서류를 관리.
 *
 * 출처: 법원 실무, 서울회생법원 가이드, 각 지방법원 안내문.
 * 변경 시 이 파일만 수정하면 자료제출목록 자동 반영.
 */

export type CourtDocRule = {
  courtKey: string;
  courtLabel: string;
  additionalDocs: Array<{
    category: string;
    items: string[];
  }>;
};

/**
 * 법원 키 정규화 — court_name 필드에서 법원 키를 추출.
 * "서울회생법원" → "서울"
 * "부산지방법원" → "부산"
 * "춘천지방법원 강릉지원" → "강릉"
 */
export function normalizeCourtKey(courtName: string): string {
  const name = (courtName ?? '').trim();
  if (name.includes('강릉')) return '강릉';
  if (name.includes('청주')) return '청주';
  if (name.includes('대전')) return '대전';
  if (name.includes('대구')) return '대구';
  if (name.includes('부산')) return '부산';
  if (name.includes('광주') && !name.includes('광주은행')) return '광주';
  if (name.includes('서울')) return '서울';
  if (name.includes('수원')) return '수원';
  if (name.includes('인천')) return '인천';
  if (name.includes('울산')) return '울산';
  if (name.includes('창원')) return '창원';
  if (name.includes('전주')) return '전주';
  if (name.includes('제주')) return '제주';
  return '공통';
}

/**
 * 법원별 추가 제출서류.
 * 공통 항목은 document-generator.ts의 generateDocumentChecklist에 하드코딩됨.
 * 여기는 공통에 **추가**되는 법원별 항목만.
 */
export const COURT_ADDITIONAL_DOCS: Record<string, CourtDocRule> = {
  서울: {
    courtKey: '서울',
    courtLabel: '서울회생법원',
    additionalDocs: [
      {
        category: '서울회생법원 추가 서류',
        items: [
          '신용카드 이용내역서(최근 1년분, 각 카드사별)',
          '건강보험자격득실확인서',
          '건강보험료 납부확인서(최근 1년분)',
          '국민연금가입증명서 또는 납부내역확인서',
        ],
      },
    ],
  },
  부산: {
    courtKey: '부산',
    courtLabel: '부산지방법원',
    additionalDocs: [
      {
        category: '부산지방법원 추가 서류',
        items: [
          '건강보험자격득실확인서',
          '건강보험료 납부확인서(최근 6개월분)',
          '국민연금 가입내역확인서',
        ],
      },
    ],
  },
  대전: {
    courtKey: '대전',
    courtLabel: '대전지방법원',
    additionalDocs: [
      {
        category: '대전지방법원 추가 서류',
        items: [
          '건강보험자격득실확인서',
          '국민연금 가입이력 내역서',
          '지방세 세목별 과세증명서(최근 3년분)',
        ],
      },
    ],
  },
  대구: {
    courtKey: '대구',
    courtLabel: '대구지방법원',
    additionalDocs: [
      {
        category: '대구지방법원 추가 서류',
        items: [
          '건강보험 자격득실확인서',
          '국민연금 가입증명서',
        ],
      },
    ],
  },
  청주: {
    courtKey: '청주',
    courtLabel: '청주지방법원',
    additionalDocs: [
      {
        category: '청주지방법원 추가 서류',
        items: [
          '건강보험자격득실확인서',
          '국민연금 가입내역확인서',
          '지방세 납세증명서',
          '출입국사실증명서(최근 2년분, 해당 시)',
        ],
      },
    ],
  },
  강릉: {
    courtKey: '강릉',
    courtLabel: '춘천지방법원 강릉지원',
    additionalDocs: [
      {
        category: '강릉지원 추가 서류',
        items: [
          '건강보험자격득실확인서',
          '국민연금 가입내역확인서',
          '지방세 납세증명서',
        ],
      },
    ],
  },
};

/**
 * 주어진 법원명에 해당하는 추가 제출서류 목록을 반환.
 * 매칭 안 되면 빈 배열.
 */
export function getCourtAdditionalDocs(courtName: string): CourtDocRule['additionalDocs'] {
  const key = normalizeCourtKey(courtName);
  return COURT_ADDITIONAL_DOCS[key]?.additionalDocs ?? [];
}
