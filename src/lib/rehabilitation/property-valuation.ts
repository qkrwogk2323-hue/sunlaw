/**
 * 재산 청산가치 산정
 *
 * 14개 카테고리별 재산 항목의 청산가치를 산출합니다.
 * - 예금/보험: 250만원 공제 적용
 * - 보험: 보장성보험만 공제 대상
 * - 퇴직금: 1/2만 청산가치 반영 (나머지 압류금지)
 * - 면제재산: 청산가치에 포함하지 않음
 */

import type { PropertyCategoryDef, PropertyCategoryId, RehabPropertyItem, RehabSecuredProperty } from './types';

/** 재산 카테고리 정의 (14개) */
export const PROPERTY_CATEGORIES: PropertyCategoryDef[] = [
  { id: 'cash', name: '현금', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'deposit', name: '예금', cols: ['재산 세부 사항', '예치금액', '압류 유무'], hasDeduction: true, deductionLabel: '공제금액', deductionDefault: 2_500_000, deductionNote: '(단, 공제금액란에는 250만원을 초과한 금액을 기재할 수 없습니다.)' },
  { id: 'insurance', name: '보험', cols: ['재산 세부 사항', '예상환급금액', '보장성보험', '압류 유무'], hasDeduction: true, deductionLabel: '공제금액', deductionDefault: 2_500_000, deductionNote: '(단, 공제금액란에는 250만원을 초과한 금액을 기재할 수 없습니다. 보장성보험만 공제 대상)' },
  { id: 'car', name: '자동차(오토바이 포함)', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'lease', name: '임차보증금', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'realestate', name: '부동산', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'equipment', name: '사업용설비, 재고, 비품 등', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'loan', name: '대여금 채권', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'sales', name: '매출금채권', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'retirement', name: '예상퇴직금', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'seizure', name: '(가)압류적립금', cols: ['재산 세부 사항', '청산가치 판단금액', '변제투입 유무'], hasDeduction: false },
  { id: 'consignment', name: '공탁금', cols: ['재산 세부 사항', '청산가치 판단금액', '변제투입 유무'], hasDeduction: false },
  { id: 'etc', name: '기타', cols: ['재산 세부 사항', '청산가치 판단금액', '압류 유무'], hasDeduction: false },
  { id: 'exempt_housing', name: '면제재산 결정신청 (주거용 임차보증금)', cols: ['재산 세부 사항'], hasDeduction: false },
  { id: 'exempt_living', name: '면제재산 결정신청 (6개월간 생계비)', cols: ['재산 세부 사항'], hasDeduction: false },
];

/** 카테고리 ID로 정의를 찾습니다. */
export function getCategoryDef(id: PropertyCategoryId): PropertyCategoryDef | undefined {
  return PROPERTY_CATEGORIES.find(c => c.id === id);
}

/**
 * 단일 카테고리의 청산가치 소계를 계산합니다.
 */
export function calculateCategorySubtotal(
  categoryId: PropertyCategoryId,
  items: RehabPropertyItem[],
  deduction: number,
): number {
  const activeItems = items.filter(i => i.category === categoryId);

  if (categoryId === 'insurance') {
    // 보험: 보장성보험만 공제 대상, 비보장성은 전액 청산가치
    let protectionSum = 0;
    let nonProtectionSum = 0;
    for (const item of activeItems) {
      if (item.isProtection) {
        protectionSum += item.amount || 0;
      } else {
        nonProtectionSum += item.amount || 0;
      }
    }
    const deducted = Math.max(0, protectionSum - (deduction || 0));
    return deducted + nonProtectionSum;
  }

  if (categoryId === 'retirement') {
    // 퇴직금: 1/2만 청산가치 반영 (나머지 1/2은 압류금지)
    const sum = activeItems.reduce((s, item) => s + (item.amount || 0), 0);
    return Math.round(sum / 2);
  }

  // 면제재산: 청산가치에 포함하지 않음
  if (categoryId === 'exempt_housing' || categoryId === 'exempt_living') {
    return 0;
  }

  // 일반 카테고리
  const sum = activeItems.reduce((s, item) => s + (item.amount || 0), 0);
  const catDef = getCategoryDef(categoryId);

  if (catDef?.hasDeduction) {
    return Math.max(0, sum - (deduction || 0));
  }

  return sum;
}

/**
 * 전체 재산의 청산가치를 계산합니다.
 *
 * @param items - 전체 재산 항목
 * @param deductions - 카테고리별 공제금액 { category: amount }
 * @returns 총 청산가치 및 카테고리별 소계
 */
export function calculateLiquidationValue(
  items: RehabPropertyItem[],
  deductions: Record<string, number>,
): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const cat of PROPERTY_CATEGORIES) {
    const subtotal = calculateCategorySubtotal(
      cat.id,
      items,
      deductions[cat.id] ?? cat.deductionDefault ?? 0,
    );
    byCategory[cat.id] = subtotal;
    total += subtotal;
  }

  return { total, byCategory };
}

/**
 * 별제권 담보물건 ↔ 재산목록 간 대응 항목이 없는 담보물건을 찾습니다.
 *
 * securedProperties의 propertyType을 재산목록 category와 대조하여
 * 재산목록에 대응하는 카테고리 항목이 없는 경우 경고 대상으로 반환합니다.
 */
const SECURED_TO_PROPERTY_CATEGORY: Record<string, string[]> = {
  부동산: ['realestate'],
  자동차: ['car'],
  임차보증금: ['lease'],
  예금: ['deposit'],
  보험: ['insurance'],
  설비: ['equipment'],
  채권: ['loan', 'sales'],
};

export interface SecuredPropertyWarning {
  securedPropertyId: string;
  propertyType: string;
  description: string;
  message: string;
}

export function validateSecuredVsProperties(
  securedProperties: RehabSecuredProperty[],
  propertyItems: RehabPropertyItem[],
): SecuredPropertyWarning[] {
  const warnings: SecuredPropertyWarning[] = [];
  const propertyCategorySet = new Set(propertyItems.map(p => p.category));

  for (const sp of securedProperties) {
    const type = sp.propertyType.trim();
    if (!type) continue;

    const matchCategories = SECURED_TO_PROPERTY_CATEGORY[type];
    if (matchCategories) {
      const hasMatch = matchCategories.some(cat => propertyCategorySet.has(cat));
      if (!hasMatch) {
        warnings.push({
          securedPropertyId: sp.id,
          propertyType: type,
          description: sp.description,
          message: `별제권 담보물건 '${type} ${sp.description}'이(가) 재산목록에 등록되지 않았습니다. 법원 제출 시 재산목록↔채권자목록 간 모순이 발생할 수 있습니다.`,
        });
      }
    } else {
      // 매핑에 없는 유형 — 재산목록 전체에서 유사 항목 존재 여부 체크
      if (propertyItems.length === 0) {
        warnings.push({
          securedPropertyId: sp.id,
          propertyType: type,
          description: sp.description,
          message: `별제권 담보물건 '${type} ${sp.description}'이(가) 재산목록에 등록되지 않았습니다. 법원 제출 시 재산목록↔채권자목록 간 모순이 발생할 수 있습니다.`,
        });
      }
    }
  }

  return warnings;
}
