/**
 * 별제권 배분 계산
 *
 * 담보물건별 배분가능액을 순위순으로 채권자에게 배분하여
 * ③별제권변제예상액, ④미회수액, ⑤담보부회생채권액을 산출합니다.
 */

import type {
  RehabCreditor,
  RehabSecuredProperty,
  SecuredAllocationResult,
} from './types';

/**
 * 담보물건의 배분가능액(청산가치)을 계산합니다.
 * 배분가능액 = 환가예상액(시가) × 환가비율(%)
 */
export function getLiquidationValue(property: RehabSecuredProperty): number {
  return Math.round(
    (property.marketValue || 0) * (property.valuationRate || 70) / 100,
  );
}

/**
 * 담보물건 종류에 따른 기본 환가비율을 반환합니다.
 */
export function getDefaultValuationRate(propertyType: string): number {
  switch (propertyType) {
    case '부동산': return 70;
    case '임차보증금': return 100;
    case '예금': return 100;
    case '보험': return 100;
    default: return 70;
  }
}

/**
 * 전체 별제권 배분을 계산합니다.
 *
 * 각 담보물건에 대해 배분가능액을 산출한 후,
 * 연결된 채권자를 순위순으로 정렬하여 순차 배분합니다.
 *
 * @param properties - 담보물건 목록
 * @param creditors - 채권자 목록 (담보부 채권자 포함)
 * @returns 채권자별 별제권 배분 결과
 */
export function calculateSecuredAllocations(
  properties: RehabSecuredProperty[],
  creditors: RehabCreditor[],
): SecuredAllocationResult[] {
  const results: SecuredAllocationResult[] = [];

  for (const prop of properties) {
    const liquidationValue = getLiquidationValue(prop);
    let remaining = liquidationValue;

    // 이 담보물건에 연결된 채권자를 순위순 정렬
    const liens = creditors
      .filter(c => c.securedPropertyId === prop.id && c.isSecured)
      .sort((a, b) => (a.lienPriority || 999) - (b.lienPriority || 999));

    for (const creditor of liens) {
      const maxClaim = creditor.maxClaimAmount || 0;
      const currentDebt = (creditor.capital || 0) + (creditor.interest || 0);

      // ③ 별제권변제예상액 = min(잔여 배분가능액, 채권최고액)
      const allocated = Math.min(remaining, maxClaim);
      remaining = Math.max(0, remaining - allocated);

      // ④ 별제권행사 등으로도 변제받을 수 없을 채권액
      const unrecoverable = maxClaim - allocated;

      // ⑤ 담보부 회생채권액
      const securedRehabAmount = allocated;

      // 무담보 전환액
      const unsecuredConversion = Math.max(0, currentDebt - allocated);

      results.push({
        creditorId: creditor.id,
        propertyId: prop.id,
        propertyType: prop.propertyType,
        propertyDesc: prop.description,
        marketValue: prop.marketValue,
        valuationRate: prop.valuationRate,
        liquidationValue,
        capitalCurrent: creditor.capital || 0,
        interestCurrent: creditor.interest || 0,
        securedRepayEstimate: allocated,
        unrecoverableAmount: unrecoverable,
        securedRehabAmount,
        unsecuredConversion,
        lienType: creditor.lienType || '',
        lienPriority: creditor.lienPriority || 0,
        maxClaimAmount: maxClaim,
      });
    }
  }

  return results;
}

/**
 * 별제권 배분 결과에서 합계를 계산합니다.
 */
export function getSecuredAllocationTotals(results: SecuredAllocationResult[]) {
  return {
    totalCapital: results.reduce((s, r) => s + r.capitalCurrent, 0),
    totalInterest: results.reduce((s, r) => s + r.interestCurrent, 0),
    totalSecuredRepay: results.reduce((s, r) => s + r.securedRepayEstimate, 0),
    totalUnrecoverable: results.reduce((s, r) => s + r.unrecoverableAmount, 0),
    totalSecuredRehab: results.reduce((s, r) => s + r.securedRehabAmount, 0),
    totalUnsecuredConversion: results.reduce((s, r) => s + r.unsecuredConversion, 0),
  };
}
